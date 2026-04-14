# 升级预估功能设计

## 概述

在 Tooltip 底部展示从当前等级到目标等级所需的时间，支持设置中选择显示到下 1~10 级。

## 核心概念

### 展示逻辑

假设当前等级是 **128 级**，用户设置显示到下 **3 级**（即到 131 级），则 Tooltip 中显示：

```
升级预估 (128级 → 129~131级):
  到129级: 1小时 (500次)
  到130级: 3小时 (1,200次)
  到131级: 8小时 (3,000次)
```

**关键点：每一行的时间都是从当前等级（128级）出发，到该行目标等级的累计时间。**

- 第1行（到129级）：从128级升到129级需要 1小时 / 500次
- 第2行（到130级）：从128级升到130级需要 3小时 / 1,200次（累计）
- 第3行（到131级）：从128级升到131级需要 8小时 / 3,000次（累计）

**不是**显示每升一级需要的时间，而是显示从起点到目标等级的总计时间。

## 数据来源

### 1. 初始化数据获取

优先使用 `getMwiObj()` 获取实时数据，如果失败则使用 `globals.initCharacterData_characterSkills`：

```javascript
function getCurrentSkill(skillHrid) {
    const mwiObj = getMwiObj();
    if (mwiObj?.game?.state?.characterSkillMap) {
        const skill = [...mwiObj.game.state.characterSkillMap.values()]
            .find(s => s.skillHrid === skillHrid);
        if (skill) return skill;
    }
    return globals.initCharacterData_characterSkills
        .find(s => s.skillHrid === skillHrid);
}
```

### 2. 实时数据更新

通过监听 `action_completed` WebSocket 消息更新技能数据：

```javascript
// 在 index.js 的 handleMessage 中添加
else if (obj.type === "action_completed") {
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

消息格式示例：
```json
{
  "type": "action_completed",
  "endCharacterSkills": [
    {
      "characterID": 999999,
      "skillHrid": "/skills/foraging",
      "experience": 149223984.10325384,
      "level": 128
    }
  ]
}
```

### 3. 经验表获取

从 `localStorage` 中的 `initClientData` 获取 `levelExperienceTable`：

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
```

## 核心计算逻辑

### 计算函数

```javascript
/**
 * 计算从当前等级到目标等级所需的时间和动作数
 * @param {Object} data - 包含 expPerHour, expPerAction, skillHrid
 * @param {number} targetLvl - 目标等级
 * @returns {Object|null} - { numOfActions: number, timeSec: number } 或 null
 */
function calculateNeedToLevel(data, targetLvl) {
    const expTable = getExpTable();
    const currentSkill = getCurrentSkill(data.skillHrid);

    if (!expTable || !currentSkill || !data.expPerHour || data.expPerHour <= 0) {
        return null;
    }

    const currentExp = currentSkill.experience;
    const currentLevel = currentSkill.level;

    // 如果目标等级 <= 当前等级，返回 null
    if (targetLvl <= currentLevel) {
        return null;
    }

    // 获取目标等级需要的总经验
    const targetTotalExp = expTable[targetLvl];
    if (!targetTotalExp || targetTotalExp <= currentExp) {
        return null;
    }

    // 剩余需要获取的经验
    const remainingExpTotal = targetTotalExp - currentExp;

    // 计算所需时间（秒）和动作数
    const totalTimeSec = remainingExpTotal / data.expPerHour * 3600;
    const totalActions = Math.ceil(remainingExpTotal / data.expPerAction);

    return {
        numOfActions: totalActions,
        timeSec: totalTimeSec
    };
}
```

### 时间格式化

```javascript
/**
 * 将秒数格式化为可读时间
 * @param {number} seconds - 秒数
 * @returns {string} - 格式化后的时间字符串
 */
function timeReadable(seconds) {
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

## 文件变更

| 文件 | 变更类型 | 内容 |
|------|----------|------|
| `src/utils.js` | 修改 | 添加 `timeReadable()` 和 `getCurrentSkill()` 函数 |
| `src/index.js` | 修改 | 添加 `action_completed` 消息监听 |
| `src/profitCalculation.js` | 修改 | 添加 `skillHrid` 到返回数据 |
| `src/tooltipManager.js` | 修改 | 添加升级预估展示 |
| `src/settingsManager.js` | 修改 | 添加目标等级选择（1-10级，默认3） |

## Tooltip 展示设计

### 展示位置

在 Tooltip 底部（每小时利润行之后），添加升级预估区域：

```html
<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #804600;">
    <div style="font-weight: bold; margin-bottom: 4px;">
        升级预估 (${currentLevel}级 → ${currentLevel + displayCount}级):
    </div>
    <div style="font-size: 10px; color: #666;">
        <div>到${targetLevel1}级: ${time1} (${formatNumber(actions1)}次)</div>
        <div>到${targetLevel2}级: ${time2} (${formatNumber(actions2)}次)</div>
        <div>到${targetLevel3}级: ${time3} (${formatNumber(actions3)}次)</div>
    </div>
</div>
```

### 显示示例

假设当前 128 级，displayCount = 3：

```
升级预估 (128级 → 129~131级):
  到129级: 1h (500次)
  到130级: 3h (1,200次)
  到131级: 8h (3,000次)
```

### 样式

- 与 Tooltip 主体风格一致
- 使用较小字号（10px）以节省空间
- 使用灰色文字与主内容区分
- 顶部有分隔线

## 设置项

### 添加字段

在 `validateProfitSettings` 中添加：

```javascript
levelUpDisplayCount: 3  // 默认显示到下3级，可选 1-10
```

### 设置面板 UI

在设置面板中添加选择框：

```html
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

## 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                      WebSocket 消息                              │
│  ┌─────────────────┐    ┌──────────────────────────────────┐   │
│  │ init_character_ │    │        action_completed          │   │
│  │     _data       │    │  { endCharacterSkills: [...] }   │   │
│  └────────┬────────┘    └───────────────┬──────────────────┘   │
└──────────┼─────────────────────────────┼──────────────────────┘
           │                             │
           ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    globals.initCharacterData_characterSkills     │
│                    (实时更新最新技能经验数据)                      │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       getCurrentSkill(skillHrid)                  │
│                    获取当前技能的经验和等级                         │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              calculateNeedToLevel(data, targetLvl)              │
│         计算到目标等级需要的动作数和时间（秒）                      │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       timeReadable(seconds)                       │
│                    格式化为 "1d 3h" 或 "30m" 格式                  │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    tooltipManager (Tooltip 展示)                   │
│              循环显示到下 N 级的累计时间和动作数                     │
└─────────────────────────────────────────────────────────────────┘
```

## 错误处理

1. **缺少经验表**：返回 null，不显示预估
2. **目标等级 <= 当前等级**：返回 null，不显示
3. **expPerHour 为 0 或负数**：返回 null，不显示
4. **无法获取当前技能数据**：返回 null，不显示
5. **目标等级超出经验表范围**：返回 null，不显示

## 兼容性

- 不影响现有 Tooltip 展示
- 向后兼容（如果无法获取数据，静默不显示预估）
- 与现有设置系统集成
