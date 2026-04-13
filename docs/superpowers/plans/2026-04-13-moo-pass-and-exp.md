# Moo Pass Buff 与经验值计算功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加 Moo Pass Buff 支持和经验值计算系统到 MWI Profit Panel

**Architecture:** 在全局状态中添加 mooPass 数据字段，在 buffs 系统中添加 mooPass 缓存和 getter，在收益计算中加入 Moo Pass 到总 Wisdom Buff 计算，在 Tooltip 中展示 Moo Pass 行和经验值信息

**Tech Stack:** JavaScript, Tampermonkey Userscript

---

## 文件结构

| 文件 | 变更 | 职责 |
|------|------|------|
| `src/globals.js` | 修改 | 添加 `initCharacterData_mooPassActionTypeBuffsMap` 状态字段 |
| `src/buffs.js` | 修改 | 添加 mooPass 缓存、订阅、getter 方法 |
| `src/profitCalculation.js` | 修改 | 计算总 Wisdom Buff 和 expPerHour/expPerAction |
| `src/tooltipManager.js` | 修改 | 添加 Moo Pass buff 行和经验值展示 |
| `src/index.js` | 修改 | 处理 init_character_data 中的 mooPass 和 moo_pass_buffs_updated 消息 |

---

### Task 1: 更新 globals.js 添加 Moo Pass 状态字段

**Files:**
- Modify: `src/globals.js`

- [ ] **Step 1: 添加 mooPass 字段到 _state**

编辑 `src/globals.js`，在 `_state` 对象中添加 `initCharacterData_mooPassActionTypeBuffsMap` 字段：

```javascript
_state = {
    initClientData_itemDetailMap: {},
    initClientData_actionDetailMap: {},
    initClientData_openableLootDropMap: {},
    initCharacterData_characterSkills: [],
    initCharacterData_actionTypeDrinkSlotsMap: {},
    initCharacterData_characterHouseRoomMap: {},
    initCharacterData_characterItems: [],
    initCharacterData_communityActionTypeBuffsMap: {},
    initCharacterData_consumableActionTypeBuffsMap: {},
    initCharacterData_houseActionTypeBuffsMap: {},
    initCharacterData_equipmentActionTypeBuffsMap: {},
    initCharacterData_achievementActionTypeBuffsMap: {},
    initCharacterData_personalActionTypeBuffsMap: {},
    initCharacterData_mooPassActionTypeBuffsMap: {},   // ← 新增
    hasMarketItemUpdate: false,
    isZHInGameSetting: false,
    freshnessMarketJson: {},
    medianMarketJson: {},
    processingMap: {},
    en2ZhMap: {},
    lootLog: [],
    profitSettings: {}
}
```

- [ ] **Step 2: 提交修改**

```bash
git add src/globals.js
git commit -m "feat: add mooPass buff state field"
```

---

### Task 2: 更新 buffs.js 添加 Moo Pass 支持

**Files:**
- Modify: `src/buffs.js`

- [ ] **Step 1: 添加 mooPass 到 buffCache**

编辑 `src/buffs.js`，在 `buffCache` 中添加 mooPass：

```javascript
this.buffCache = {
    community: new Map(),
    tea: new Map(),
    equipment: new Map(),
    house: new Map(),
    achievement: new Map(),
    personal: new Map(),
    mooPass: new Map(),   // ← 新增（取消注释）
};
```

- [ ] **Step 2: 添加 mooPass 订阅处理**

在 `globals.subscribe` 回调中添加 mooPass 处理：

```javascript
globals.subscribe((key, value) => {
    if (key === 'initCharacterData_communityActionTypeBuffsMap') this.updateBuffCache('community', value);
    else if (key === 'initCharacterData_consumableActionTypeBuffsMap') this.updateBuffCache('tea', value);
    else if (key === 'initCharacterData_equipmentActionTypeBuffsMap') this.updateBuffCache('equipment', value);
    else if (key === 'initCharacterData_houseActionTypeBuffsMap') this.updateBuffCache('house', value);
    else if (key === 'initCharacterData_achievementActionTypeBuffsMap') this.updateBuffCache('achievement', value);
    else if (key === 'initCharacterData_personalActionTypeBuffsMap') this.updateBuffCache('personal', value);
    else if (key === 'initCharacterData_mooPassActionTypeBuffsMap') this.updateBuffCache('mooPass', value);  // ← 新增
});
```

- [ ] **Step 3: 添加 mooPass 初始化缓存更新**

在构造函数末尾添加：

```javascript
this.updateBuffCache('community', globals.initCharacterData_communityActionTypeBuffsMap);
this.updateBuffCache('tea', globals.initCharacterData_consumableActionTypeBuffsMap);
this.updateBuffCache('equipment', globals.initCharacterData_equipmentActionTypeBuffsMap);
this.updateBuffCache('house', globals.initCharacterData_houseActionTypeBuffsMap);
this.updateBuffCache('achievement', globals.initCharacterData_achievementActionTypeBuffsMap);
this.updateBuffCache('personal', globals.initCharacterData_personalActionTypeBuffsMap);
this.updateBuffCache('mooPass', globals.initCharacterData_mooPassActionTypeBuffsMap);  // ← 新增（取消注释）
```

- [ ] **Step 4: 添加 getMooPassBuff getter 方法**

在 `BuffsProvider` 类中，在 `getPersonalBuff` 方法后添加：

```javascript
getMooPassBuff(actionTypeHrid) {
    return this.buffCache.mooPass.get(actionTypeHrid) || new Buff();
}
```

- [ ] **Step 5: 提交修改**

```bash
git add src/buffs.js
git commit -m "feat: add mooPass buff cache and getter"
```

---

### Task 3: 更新 profitCalculation.js 添加经验值计算

**Files:**
- Modify: `src/profitCalculation.js`

- [ ] **Step 1: 获取 mooPassBuff**

在函数开头（约第 31 行，personalBuff 下方）添加：

```javascript
const communityBuff = buffs.getCommunityBuff(action.type);
const achievementBuff = buffs.getAchievementBuff(action.type);
const personalBuff = buffs.getPersonalBuff(action.type);
const mooPassBuff = buffs.getMooPassBuff(action.type);   // ← 新增
```

- [ ] **Step 2: 计算总 Wisdom Buff**

在 `actionPerHour` 计算之后（约第 82 行），添加总 Wisdom Buff 计算：

```javascript
const actionPerHour = 3600 / actualTimePerActionSec * (1 + totalEffBuff / 100);

// 总 Wisdom Buff 计算（用于经验值）
const totalWisdomBuff = (teaBuffs.wisdom || 0) + 
    (communityBuff.wisdom || 0) + 
    (equipmentBuff.wisdom || 0) + 
    (houseBuff.wisdom || 0) + 
    (achievementBuff.wisdom || 0) + 
    (personalBuff.wisdom || 0) + 
    (mooPassBuff.wisdom || 0);   // ← 新增

// 经验值计算
const baseExpGain = action.experienceGain || 0;   // ← 新增
const expPerAction = Math.round((1 + totalWisdomBuff / 100) * baseExpGain * 10) / 10;   // ← 新增
const expPerHour = expPerAction * actionPerHour;   // ← 新增
```

- [ ] **Step 3: 返回数据新增字段**

在 return 语句中添加新字段：

```javascript
return {
    actionNames: getActionName(action.hrid),
    actionHrid,
    inputItems,
    outputItems,
    actionPerHour,
    expendPerHour,
    outputPerHour,
    profitPerHour,

    baseTimePerActionSec,
    levelEffBuff,
    teaBuffs,
    communityBuff,
    houseBuff,
    equipmentBuff,
    achievementBuff,
    personalBuff,
    mooPassBuff,        // ← 新增

    expPerAction,       // ← 新增
    expPerHour,         // ← 新增

    profitPerDay,
    ProfitMargin: 100 * (profitPerHour) / expendPerHour
};
```

- [ ] **Step 4: 提交修改**

```bash
git add src/profitCalculation.js
git commit -m "feat: add mooPass buff and exp calculation"
```

---

### Task 4: 更新 tooltipManager.js 展示 Moo Pass 和经验值

**Files:**
- Modify: `src/tooltipManager.js`

- [ ] **Step 1: 在卷轴 Buff 行后添加 Moo Pass 行**

找到第 268 行（卷轴行结束），在 `</tr>` 后添加：

```html
<tr style="border-bottom: 1px solid #804600;">
    <td style="text-align: right;"><b>MooPass</b></td>
    <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.action_speed)} </b></td>
    <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.efficiency)} </b></td>
    <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.gathering)} </b></td>
    <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.essence_find)} </b></td>
    <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.rare_find)} </b></td>
    <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.wisdom)} </b></td>
</tr>
```

- [ ] **Step 2: 在 Tooltip 末尾添加经验值展示**

找到第 274 行（"每小时利润"行），在其后添加：

```html
<div><strong>单次经验值:</strong> ${formatNumber(data.expPerAction)}</div>
<div><strong>每小时经验值:</strong> ${formatNumber(data.expPerHour)}</div>
```

最终 `formatTooltipContent` 函数的返回内容应该像这样结尾：

```javascript
<div>每小时动作: ${data.actionPerHour.toFixed(2)}次</div>
<div>茶减少消耗: ${data.teaBuffs.artisan.toFixed(2)}%</div>
<div><strong>单次经验值:</strong> ${formatNumber(data.expPerAction)}</div>
<div><strong>每小时经验值:</strong> ${formatNumber(data.expPerHour)}</div>
<div><strong>每小时利润(税后):</strong> ${formatNumber(data.profitPerHour)}</div>
```

- [ ] **Step 3: 提交修改**

```bash
git add src/tooltipManager.js
git commit -m "feat: display mooPass buff and exp values in tooltip"
```

---

### Task 5: 更新 index.js 处理 Moo Pass WebSocket 消息

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: 在 init_character_data 中添加 mooPass 处理**

找到 `obj.type === "init_character_data"` 的处理块（约第 35-45 行），在现有字段后添加：

```javascript
if (obj.type === "init_character_data") {
    globals.initCharacterData_characterSkills = obj.characterSkills;
    globals.initCharacterData_actionTypeDrinkSlotsMap = obj.actionTypeDrinkSlotsMap;
    globals.initCharacterData_characterHouseRoomMap = obj.characterHouseRoomMap;
    globals.initCharacterData_characterItems = obj.characterItems;
    globals.initCharacterData_communityActionTypeBuffsMap = obj.communityActionTypeBuffsMap;
    globals.initCharacterData_consumableActionTypeBuffsMap = obj.consumableActionTypeBuffsMap;
    globals.initCharacterData_houseActionTypeBuffsMap = obj.houseActionTypeBuffsMap;
    globals.initCharacterData_equipmentActionTypeBuffsMap = obj.equipmentActionTypeBuffsMap;
    globals.initCharacterData_achievementActionTypeBuffsMap = obj.achievementActionTypeBuffsMap;
    globals.initCharacterData_personalActionTypeBuffsMap = obj.personalActionTypeBuffsMap;
    globals.initCharacterData_mooPassActionTypeBuffsMap = obj.mooPassActionTypeBuffsMap;   // ← 新增
    waitForPannels();
}
```

- [ ] **Step 2: 添加 moo_pass_buffs_updated 消息处理**

在 `personal_buffs_updated` 处理之后（约第 92 行），添加：

```javascript
else if (obj.type === "personal_buffs_updated") {
    globals.initCharacterData_personalActionTypeBuffsMap = obj.personalActionTypeBuffsMap;
    refreshProfitPanel(true);
}
else if (obj.type === "moo_pass_buffs_updated") {   // ← 新增
    globals.initCharacterData_mooPassActionTypeBuffsMap = obj.mooPassActionTypeBuffsMap;   // ← 新增
    refreshProfitPanel(true);   // ← 新增
}
```

- [ ] **Step 3: 提交修改**

```bash
git add src/index.js
git commit -m "feat: handle mooPass buff from init_character_data and moo_pass_buffs_updated"
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
grep -n "mooPass\|expPerHour\|expPerAction\|totalWisdomBuff" dist/MWI-Profit-Panel.user.js | head -30
```

Expected: 显示包含新字段和方法的代码

- [ ] **Step 3: 提交（如有需要）**

```bash
git add dist/
git commit -m "chore: build with mooPass and exp calculation"
```

---

## 测试清单

在浏览器中测试以下功能：

- [ ] Moo Pass Buff 行显示在 Tooltip 的 buff 表格中
- [ ] 单次经验值显示正确
- [ ] 每小时经验值显示正确
- [ ] 总 Wisdom Buff 计算包含 Moo Pass
- [ ] init_character_data 正确加载 Moo Pass 数据
- [ ] moo_pass_buffs_updated 消息正确刷新面板

---

## Spec Coverage Check

| 设计需求 | 实现任务 |
|----------|----------|
| 全局状态字段 | Task 1 |
| Buff 缓存和 Getter | Task 2 |
| 收益计算加入 Moo Pass 和经验值 | Task 3 |
| Tooltip 展示 Moo Pass 和经验值 | Task 4 |
| WebSocket 消息处理 | Task 5 |
| 构建验证 | Task 6 |

---

## Rollback Plan

如需回滚：
```bash
git reset --hard HEAD~6
```
