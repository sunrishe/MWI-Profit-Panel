# 新增 Buff 来源支持设计文档

日期: 2026-04-10

## 背景

游戏新增两个 Buff 来源：
1. **成就系统** - 达成成就后获得固定增益（如采集数量+2%）
2. **迷宫卷轴系统** - 购买卷轴后获得 30 分钟临时增益

通过对比 `init_character_data.json` 和 `init_character_data.new.json` 发现新增字段：
- `achievementActionTypeBuffsMap` - 成就 Buff
- `personalActionTypeBuffsMap` - 迷宫卷轴 Buff

## 目标

在收益计算和 Tooltip 展示中加入成就和卷轴 Buff。

## 设计方案

### 1. Buff 架构变更

**新增 Buff 缓存类型 (`src/buffs.js`)：**
```javascript
this.buffCache = {
    community: new Map(),
    tea: new Map(),
    equipment: new Map(),
    house: new Map(),
    achievement: new Map(),   // ← 新增
    personal: new Map(),      // ← 新增（卷轴）
};
```

**新增订阅字段：**
```javascript
globals.subscribe((key, value) => {
    ...
    else if (key === 'initCharacterData_achievementActionTypeBuffsMap') 
        this.updateBuffCache('achievement', value);
    else if (key === 'initCharacterData_personalActionTypeBuffsMap') 
        this.updateBuffCache('personal', value);
});
```

**新增 Getter 方法：**
```javascript
getAchievementBuff(actionTypeHrid) {
    return this.buffCache.achievement.get(actionTypeHrid) || new Buff();
}
getPersonalBuff(actionTypeHrid) {
    return this.buffCache.personal.get(actionTypeHrid) || new Buff();
}
```

### 2. 收益计算更新 (`src/profitCalculation.js`)

**获取新 Buff：**
```javascript
const achievementBuff = buffs.getAchievementBuff(action.type);
const personalBuff = buffs.getPersonalBuff(action.type);
```

**更新总效率计算：**
```javascript
const totalEffBuff = levelEffBuff + 
    houseBuff.efficiency + 
    teaBuffs.efficiency + 
    equipmentBuff.efficiency + 
    communityBuff.efficiency +
    achievementBuff.efficiency +    // ← 新增
    personalBuff.efficiency;        // ← 新增
```

**更新产量计算：**
```javascript
const quantityBuf = (100 + 
    teaBuffs.gathering + 
    communityBuff.gathering +
    achievementBuff.gathering +     // ← 新增
    personalBuff.gathering          // ← 新增
) / 100;
```

**更新稀有掉落计算：**
```javascript
const quantityBuf = (100 + 
    houseBuff.rare_find + 
    equipmentBuff.rare_find +
    achievementBuff.rare_find +     // ← 新增
    personalBuff.rare_find          // ← 新增
) / 100;
```

**返回数据新增字段：**
```javascript
return {
    ...
    achievementBuff,    // ← 新增
    personalBuff,       // ← 新增
    ...
};
```

### 3. Tooltip 展示更新 (`src/tooltipManager.js`)

**新增两行 Buff 展示：**
```html
<tr>
    <td style="text-align: right;"><b>成就</b></td>
    <td style="text-align: right;">${formatPercent(data.achievementBuff.action_speed)}</td>
    <td style="text-align: right;">${formatPercent(data.achievementBuff.efficiency)}</td>
    <td style="text-align: right;">${formatPercent(data.achievementBuff.gathering)}</td>
    <td style="text-align: right;">${formatPercent(data.achievementBuff.essence_find)}</td>
    <td style="text-align: right;">${formatPercent(data.achievementBuff.rare_find)}</td>
    <td style="text-align: right;">${formatPercent(data.achievementBuff.wisdom)}</td>
</tr>
<tr>
    <td style="text-align: right;"><b>卷轴</b></td>
    <td style="text-align: right;">${formatPercent(data.personalBuff.action_speed)}</td>
    <td style="text-align: right;">${formatPercent(data.personalBuff.efficiency)}</td>
    <td style="text-align: right;">${formatPercent(data.personalBuff.gathering)}</td>
    <td style="text-align: right;">${formatPercent(data.personalBuff.essence_find)}</td>
    <td style="text-align: right;">${formatPercent(data.personalBuff.rare_find)}</td>
    <td style="text-align: right;">${formatPercent(data.personalBuff.wisdom)}</td>
</tr>
```

### 4. 文件变更

| 文件 | 变更 | 说明 |
|------|------|------|
| `src/buffs.js` | 修改 | 添加 achievement 和 personal buff 缓存 |
| `src/profitCalculation.js` | 修改 | 计算中加入新 buff |
| `src/tooltipManager.js` | 修改 | Tooltip 展示新 buff |
| `src/globals.js` | 修改 | 添加新全局状态字段 |
| `src/index.js` | 修改 | 处理新 WebSocket 消息类型 |

### 5. 新增全局状态字段 (`src/globals.js`)

```javascript
_state = {
    ...
    initCharacterData_achievementActionTypeBuffsMap: {},
    initCharacterData_personalActionTypeBuffsMap: {},
    ...
}
```

### 6. WebSocket 消息处理 (`src/index.js`)

需要监听新的消息类型（如果游戏有推送更新）：
```javascript
else if (obj.type === "achievement_buffs_updated") {
    globals.initCharacterData_achievementActionTypeBuffsMap = obj.achievementActionTypeBuffsMap;
    refreshProfitPanel(true);
}
else if (obj.type === "personal_buffs_updated") {
    globals.initCharacterData_personalActionTypeBuffsMap = obj.personalActionTypeBuffsMap;
    refreshProfitPanel(true);
}
```

## 设计确认

- [x] 成就 Buff - 显示名称 "成就"
- [x] 迷宫卷轴 Buff - 显示名称 "卷轴"
- [x] 不添加 MooPass 支持
- [x] Buff 计算逻辑与现有系统一致
- [x] Tooltip 展示格式与其他 Buff 一致
