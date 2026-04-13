# Moo Pass Buff 与经验值计算功能设计

## 概述

将参考版本（MWI Profit Panel II）的功能合并到当前项目，包括 Moo Pass Buff 支持和经验值计算系统。

## 目标

1. 添加 Moo Pass Buff 支持（缓存、计算、展示）
2. 实现经验值计算系统（总Wisdom Buff、单次经验、每小时经验）
3. 从 `init_character_data` 获取 Moo Pass 数据
4. 处理 `moo_pass_buffs_updated` WebSocket 消息

## 架构

### 数据流

```
init_character_data.mooPassActionTypeBuffsMap
    ↓
globals.initCharacterData_mooPassActionTypeBuffsMap
    ↓
buffs.buffCache.mooPass
    ↓
buffs.getMooPassBuff(actionTypeHrid)
    ↓
profitCalculation: totalWisdomBuff → expPerAction → expPerHour
    ↓
tooltipManager: 展示 Moo Pass 行 + 经验值行
```

## 文件变更

| 文件 | 变更类型 | 内容 |
|------|----------|------|
| `src/globals.js` | 新增字段 | `initCharacterData_mooPassActionTypeBuffsMap` |
| `src/buffs.js` | 新增 | mooPass缓存、getter方法、订阅处理、初始化 |
| `src/profitCalculation.js` | 新增 | 获取mooPassBuff、总Wisdom计算、expPerAction/expPerHour |
| `src/tooltipManager.js` | 新增 | Moo Pass buff行、经验值展示行 |
| `src/index.js` | 新增 | init_character_data中读取mooPass、moo_pass_buffs_updated消息处理 |

## 详细实现

### 1. globals.js

在 `_state` 对象中添加：

```javascript
_state = {
    // ... 现有字段
    initCharacterData_mooPassActionTypeBuffsMap: {},  // 新增
}
```

### 2. buffs.js

**buffCache 添加 mooPass：**
```javascript
this.buffCache = {
    community: new Map(),
    tea: new Map(),
    equipment: new Map(),
    house: new Map(),
    achievement: new Map(),
    personal: new Map(),
    mooPass: new Map(),  // 新增
};
```

**订阅回调添加：**
```javascript
else if (key === 'initCharacterData_mooPassActionTypeBuffsMap') this.updateBuffCache('mooPass', value);
```

**初始化缓存：**
```javascript
this.updateBuffCache('mooPass', globals.initCharacterData_mooPassActionTypeBuffsMap);
```

**新增 getter 方法：**
```javascript
getMooPassBuff(actionTypeHrid) {
    return this.buffCache.mooPass.get(actionTypeHrid) || new Buff();
}
```

### 3. profitCalculation.js

**获取 Moo Pass Buff：**
```javascript
const mooPassBuff = buffs.getMooPassBuff(action.type);
```

**总 Wisdom Buff 计算：**
```javascript
const totalWisdomBuff = (teaBuffs.wisdom || 0) + 
    (communityBuff.wisdom || 0) + 
    (equipmentBuff.wisdom || 0) + 
    (houseBuff.wisdom || 0) + 
    (achievementBuff.wisdom || 0) + 
    (personalBuff.wisdom || 0) + 
    (mooPassBuff.wisdom || 0);
```

**经验值计算：**
```javascript
const baseExpGain = action.experienceGain || 0;
const expPerAction = Math.round((1 + totalWisdomBuff / 100) * baseExpGain * 10) / 10;
const expPerHour = expPerAction * actionPerHour;
```

**返回数据新增：**
```javascript
return {
    // ... 现有字段
    mooPassBuff,        // 新增
    expPerAction,       // 新增
    expPerHour,         // 新增
};
```

### 4. tooltipManager.js

**在房子 Buff 行后添加 Moo Pass 行：**
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

**在 Tooltip 末尾添加经验值展示：**
```html
<div><strong>单次经验值:</strong> ${formatNumber(data.expPerAction)}</div>
<div><strong>每小时经验值:</strong> ${formatNumber(data.expPerHour)}</div>
```

### 5. index.js

**init_character_data 处理添加：**
```javascript
if (obj.type === "init_character_data") {
    // ... 现有字段
    globals.initCharacterData_mooPassActionTypeBuffsMap = obj.mooPassActionTypeBuffsMap;  // 新增
}
```

**新增消息处理：**
```javascript
else if (obj.type === "moo_pass_buffs_updated") {
    globals.initCharacterData_mooPassActionTypeBuffsMap = obj.mooPassActionTypeBuffsMap;
    refreshProfitPanel(true);
}
```

## 测试清单

- [ ] init_character_data 正确读取 mooPassActionTypeBuffsMap
- [ ] moo_pass_buffs_updated 消息正确处理
- [ ] Moo Pass Buff 正确显示在 Tooltip 中
- [ ] 经验值计算正确（单次经验、每小时经验）
- [ ] 总 Wisdom Buff 包含所有来源（茶、社区、装备、房子、成就、卷轴、Moo Pass）

## 兼容性

- 不影响现有成就和卷轴 Buff 功能
- 向后兼容（如果游戏 API 不提供 mooPass 数据，则默认为空）
