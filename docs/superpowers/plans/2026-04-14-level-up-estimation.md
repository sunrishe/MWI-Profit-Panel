# 升级预估功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Tooltip 底部展示从当前等级到目标等级所需的时间，支持设置中选择显示到下 1~10 级

**Architecture:** 添加 `timeReadable()` 和 `getCurrentSkill()` 工具函数，处理 `action_completed` 消息更新技能数据，计算并展示升级预估

**Tech Stack:** JavaScript, Tampermonkey Userscript

---

## 文件结构

| 文件 | 变更 | 职责 |
|------|------|------|
| `src/utils.js` | 修改 | 添加 `timeReadable()` 和 `getCurrentSkill()` 函数 |
| `src/index.js` | 修改 | 添加 `action_completed` 消息监听 |
| `src/profitCalculation.js` | 修改 | 添加 `skillHrid` 到返回数据 |
| `src/tooltipManager.js` | 修改 | 添加升级预估展示 |
| `src/settingsManager.js` | 修改 | 添加目标等级选择（1-10级，默认3） |

---

### Task 1: 更新 utils.js 添加工具函数

**Files:**
- Modify: `src/utils.js`

- [ ] **Step 1: 添加 timeReadable() 函数**

在 `src/utils.js` 末尾（在 `TimeSpan` 对象后）添加：

```javascript
/**
 * 将秒数格式化为可读时间
 * @param {number} seconds - 秒数
 * @returns {string} - 格式化后的时间字符串，如 "1d 3h" 或 "30m"
 */
export function timeReadable(seconds) {
    if (isNaN(seconds) || seconds === Infinity || seconds <= 0) {
        return "-";
    }

    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hrs}h`;
    } else if (hrs > 0) {
        return `${hrs}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
}
```

- [ ] **Step 2: 添加 getCurrentSkill() 函数**

在同一位置添加：

```javascript
/**
 * 获取当前技能的实时数据
 * 优先使用 getMwiObj() 获取实时数据，如果失败则使用 globals
 * @param {string} skillHrid - 技能 HRID，如 "/skills/foraging"
 * @returns {Object|null} - 技能对象或 null
 */
export function getCurrentSkill(skillHrid) {
    // 优先从游戏对象获取实时数据
    const mwiObj = getMwiObj();
    if (mwiObj?.game?.state?.characterSkillMap) {
        const skill = [...mwiObj.game.state.characterSkillMap.values()]
            .find(s => s.skillHrid === skillHrid);
        if (skill) return skill;
    }
    // 回退到 globals 数据
    return globals.initCharacterData_characterSkills
        .find(s => s.skillHrid === skillHrid);
}
```

- [ ] **Step 3: 提交修改**

```bash
git add src/utils.js
git commit -m "feat: add timeReadable and getCurrentSkill utility functions"
```

---

### Task 2: 更新 profitCalculation.js 添加 skillHrid

**Files:**
- Modify: `src/profitCalculation.js`

- [ ] **Step 1: 在 return 语句中添加 skillHrid**

找到 `src/profitCalculation.js` 的 return 语句（约第 161 行），在 `actionHrid` 后添加 `skillHrid`：

```javascript
return {
    actionNames: getActionName(action.hrid),
    actionHrid,
    skillHrid: action.levelRequirement.skillHrid,  // ← 新增
    inputItems,
    // ... 其余字段
};
```

- [ ] **Step 2: 提交修改**

```bash
git add src/profitCalculation.js
git commit -m "feat: add skillHrid to profit calculation return data"
```

---

### Task 3: 更新 index.js 添加 action_completed 消息处理

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: 在 handleMessage 中添加 action_completed 处理**

找到 `moo_pass_buffs_updated` 处理之后（约第 99 行），添加：

```javascript
else if (obj.type === "moo_pass_buffs_updated") {
    globals.initCharacterData_mooPassActionTypeBuffsMap = obj.mooPassActionTypeBuffsMap;
    refreshProfitPanel(true);
}
else if (obj.type === "action_completed") {   // ← 新增
    // 更新技能经验数据
    if (obj.endCharacterSkills) {
        for (const updatedSkill of obj.endCharacterSkills) {
            const index = globals.initCharacterData_characterSkills
                .findIndex(s => s.skillHrid === updatedSkill.skillHrid);
            if (index !== -1) {
                globals.initCharacterData_characterSkills[index] = updatedSkill;
            }
        }
    }
}
```

- [ ] **Step 2: 提交修改**

```bash
git add src/index.js
git commit -m "feat: handle action_completed to update skill experience"
```

---

### Task 4: 更新 settingsManager.js 添加设置项

**Files:**
- Modify: `src/settingsManager.js`

- [ ] **Step 1: 添加 levelUpDisplayCount 到 profitSettings 默认值**

找到 `validateProfitSettings` 函数中的默认值对象，添加 `levelUpDisplayCount`：

```javascript
const profitSettings = validateProfitSettings(JSON.parse(GM_getValue('profitSettings', JSON.stringify({
    materialPriceMode: 'ask',
    productPriceMode: 'bid',
    dataSourceKeys: ['Official', 'MooketApi', 'Mooket'],
    actionCategories: ['milking', 'foraging', 'woodcutting', 'cheesesmithing', 'crafting', 'tailoring', 'cooking', 'brewing'],
    levelUpDisplayCount: 3   // ← 新增：默认显示到下3级
}))));
```

- [ ] **Step 2: 在设置 Modal 中添加选择框**

找到设置 Modal 中的 actionCategories 选择框附近，添加 levelUpDisplayCount 选择框：

```javascript
// 在 actionCategories 复选框之后添加
<div class="setting-row">
    <label>升级预估显示级数:</label>
    <select id="levelUpDisplayCount">
        <option value="1">1级</option>
        <option value="2">2级</option>
        <option value="3" selected>3级</option>
        <option value="4">4级</option>
        <option value="5">5级</option>
        <option value="6">6级</option>
        <option value="7">7级</option>
        <option value="8">8级</option>
        <option value="9">9级</option>
        <option value="10">10级</option>
    </select>
</div>
```

- [ ] **Step 3: 添加设置保存逻辑**

找到设置保存的函数中，确保 `levelUpDisplayCount` 被保存：

```javascript
// 在保存设置的代码中，确保包含 levelUpDisplayCount
const settings = {
    ...currentSettings,
    levelUpDisplayCount: parseInt(document.getElementById('levelUpDisplayCount').value, 10)
};
```

- [ ] **Step 4: 提交修改**

```bash
git add src/settingsManager.js
git commit -m "feat: add levelUpDisplayCount setting"
```

---

### Task 5: 更新 tooltipManager.js 添加升级预估展示

**Files:**
- Modify: `src/tooltipManager.js`

- [ ] **Step 1: 导入新函数**

在文件顶部添加导入：

```javascript
import { formatNumber, timeReadable, getCurrentSkill } from './utils.js';
```

- [ ] **Step 2: 添加经验表获取函数**

在 `formatTooltipContent` 函数之前添加：

```javascript
function getExpTable() {
    const initCD = localStorage.getItem("initClientData");
    if (!initCD) return null;
    try {
        const decomCD = JSON.parse(LZString.decompressFromUTF16(initCD));
        return decomCD.levelExperienceTable;
    } catch (e) {
        return null;
    }
}

/**
 * 计算到目标等级需要的时间和动作数
 * @param {Object} data - 包含 expPerHour, expPerAction, skillHrid
 * @param {number} targetLvl - 目标等级
 * @returns {Object|null} - { numOfActions, timeSec } 或 null
 */
function calculateNeedToLevel(data, targetLvl) {
    const expTable = getExpTable();
    const currentSkill = getCurrentSkill(data.skillHrid);

    if (!expTable || !currentSkill || !data.expPerHour || data.expPerHour <= 0) {
        return null;
    }

    const currentExp = currentSkill.experience;
    const currentLevel = currentSkill.level;

    if (targetLvl <= currentLevel) {
        return null;
    }

    const targetTotalExp = expTable[targetLvl];
    if (!targetTotalExp || targetTotalExp <= currentExp) {
        return null;
    }

    const remainingExpTotal = targetTotalExp - currentExp;
    const totalTimeSec = remainingExpTotal / data.expPerHour * 3600;
    const totalActions = Math.ceil(remainingExpTotal / data.expPerAction);

    return {
        numOfActions: totalActions,
        timeSec: totalTimeSec
    };
}
```

- [ ] **Step 3: 在 formatTooltipContent 末尾添加升级预估展示**

找到每小时利润行之后的位置，添加：

```javascript
// 获取显示级数设置
const displayCount = globals.profitSettings?.levelUpDisplayCount || 3;
const currentSkill = getCurrentSkill(data.skillHrid);
const currentLevel = currentSkill?.level || 0;

// 生成升级预估 HTML
let levelUpHtml = '';
if (currentLevel > 0 && displayCount > 0) {
    levelUpHtml = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #804600;">
        <div style="font-weight: bold; margin-bottom: 4px;">升级预估 (${currentLevel}级 → ${currentLevel + displayCount}级):</div>
        <div style="font-size: 10px; color: #666;">`;

    for (let i = 1; i <= displayCount; i++) {
        const targetLevel = currentLevel + i;
        const result = calculateNeedToLevel(data, targetLevel);
        if (result) {
            levelUpHtml += `<div>到${targetLevel}级: ${timeReadable(result.timeSec)} (${formatNumber(result.numOfActions)}次)</div>`;
        } else {
            levelUpHtml += `<div>到${targetLevel}级: -</div>`;
        }
    }

    levelUpHtml += `</div></div>`;
}
```

- [ ] **Step 4: 将 levelUpHtml 添加到返回内容**

找到每小时利润行，将其修改为：

```javascript
<div><strong>每小时利润:</strong> ${formatNumber(data.profitPerHour)}</div>
${levelUpHtml}
```

- [ ] **Step 5: 提交修改**

```bash
git add src/tooltipManager.js
git commit -m "feat: add level up estimation display in tooltip"
```

---

### Task 6: 构建并测试

**Files:**
- Build: `npm run build`

- [ ] **Step 1: 构建项目**

```bash
npm run build
```

Expected: 构建成功，无错误

- [ ] **Step 2: 验证生成的代码**

```bash
grep -n "timeReadable\|getCurrentSkill\|calculateNeedToLevel\|levelUpDisplayCount" dist/MWI-Profit-Panel.user.js | head -20
```

Expected: 显示包含新函数的代码

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: build with level up estimation feature"
```

---

## Spec Coverage Check

| 设计需求 | 实现任务 |
|----------|----------|
| timeReadable() 时间格式化 | Task 1 |
| getCurrentSkill() 获取当前技能 | Task 1 |
| action_completed 消息处理 | Task 3 |
| skillHrid 添加到计算结果 | Task 2 |
| levelUpDisplayCount 设置项 | Task 4 |
| Tooltip 升级预估展示 | Task 5 |
| 构建验证 | Task 6 |

## Rollback Plan

如需回滚：
```bash
git reset --hard HEAD~6
```
