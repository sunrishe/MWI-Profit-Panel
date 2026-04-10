# 设置入口重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将设置入口从 Panel UI 齿轮按钮改为油猴菜单，设置界面从 Bootstrap Modal 改为原生 HTML/CSS/JS 实现。

**架构:** 新建 settingsManager.js 替代 settingsPanel.js，使用内联样式原生 Modal，添加 GM_registerMenuCommand 注册油猴菜单，保持设置验证逻辑不变。

**Tech Stack:** JavaScript, Tampermonkey APIs (GM_registerMenuCommand, GM_setValue, GM_getValue)

---

## 文件结构

| 文件 | 变更 | 职责 |
|------|------|------|
| `src/settingsManager.js` | 新建 | 原生 Modal + 油猴菜单实现 |
| `src/settingsPanel.js` | 删除 | 旧 Bootstrap 实现（将被移除）|
| `src/index.js` | 修改 | 导入 settingsManager，调用 initSettingsMenu() |
| `src/panelManager.js` | 修改 | 移除齿轮按钮和相关代码 |
| `rollup.config.js` | 修改 | 添加 `// @grant GM_registerMenuCommand` |

---

### Task 1: 更新 rollup.config.js 添加 GM_registerMenuCommand 权限

**Files:**
- Modify: `rollup.config.js`

- [ ] **Step 1: 在 dev banner 中添加 GM_registerMenuCommand grant**

```javascript
// 在 dev banner 的 @grant 部分添加：
// @grant        GM_registerMenuCommand
```

编辑 `rollup.config.js` 第 25-30 行，在 `@grant GM_getValue` 下方添加：

```javascript
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand  // <-- 添加这一行
```

- [ ] **Step 2: 在 prod banner 中添加 GM_registerMenuCommand grant**

编辑 `rollup.config.js` 第 55-60 行，同样位置添加：

```javascript
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand  // <-- 添加这一行
```

- [ ] **Step 3: 验证修改并提交**

```bash
git diff rollup.config.js
```

Expected: 显示两行 `// @grant GM_registerMenuCommand` 被添加

```bash
git add rollup.config.js
git commit -m "chore: add GM_registerMenuCommand grant for settings menu"
```

---

### Task 2: 创建 settingsManager.js

**Files:**
- Create: `src/settingsManager.js`

- [ ] **Step 1: 创建文件基础结构**

创建 `src/settingsManager.js`：

```javascript
import globals from './globals.js';
import { refreshProfitPanel } from './panelManager.js';

// 验证设置（从原 settingsPanel.js 保留）
export function validateProfitSettings(settings) {
    const validCategories = ['milking', 'foraging', 'woodcutting', 'cheesesmithing', 'crafting', 'tailoring', 'cooking', 'brewing'];
    const validDataSources = ['Official', 'MooketApi', 'Mooket'];

    // 验证 price modes
    if (!['ask', 'bid'].includes(settings.materialPriceMode)) {
        settings.materialPriceMode = 'ask';
    }
    if (!['ask', 'bid'].includes(settings.productPriceMode)) {
        settings.productPriceMode = 'bid';
    }

    // 验证 dataSourceKeys
    if (!Array.isArray(settings.dataSourceKeys)) {
        settings.dataSourceKeys = validDataSources;
    } else {
        settings.dataSourceKeys = settings.dataSourceKeys.filter(src => validDataSources.includes(src));
        if (settings.dataSourceKeys.length === 0) {
            settings.dataSourceKeys = validDataSources;
        }
    }

    // 验证 actionCategories
    if (!Array.isArray(settings.actionCategories)) {
        settings.actionCategories = validCategories;
    } else {
        settings.actionCategories = settings.actionCategories.filter(cat => validCategories.includes(cat));
        if (settings.actionCategories.length === 0) {
            settings.actionCategories = validCategories;
        }
    }

    return settings;
}

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
    const settings = globals.profitSettings;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.id = 'mwi-profit-settings-overlay';
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

    // 创建对话框
    const dialog = document.createElement('div');
    dialog.id = 'mwi-profit-settings-dialog';
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

    dialog.innerHTML = `
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #333;">收益设置</h3>
        
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 14px; color: #333; font-weight: 500;">原料进货方式</label>
            <select id="mwi-material-price-mode" style="
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                background: white;
                cursor: pointer;
            ">
                <option value="ask" ${settings.materialPriceMode === 'ask' ? 'selected' : ''}>高买</option>
                <option value="bid" ${settings.materialPriceMode === 'bid' ? 'selected' : ''}>低买</option>
            </select>
        </div>
        
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-size: 14px; color: #333; font-weight: 500;">产品出货方式</label>
            <select id="mwi-product-price-mode" style="
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                background: white;
                cursor: pointer;
            ">
                <option value="ask" ${settings.productPriceMode === 'ask' ? 'selected' : ''}>高卖</option>
                <option value="bid" ${settings.productPriceMode === 'bid' ? 'selected' : ''}>低卖</option>
            </select>
        </div>
        
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 10px; font-size: 14px; color: #333; font-weight: 500;">显示的动作分类</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${renderCheckbox('mwi-cat-milking', 'milking', '挤奶', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-foraging', 'foraging', '采摘', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-woodcutting', 'woodcutting', '伐木', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-cheesesmithing', 'cheesesmithing', '奶锻制造', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-crafting', 'crafting', '制作', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-tailoring', 'tailoring', '缝纫', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-cooking', 'cooking', '烹饪', settings.actionCategories)}
                ${renderCheckbox('mwi-cat-brewing', 'brewing', '冲泡', settings.actionCategories)}
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-size: 14px; color: #333; font-weight: 500;">数据来源 (暂时不生效)</label>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${renderCheckbox('mwi-src-official', 'Official', '官方市场', settings.dataSourceKeys)}
                ${renderCheckbox('mwi-src-mooketapi', 'MooketApi', 'Mooket API', settings.dataSourceKeys)}
                ${renderCheckbox('mwi-src-mooket', 'Mooket', 'Mooket实时', settings.dataSourceKeys)}
            </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="mwi-settings-cancel" style="
                padding: 8px 20px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                color: #333;
            ">取消</button>
            <button id="mwi-settings-save" style="
                padding: 8px 20px;
                border: none;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            ">保存</button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    // 触发动画
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        dialog.style.opacity = '1';
    });

    // 绑定事件
    setupModalEventListeners(overlay, dialog);
}

// 渲染复选框辅助函数
function renderCheckbox(id, value, label, checkedArray) {
    const checked = checkedArray.includes(value) ? 'checked' : '';
    return `
        <label style="display: flex; align-items: center; font-size: 14px; cursor: pointer; color: #333;">
            <input type="checkbox" id="${id}" value="${value}" ${checked} style="margin-right: 8px; cursor: pointer;">
            ${label}
        </label>
    `;
}

// 设置 Modal 事件监听
function setupModalEventListeners(overlay, dialog) {
    // 点击遮罩层关闭
    overlay.addEventListener('click', () => closeModal(overlay, dialog));

    // ESC 键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(overlay, dialog);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // 取消按钮
    document.getElementById('mwi-settings-cancel').addEventListener('click', () => {
        closeModal(overlay, dialog);
        document.removeEventListener('keydown', escHandler);
    });

    // 保存按钮
    document.getElementById('mwi-settings-save').addEventListener('click', () => {
        // 收集设置值
        const materialPriceMode = document.getElementById('mwi-material-price-mode').value;
        const productPriceMode = document.getElementById('mwi-product-price-mode').value;

        const actionCategories = [];
        const catCheckboxes = [
            { id: 'mwi-cat-milking', value: 'milking' },
            { id: 'mwi-cat-foraging', value: 'foraging' },
            { id: 'mwi-cat-woodcutting', value: 'woodcutting' },
            { id: 'mwi-cat-cheesesmithing', value: 'cheesesmithing' },
            { id: 'mwi-cat-crafting', value: 'crafting' },
            { id: 'mwi-cat-tailoring', value: 'tailoring' },
            { id: 'mwi-cat-cooking', value: 'cooking' },
            { id: 'mwi-cat-brewing', value: 'brewing' },
        ];
        catCheckboxes.forEach(({ id, value }) => {
            if (document.getElementById(id).checked) {
                actionCategories.push(value);
            }
        });

        const dataSourceKeys = [];
        const srcCheckboxes = [
            { id: 'mwi-src-official', value: 'Official' },
            { id: 'mwi-src-mooketapi', value: 'MooketApi' },
            { id: 'mwi-src-mooket', value: 'Mooket' },
        ];
        srcCheckboxes.forEach(({ id, value }) => {
            if (document.getElementById(id).checked) {
                dataSourceKeys.push(value);
            }
        });

        const newSettings = {
            materialPriceMode,
            productPriceMode,
            actionCategories,
            dataSourceKeys
        };

        globals.profitSettings = validateProfitSettings(newSettings);

        closeModal(overlay, dialog);
        document.removeEventListener('keydown', escHandler);
    });
}

// 关闭 Modal
function closeModal(overlay, dialog) {
    overlay.style.opacity = '0';
    dialog.style.opacity = '0';

    // 动画结束后移除 DOM
    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
        if (dialog.parentNode) dialog.remove();
    }, 200);
}
```

- [ ] **Step 2: 提交新文件**

```bash
git add src/settingsManager.js
git commit -m "feat: create settingsManager.js with native modal and tampermonkey menu"
```

---

### Task 3: 更新 index.js 使用新的 settingsManager

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: 更新导入语句**

找到第 6 行：
```javascript
import { validateProfitSettings } from './settingsPanel';
```

改为：
```javascript
import { initSettingsMenu, validateProfitSettings } from './settingsManager.js';
```

- [ ] **Step 2: 更新初始化调用**

在文件末尾找到（约第 137 行）：
```javascript
GM_addStyle(GM_getResourceText("bootstrapCSS"));
```

在这行之前添加：
```javascript
initSettingsMenu();
```

- [ ] **Step 3: 提交修改**

```bash
git diff src/index.js
```

Expected: 显示导入变更和 initSettingsMenu() 调用添加

```bash
git add src/index.js
git commit -m "refactor: use settingsManager instead of settingsPanel"
```

---

### Task 4: 移除 panelManager.js 中的齿轮按钮

**Files:**
- Modify: `src/panelManager.js`

- [ ] **Step 1: 移除 settingsPanel 导入**

找到第 4 行：
```javascript
import { initSettingsPanel } from './settingsPanel.js';
```

删除这一行。

- [ ] **Step 2: 移除齿轮按钮 HTML**

找到第 85-95 行的 `newPanel.innerHTML` 中的齿轮按钮部分：

```html
<h1 class="HousePanel_title__2fQ1U" style="position: relative; width: fit-content; margin: 4px auto 8px; font-size: 18px; font-weight: 600;">
    <div>生产收益详情</div>
    <div class="HousePanel_guideTooltipContainer__1lAt1" style="position: absolute; left: 100%; top: 0; margin-top: 1px; margin-left: 12px;">
        <div class="GuideTooltip_guideTooltip__1tVq-" id="profitSettingsBtn" style="cursor: pointer">
            <svg role="img" aria-label="Guide" class="Icon_icon__2LtL_" width="100%" height="100%">
                <use href="/static/media/misc_sprite.8d60624b.svg#settings"></use>
            </svg>
        </div>
    </div>
</h1>
```

改为：
```html
<h1 class="HousePanel_title__2fQ1U" style="width: fit-content; margin: 4px auto 8px; font-size: 18px; font-weight: 600;">
    <div>生产收益详情</div>
</h1>
```

- [ ] **Step 3: 移除 initSettingsPanel 调用**

找到第 113-118 行：
```javascript
if (!initialized) {
    createTooltip();
    setupClickActions();
    initSettingsPanel();  // <-- 删除这行
    setInterval(() => refreshProfitPanel(), 1000);
    initialized = true;
}
```

删除 `initSettingsPanel();` 这一行。

- [ ] **Step 4: 提交修改**

```bash
git diff src/panelManager.js
```

Expected: 显示 settingsPanel 导入移除、齿轮按钮移除、initSettingsPanel 调用移除

```bash
git add src/panelManager.js
git commit -m "refactor: remove settings gear button from panel"
```

---

### Task 5: 删除旧的 settingsPanel.js

**Files:**
- Delete: `src/settingsPanel.js`

- [ ] **Step 1: 删除文件**

```bash
git rm src/settingsPanel.js
git commit -m "chore: remove old settingsPanel.js"
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

- [ ] **Step 2: 检查生成的 userscript**

```bash
head -50 dist/MWI-Profit-Panel.user.js
```

Expected: 显示包含 `// @grant GM_registerMenuCommand` 的 userscript 头部

- [ ] **Step 3: 提交（如果构建产物需要跟踪）**

```bash
git add dist/
git commit -m "build: update dist with settings refactor"
```

---

## 测试清单

在浏览器中测试以下功能：

- [ ] 油猴菜单显示 "⚙️ 设置"
- [ ] 点击菜单打开设置 Modal
- [ ] Modal 淡入动画正常（200ms 淡入）
- [ ] 点击遮罩层关闭 Modal
- [ ] ESC 键关闭 Modal
- [ ] 点击取消按钮关闭 Modal
- [ ] 修改设置后点击保存，设置生效
- [ ] 保存后收益面板刷新
- [ ] Modal 淡出动画正常（150ms 淡出）
- [ ] 收益面板不再显示齿轮按钮
- [ ] 原有设置数据正确加载

---

## Spec Coverage Check

| 设计需求 | 实现任务 |
|----------|----------|
| 油猴菜单入口 | Task 2: initSettingsMenu() 函数 |
| 原生 Modal | Task 2: showSettingsModal() 函数 |
| 淡入淡出动画 | Task 2: CSS transition opacity |
| 点击遮罩关闭 | Task 2: setupModalEventListeners |
| ESC 关闭 | Task 2: escHandler |
| 设置验证保留 | Task 2: validateProfitSettings |
| 移除齿轮按钮 | Task 4 |
| 移除旧文件 | Task 5 |
| 添加 GM 权限 | Task 1 |

---

## Rollback Plan

如需回滚：
```bash
git reset --hard HEAD~6  # 回滚到重构前
git checkout src/settingsPanel.js  # 恢复旧文件
```
