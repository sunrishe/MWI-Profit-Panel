import globals from './globals.js';
import { formatNumber, timeReadable, getCurrentSkill, t } from './utils.js';

export function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'profit-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.className = 'MuiPopper-root MuiTooltip-popper css-55b9xc';
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '9999';
    tooltip.style.display = 'none';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.margin = '0px';
    tooltip.style.inset = "0px auto auto 0px";

    const tooltipInner = document.createElement('div');
    tooltipInner.className = 'MuiTooltip-tooltip MuiTooltip-tooltipPlacementTop css-1spb1s5';
    tooltipInner.style.minWidth = "340px";

    const tooltipContent = document.createElement('div');
    tooltipContent.className = 'ItemTooltipText_itemTooltipText__zFq3A';

    tooltipInner.appendChild(tooltipContent);
    tooltip.appendChild(tooltipInner);
    document.body.appendChild(tooltip);

    setupTooltipEvents(tooltip, tooltipContent);

    return {
        container: tooltip,
        content: tooltipContent
    };
}

function generateDiffInfo(item, type) {
    const medianType = type == "ask" ? "medianAsk" : "medianBid";
    if (!item[type] || !item[medianType]) {
        console.log(item);
        return "";
    }
    const diff = item[type] - item[medianType];
    if (diff == 0) return "(-)";
    const sign = diff > 0 ? "↑" : "↓";
    const num = formatNumber(Math.abs(diff));
    return ` (${sign}${num})`;
}

function setupTooltipEvents(tooltip, tooltipContent) {
    let tooltipTimer = null;

    document.addEventListener('mouseover', (e) => {
        const itemContainer = e.target.closest('.Item_item__2De2O.Profit-pannel');
        if (!itemContainer) {
            tooltip.style.display = 'none';
            return;
        }

        const tooltipData = itemContainer.dataset.tooltip;
        if (!tooltipData) return;

        try {
            const data = JSON.parse(tooltipData);
            tooltipContent.innerHTML = formatTooltipContent(data);
            tooltip.style.display = 'block';

            // 计算并设置位置
            const rect = itemContainer.getBoundingClientRect();
            const xPos = Math.max(0, rect.left - tooltip.offsetWidth);
            const yPos = Math.max(0, rect.bottom - tooltip.offsetHeight);
            tooltip.style.transform = `translate(${xPos}px, ${yPos}px)`;
            tooltip.setAttribute('data-popper-placement', 'left');

            if (tooltipTimer) clearTimeout(tooltipTimer);
        } catch (e) {
            console.error('Failed to parse tooltip data:', e);
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (!e.relatedTarget || !e.relatedTarget.closest('.Item_item__2De2O.Profit-pannel')) {
            tooltipTimer = setTimeout(() => {
                tooltip.style.display = 'none';
            }, 0);
        }
    });
}

function formatPercent(percent) {
    const result = percent ? `+${formatNumber(percent)}%` : "-";
    return result;
}

// 获取经验表
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
 * @param {Object} data - 包含 expPerHour, expPerAction
 * @param {number} targetLvl - 目标等级
 * @param {Object} expTable - 经验表
 * @param {Object} currentSkill - 当前技能数据
 * @returns {Object|null} - { numOfActions, timeSec } 或 null
 */
function calculateNeedToLevel(data, targetLvl, expTable, currentSkill) {
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

function formatTooltipContent(data) {
    let totalInputAsk = 0, totalInputBid = 0;
    let totalInputMedianAsk = 0, totalInputMedianBid = 0;
    const inputTableHtmls = [];
    for (const input of data.inputItems) {
        totalInputAsk += input.ask * input.count;
        totalInputBid += input.bid * input.count;
        totalInputMedianAsk += (input.medianAsk ?? 0) * input.count;
        totalInputMedianBid += (input.medianBid ?? 0) * input.count;
        const tableHtml =
            `
                    <tr>
                        <td style="text-align: left;">${input.name}</td>
                        <td style="text-align: right;">${formatNumber(input.count)}</td>
                        <td style="text-align: right;">${formatNumber(input.ask)}</td>
                        <td style="text-align: left;">${generateDiffInfo(input, "ask")}</td>
                        <td style="text-align: right;">${formatNumber(input.bid)}</td>
                        <td style="text-align: left;">${generateDiffInfo(input, "bid")}</td>
                        <td style="text-align: right;">${formatNumber(input.countPerHour)}</td>
                    </tr>
                `;
        inputTableHtmls.push(tableHtml);
    }

    let totalOuputAsk = 0, totalOuputBid = 0;
    let totalOutputMedianAsk = 0, totalOutputMedianBid = 0;
    const onputTableHtmls = [];
    for (const output of data.outputItems) {
        totalOuputAsk += output.ask * output.count;
        totalOuputBid += output.bid * output.count;
        totalOutputMedianAsk += (output.medianAsk ?? 0) * output.count;
        totalOutputMedianBid += (output.medianBid ?? 0) * output.count;
        const tableHtml =
            `
                    <tr>
                        <td style="text-align: left;">${output.name}</td>
                        <td style="text-align: right;">${formatNumber(output.count)}</td>
                        <td style="text-align: right;">${formatNumber(output.ask)}</td>
                        <td style="text-align: left;">${generateDiffInfo(output, "ask")}</td>
                        <td style="text-align: right;">${formatNumber(output.bid)}</td>
                        <td style="text-align: left;">${generateDiffInfo(output, "bid")}</td>
                        <td style="text-align: right;">${formatNumber(output.countPerHour)}</td>
                    </tr>
                `;
        onputTableHtmls.push(tableHtml);
    }


    // 格式化tooltip内容
    const content =
        `
        <div class="ItemTooltipText_name__2JAHA"><span>${data.actionNames}</span></div>

            <div style="color: #804600; font-size: 10px;">
                <table style="width:100%; border-collapse: collapse;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #804600;">
                            <th style="text-align: left;">${t('原料', 'Material')}</th>
                            <th style="text-align: center;">${t('数量', 'Qty')}</th>
                            <th style="text-align: right;">${t('出售价', 'Ask')}</th>
                            <th style="text-align: left;"></th>
                            <th style="text-align: right;">${t('收购价', 'Bid')}</th>
                            <th style="text-align: left;"></th>
                            <th style="text-align: right;">${t('数量/小时', 'Qty/h')}</th>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: left;"><b>${t('合计', 'Total')}</b></td>
                            <td style="text-align: right;"><b>/</b></td>
                            <td style="text-align: right;"><b>${formatNumber(totalInputAsk)}</b></td>
                            <th style="text-align: left;">${generateDiffInfo({ ask: totalInputAsk, medianAsk: totalInputMedianAsk }, "ask")}</th>
                            <td style="text-align: right;"><b>${formatNumber(totalInputBid)}</b></td>
                            <th style="text-align: left;">${generateDiffInfo({ bid: totalInputBid, medianBid: totalInputMedianBid }, "bid")}</th>
                            <td style="text-align: right;"><b>/</b></td>
                        </tr>
                        ${inputTableHtmls.join('\n')}
                    </tbody>
                </table>
            </div>
            <div><strong>${t('每小时支出', 'Hourly Expenditure')}:</strong> ${formatNumber(data.expendPerHour)}</div>
            <div style="color: #804600; font-size: 10px;">
                <table style="width:100%; border-collapse: collapse;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #804600;">
                            <th style="text-align: left;">${t('产出', 'Output')}</th>
                            <th style="text-align: center;">${t('数量', 'Qty')}</th>
                            <th style="text-align: right;">${t('出售价', 'Ask')}</th>
                            <th style="text-align: left;"></th>
                            <th style="text-align: right;">${t('收购价', 'Bid')}</th>
                            <th style="text-align: left;"></th>
                            <th style="text-align: right;">${t('数量/小时', 'Qty/h')}</th>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: left;"><b>${t('合计', 'Total')}</b></td>
                            <td style="text-align: right;"><b>/</b></td>
                            <td style="text-align: right;"><b>${formatNumber(totalOuputAsk)}</b></td>
                            <th style="text-align: left;">${generateDiffInfo({ ask: totalOuputAsk, medianAsk: totalOutputMedianAsk }, "ask")}</th>
                            <td style="text-align: right;"><b>${formatNumber(totalOuputBid)}</b></td>
                            <th style="text-align: left;">${generateDiffInfo({ bid: totalOuputBid, medianBid: totalOutputMedianBid }, "bid")}</th>
                            <td style="text-align: right;"><b>/</b></td>
                        </tr>
                        ${onputTableHtmls.join('\n')}
                    </tbody>
                </table>
            </div>
            <div><strong>${t('每小时收入', 'Hourly Income')}(${t('税后', 'after tax')}):</strong> ${formatNumber(data.outputPerHour.bid)}</div>
            <div style="color: #804600; font-size: 10px;">
                <table style="width:100%; border-collapse: collapse;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #804600;">
                            <th style="text-align: right;">${t('类型', 'Type')}</th>
                            <th style="text-align: right;">${t('速度', 'Speed')}</th>
                            <th style="text-align: right;">${t('效率', 'Eff.')}</th>
                            <th style="text-align: right;">${t('数量', 'Qty')}</th>
                            <th style="text-align: right;">${t('精华', 'Ess.')}</th>
                            <th style="text-align: right;">${t('稀有', 'Rare')}</th>
                            <th style="text-align: right;">${t('经验', 'Exp')}</th>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('社区', 'Community')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.communityBuff.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.communityBuff.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.communityBuff.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.communityBuff.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.communityBuff.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.communityBuff.wisdom)} </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('茶', 'Tea')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.teaBuffs.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.teaBuffs.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.teaBuffs.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.teaBuffs.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.teaBuffs.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.teaBuffs.wisdom)} </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('装备', 'Equipment')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.equipmentBuff.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.equipmentBuff.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.equipmentBuff.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.equipmentBuff.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.equipmentBuff.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.equipmentBuff.wisdom)} </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('等级', 'Level')}</b></td>
                            <td style="text-align: right;"><b> - </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.levelEffBuff)} </b></td>
                            <td style="text-align: right;"><b> - </b></td>
                            <td style="text-align: right;"><b> - </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('房子', 'House')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.houseBuff.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.houseBuff.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.houseBuff.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.houseBuff.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.houseBuff.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.houseBuff.wisdom)} </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('成就', 'Achievement')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.achievementBuff.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.achievementBuff.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.achievementBuff.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.achievementBuff.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.achievementBuff.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.achievementBuff.wisdom)} </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('卷轴', 'Scroll')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.personalBuff.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.personalBuff.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.personalBuff.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.personalBuff.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.personalBuff.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.personalBuff.wisdom)} </b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #804600;">
                            <td style="text-align: right;"><b>${t('MooPass', 'MooPass')}</b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.action_speed)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.efficiency)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.gathering)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.essence_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.rare_find)} </b></td>
                            <td style="text-align: right;"><b> ${formatPercent(data.mooPassBuff.wisdom)} </b></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div>${t('每小时动作', 'Actions/h')}: ${data.actionPerHour.toFixed(2)}${t('次', '')}</div>
            <div>${t('茶减少消耗', 'Tea Reduction')}: ${data.teaBuffs.artisan.toFixed(2)}%</div>
            <div><strong>${t('单次经验值', 'Exp/Action')}:</strong> ${formatNumber(data.expPerAction)}</div>
            <div><strong>${t('每小时经验值', 'Exp/h')}:</strong> ${formatNumber(data.expPerHour)}</div>
            <div><strong>${t('每小时利润', 'Hourly Profit')}(${t('税后', 'after tax')}):</strong> ${formatNumber(data.profitPerHour)}</div>
            ${(() => {
                const displayCount = globals.profitSettings?.levelUpDisplayCount || 3;
                const currentSkill = getCurrentSkill(data.skillHrid);
                const currentLevel = currentSkill?.level || 0;
                const expTable = getExpTable();

                if (currentLevel <= 0 || displayCount <= 0) {
                    return '';
                }

                let levelUpHtml = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #804600;">
                    <div style="font-weight: bold; margin-bottom: 4px;">${t('升级预估', 'Level Up Est.')} (${currentLevel}${t('级', 'lv')} → ${currentLevel + displayCount}${t('级', 'lv')}):</div>
                    <div style="color: #666;">`;

                for (let i = 1; i <= displayCount; i++) {
                    const targetLevel = currentLevel + i;
                    const result = calculateNeedToLevel(data, targetLevel, expTable, currentSkill);
                    if (result) {
                        levelUpHtml += `<div>${t('到', 'to')}${targetLevel}${t('级', 'lv')}: ${timeReadable(result.timeSec)} (${formatNumber(result.numOfActions)}${t('次', '次')})</div>`;
                    } else {
                        levelUpHtml += `<div>${t('到', 'to')}${targetLevel}${t('级', 'lv')}: -</div>`;
                    }
                }

                levelUpHtml += `</div></div>`;
                return levelUpHtml;
            })()}
        `;
    return content;
}
