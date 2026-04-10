# 设置入口重构设计文档

日期: 2026-04-10

## 背景

当前设置入口位于收益面板的齿轮按钮，使用 Bootstrap 5 Modal 实现。需要：
1. 将入口改为油猴菜单
2. 移除对 Bootstrap 的依赖，改为原生 HTML/CSS/JS 实现

## 目标

- 设置入口：从 Panel UI 齿轮按钮 → 油猴菜单 "⚙️ 设置"
- 设置界面：Bootstrap Modal → 原生内联样式 Modal
- 功能保持完全一致

## 设计方案

### 1. 架构变更

```
Before:
src/settingsPanel.js (Bootstrap Modal + Panel 按钮监听)
  ├── initSettingsPanel() - 初始化按钮点击监听
  ├── modalHTML - Bootstrap 结构
  └── validateProfitSettings() - 设置验证

After:
src/settingsManager.js (原生 Modal + 油猴菜单)
  ├── initSettingsMenu() - 注册油猴菜单命令
  ├── showSettingsModal() - 显示原生 Modal
  ├── closeSettingsModal() - 关闭 Modal
  ├── validateProfitSettings() - 设置验证（保留）
  └── setupModalEventListeners() - 事件监听
```

### 2. Modal 实现细节

#### 2.1 结构

```javascript
// Overlay（遮罩层）
const overlay = document.createElement('div');
overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 100000;
    opacity: 0;
    transition: opacity 0.2s ease;
`;

// Dialog（对话框）
const dialog = document.createElement('div');
dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    z-index: 100001;
    min-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    opacity: 0;
    transition: opacity 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;
```

#### 2.2 动画

- 打开：overlay 和 dialog 从 opacity 0 → 1，200ms ease
- 关闭：overlay 和 dialog 从 opacity 1 → 0，150ms ease
- 使用 CSS transition，动画结束后移除 DOM

#### 2.3 关闭方式

1. 点击遮罩层关闭
2. ESC 键关闭
3. 点击取消按钮关闭
4. 点击保存按钮关闭（保存成功后）

### 3. 设置界面布局

保持与现有 Bootstrap 版本相同的布局结构：

```
┌─────────────────────────────┐
│  收益设置                    │
├─────────────────────────────┤
│  原料进货方式               │
│  [下拉选择: 高买/低买]       │
├─────────────────────────────┤
│  产品出货方式               │
│  [下拉选择: 高卖/低卖]       │
├─────────────────────────────┤
│  显示的动作分类             │
│  [x] 挤奶  [x] 采摘        │
│  [x] 伐木  [x] 奶锻制造    │
│  [x] 制作  [x] 缝纫        │
│  [x] 烹饪  [x] 冲泡        │
├─────────────────────────────┤
│  数据来源 (暂时不生效)      │
│  [x] 官方市场               │
│  [x] Mooket API            │
│  [x] Mooket实时            │
├─────────────────────────────┤
│           [取消] [保存]     │
└─────────────────────────────┘
```

### 4. 表单控件样式

使用原生 HTML 控件 + 内联样式：

```javascript
// Select 下拉框
<select style="
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
">

// Checkbox 复选框
<label style="
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
    cursor: pointer;
">
    <input type="checkbox" style="margin-right: 8px;">
    挤奶
</label>

// Button 按钮
<button style="
    padding: 8px 20px;
    border: none;
    background: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
">
```

### 5. 文件变更

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/settingsPanel.js` | 删除 | 替换为 settingsManager.js |
| `src/settingsManager.js` | 新增 | 原生 Modal + 油猴菜单实现 |
| `src/index.js` | 修改 | 导入 settingsManager，调用 initSettingsMenu() |
| `src/panelManager.js` | 修改 | 移除齿轮按钮和相关代码 |
| `rollup.config.js` | 修改 | 添加 `// @grant GM_registerMenuCommand` |

### 6. 代码结构

#### settingsManager.js

```javascript
import globals from './globals.js';
import { refreshProfitPanel } from './panelManager.js';

// 验证设置（从原 settingsPanel.js 保留）
export function validateProfitSettings(settings) { ... }

// 初始化油猴菜单
export function initSettingsMenu() {
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("⚙️ 设置", showSettingsModal);
    }
    
    // 订阅设置变更
    globals.subscribe((key, value) => {
        if (key === "profitSettings") {
            refreshProfitPanel(true);
            GM_setValue("profitSettings", JSON.stringify(value));
        }
    });
}

// 显示设置 Modal
function showSettingsModal() {
    // 创建 overlay 和 dialog
    // 渲染表单内容
    // 绑定事件（保存、取消、ESC、点击遮罩）
    // 触发动画显示
}

// 关闭 Modal
function closeSettingsModal(overlay, dialog) {
    // 触发动画隐藏
    // 动画结束后移除 DOM
}
```

### 7. 依赖变更

**rollup.config.js 需要添加：**
```javascript
// @grant GM_registerMenuCommand
```

**可以移除的 Bootstrap 依赖（可选）：**
- 如果项目中其他地方不再使用 Bootstrap，可以从 `rollup.config.js` 中移除：
  - `@require bootstrap@5.3.7`
  - `@resource bootstrapCSS`
  - `GM_addStyle(GM_getResourceText("bootstrapCSS"))` 调用

**注意：** 先确认 tooltipManager.js 和其他组件是否依赖 Bootstrap，如果依赖则保留。

### 8. 测试清单

- [ ] 油猴菜单显示 "⚙️ 设置"
- [ ] 点击菜单打开设置 Modal
- [ ] Modal 淡入动画正常
- [ ] 点击遮罩层关闭 Modal
- [ ] ESC 键关闭 Modal
- [ ] 修改设置后点击保存，设置生效
- [ ] 保存后收益面板刷新
- [ ] Modal 淡出动画正常
- [ ] 移除 panelManager.js 中的齿轮按钮

## 设计确认

- [x] 方案 A：原生内联样式 Modal
- [x] 需要动画效果（淡入淡出）
- [x] 需要点击遮罩层关闭
- [x] 需要 ESC 关闭
- [x] 油猴菜单文案："⚙️ 设置"
