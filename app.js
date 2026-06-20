// 初始状态
let state = {
    players: [
        { id: 0, name: '玩家一', pos: '东', score: 0 },
        { id: 1, name: '玩家二', pos: '南', score: 0 },
        { id: 2, name: '玩家三', pos: '西', score: 0 },
        { id: 3, name: '玩家四', pos: '北', score: 0 }
    ],
    flows: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    settings: {
        theme: 'dark', // 默认暗色主题
        initial: 0,
        zimo: 10,
        fangchong: 10,
        hua: 1,
        gang: 5
    },
    history: [] // 记录每次变动前的 state
};

// DOM 元素
const dashboard = document.getElementById('dashboard');
const btnUndo = document.getElementById('btn-undo');
const btnHistory = document.getElementById('btn-history');
const btnSettings = document.getElementById('btn-settings');

const modalDiscard = document.getElementById('modal-discard');
const closeDiscard = document.getElementById('close-discard');
const discardOptions = document.getElementById('discard-options');

const modalConfirm = document.getElementById('modal-confirm');
const closeConfirm = document.getElementById('close-confirm');
const confirmTitle = document.getElementById('confirm-title');
const confirmDescription = document.getElementById('confirm-description');
const confirmAmount = document.getElementById('confirm-amount');
const btnCancelConfirm = document.getElementById('btn-cancel-confirm');
const btnSubmitConfirm = document.getElementById('btn-submit-confirm');

const modalRelation = document.getElementById('modal-relation');
const closeRelation = document.getElementById('close-relation');
const relationTitle = document.getElementById('relation-title');
const relationSubtitle = document.getElementById('relation-subtitle');
const relationMapContainer = document.getElementById('relation-map-container');

const modalHistory = document.getElementById('modal-history');
const closeHistory = document.getElementById('close-history');
const historyList = document.getElementById('history-list');
const btnModalUndo = document.getElementById('btn-modal-undo');

const modalSettings = document.getElementById('modal-settings');
const closeSettings = document.getElementById('close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnResetGame = document.getElementById('btn-reset-game');

// 临时存储结算信息
let currentWinnerId = null;
let pendingAction = null; // { type: 'zimo'|'fangchong', winnerId: number, loserId?: number }

// 初始化
function init() {
    loadState();
    applyTheme(); // 应用主题
    renderDashboard();
    updateUndoButton();
    setupEventListeners();
}

// 应用皮肤主题
function applyTheme() {
    let theme = state.settings.theme || 'dark';
    if (theme !== 'dark' && theme !== 'light') {
        theme = 'dark';
    }
    document.body.className = ''; // 清空类名
    if (theme !== 'dark') {
        document.body.classList.add(`theme-${theme}`);
    }
}

// 格式化数字，去掉不必要的小数
function formatNumber(num) {
    return parseFloat(num.toFixed(2)).toString();
}

// 渲染主面板
function renderDashboard() {
    dashboard.innerHTML = '';
    state.players.forEach(player => {
        const scoreClass = player.score > 0 ? 'score-positive' : (player.score < 0 ? 'score-negative' : 'score-zero');
        const sign = player.score > 0 ? '+' : '';
        
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="player-info">
                    <span class="position-badge">${player.pos}</span>
                    <span class="player-name">${player.name}</span>
                    <button class="icon-btn relation-btn" onclick="showRelation(${player.id})" style="padding: 2px; margin-left: 6px;" title="查看对局输赢图">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--secondary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </button>
                </div>
                <div class="score-display ${scoreClass}">${sign}${formatNumber(player.score)}</div>
            </div>
            <div class="card-actions">
                <button class="action-btn btn-zimo" onclick="prepareZimo(${player.id})">自摸</button>
                <button class="action-btn btn-fangchong" onclick="openDiscardModal(${player.id})">放铳 (指定)</button>
                <button class="action-btn btn-hua" onclick="handleHua(${player.id})">花</button>
                <button class="action-btn btn-gang" onclick="handleGang(${player.id})">杠</button>
            </div>
        `;
        dashboard.appendChild(card);
    });
}

// --- 核心计分逻辑 ---

function saveHistory(desc, type, winnerId, loserId, amount) {
    // 深度拷贝玩家数据和流矩阵用于回退
    const snapshotPlayers = state.players.map(p => ({ ...p }));
    const snapshotFlows = state.flows.map(row => [...row]);
    state.history.push({
        time: new Date().toLocaleTimeString(),
        desc: desc,
        type: type,
        winnerId: winnerId,
        loserId: loserId,
        amount: amount,
        players: snapshotPlayers,
        flows: snapshotFlows
    });
    updateUndoButton();
    saveState();
}

// 点击自摸：准备结算，弹出确认窗口
function prepareZimo(winnerId) {
    const winner = state.players[winnerId];
    pendingAction = {
        type: 'zimo',
        winnerId: winnerId
    };
    
    confirmTitle.innerText = '自摸结算';
    confirmDescription.innerHTML = `<strong>${winner.pos}风 - ${winner.name}</strong> 自摸赢牌<br><small style="color: var(--text-muted);">（其余三家各付此分数）</small>`;
    confirmAmount.value = state.settings.zimo;
    
    modalConfirm.classList.add('show');
    // 自动聚焦并选中金额，方便直接修改
    setTimeout(() => {
        confirmAmount.focus();
        confirmAmount.select();
    }, 100);
}

// 开启放铳选择面板
function openDiscardModal(winnerId) {
    currentWinnerId = winnerId;
    discardOptions.innerHTML = '';
    const winner = state.players[winnerId];
    
    state.players.forEach(p => {
        if (p.id !== winnerId) {
            const btn = document.createElement('button');
            btn.className = 'discard-btn';
            btn.innerHTML = `<span>${p.pos}风 - ${p.name}</span> <span>放铳给 ${winner.pos}风</span>`;
            btn.onclick = () => prepareFangchong(p.id);
            discardOptions.appendChild(btn);
        }
    });
    
    modalDiscard.classList.add('show');
}

// 选完放铳者：准备结算，弹出确认窗口
function prepareFangchong(loserId) {
    modalDiscard.classList.remove('show');
    
    const winner = state.players[currentWinnerId];
    const loser = state.players[loserId];
    
    pendingAction = {
        type: 'fangchong',
        winnerId: currentWinnerId,
        loserId: loserId
    };
    
    confirmTitle.innerText = '放铳结算';
    confirmDescription.innerHTML = `<strong>${loser.pos}风 - ${loser.name}</strong> 放铳给 <strong>${winner.pos}风 - ${winner.name}</strong><br><small style="color: var(--text-muted);">（仅放铳者一人给分）</small>`;
    confirmAmount.value = state.settings.fangchong;
    
    currentWinnerId = null;
    modalConfirm.classList.add('show');
    
    // 自动聚焦并选中金额，方便直接修改
    setTimeout(() => {
        confirmAmount.focus();
        confirmAmount.select();
    }, 100);
}

// 确认结算
function submitConfirm() {
    if (!pendingAction) return;
    
    const amount = parseFloat(confirmAmount.value) || 0;
    const winner = state.players[pendingAction.winnerId];
    
    if (pendingAction.type === 'zimo') {
        saveHistory(`${winner.pos}风 ${winner.name} 自摸 [分数: ${amount}]`, 'zimo', pendingAction.winnerId, null, amount);
        let totalWin = 0;
        state.players.forEach(p => {
            if (p.id !== pendingAction.winnerId) {
                p.score -= amount;
                totalWin += amount;
                
                // 更新资金流往来 (赢家加钱，输家扣钱)
                state.flows[pendingAction.winnerId][p.id] += amount;
                state.flows[p.id][pendingAction.winnerId] -= amount;
            }
        });
        winner.score += totalWin;
    } else if (pendingAction.type === 'fangchong') {
        const loser = state.players[pendingAction.loserId];
        saveHistory(`${loser.pos}风 放铳给 ${winner.pos}风 [分数: ${amount}]`, 'fangchong', pendingAction.winnerId, loser.id, amount);
        loser.score -= amount;
        winner.score += amount;
        
        // 更新资金流往来
        state.flows[pendingAction.winnerId][loser.id] += amount;
        state.flows[loser.id][pendingAction.winnerId] -= amount;
    }
    
    closeConfirmModal();
    renderDashboard();
    saveState();
}

function closeConfirmModal() {
    modalConfirm.classList.remove('show');
    pendingAction = null;
}

function handleHua(winnerId) {
    const winner = state.players[winnerId];
    const amount = state.settings.hua;
    saveHistory(`${winner.pos}风 ${winner.name} 补花 [分数: ${amount}]`, 'hua', winnerId, null, amount);
    
    let totalWin = 0;
    state.players.forEach(p => {
        if (p.id !== winnerId) {
            p.score -= amount;
            totalWin += amount;
            
            // 更新资金流往来
            state.flows[winnerId][p.id] += amount;
            state.flows[p.id][winnerId] -= amount;
        }
    });
    winner.score += totalWin;
    
    renderDashboard();
    saveState();
}

// 杠牌
function handleGang(winnerId) {
    const winner = state.players[winnerId];
    const amount = state.settings.gang;
    saveHistory(`${winner.pos}风 ${winner.name} 杠牌 [分数: ${amount}]`, 'gang', winnerId, null, amount);
    
    let totalWin = 0;
    state.players.forEach(p => {
        if (p.id !== winnerId) {
            p.score -= amount;
            totalWin += amount;
            
            // 更新资金流往来
            state.flows[winnerId][p.id] += amount;
            state.flows[p.id][winnerId] -= amount;
        }
    });
    winner.score += totalWin;
    
    renderDashboard();
    saveState();
}

// --- 关系细节计算 ---

function getRelationDetail(centerId, otherId) {
    const details = {
        zimo: { winCount: 0, winSum: 0, loseCount: 0, loseSum: 0 },
        fangchong: { winCount: 0, winSum: 0, loseCount: 0, loseSum: 0 },
        hua: { winCount: 0, winSum: 0, loseCount: 0, loseSum: 0 },
        gang: { winCount: 0, winSum: 0, loseCount: 0, loseSum: 0 }
    };
    
    state.history.forEach(item => {
        if (!item.type) return; // 兼容没有 type 的旧历史数据
        const type = item.type;
        const w = item.winnerId;
        const l = item.loserId;
        const amt = item.amount;
        
        if (type === 'zimo' || type === 'hua' || type === 'gang') {
            if (w === centerId) {
                details[type].winCount++;
                details[type].winSum += amt;
            } else if (w === otherId) {
                details[type].loseCount++;
                details[type].loseSum += amt;
            }
        } else if (type === 'fangchong') {
            if (w === centerId && l === otherId) {
                details[type].winCount++;
                details[type].winSum += amt;
            } else if (w === otherId && l === centerId) {
                details[type].loseCount++;
                details[type].loseSum += amt;
            }
        }
    });
    
    return details;
}

// 渲染关系细节表格
function renderRelationDetailTable(centerId, otherId) {
    const other = state.players.find(p => p.id === otherId);
    const details = getRelationDetail(centerId, otherId);
    
    const zimoNet = details.zimo.winSum - details.zimo.loseSum;
    const fangchongNet = details.fangchong.winSum - details.fangchong.loseSum;
    const huaNet = details.hua.winSum - details.hua.loseSum;
    const gangNet = details.gang.winSum - details.gang.loseSum;
    const totalNet = zimoNet + fangchongNet + huaNet + gangNet;
    
    const panel = document.getElementById('relation-detail-panel');
    const title = document.getElementById('detail-panel-title');
    const content = document.getElementById('detail-panel-content');
    
    title.innerText = `与 ${other.pos}风 - ${other.name} 的对局明细`;
    
    function fmtVal(val) {
        if (val > 0) return `<span class="txt-win">+${formatNumber(val)}</span>`;
        if (val < 0) return `<span class="txt-lose">${formatNumber(val)}</span>`;
        return `<span class="txt-bold">0</span>`;
    }
    
    content.innerHTML = `
        <table class="detail-table">
            <thead>
                <tr>
                    <th>项目</th>
                    <th>我赢 (次数)</th>
                    <th>我输 (次数)</th>
                    <th>小计</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>自摸</strong></td>
                    <td>+${formatNumber(details.zimo.winSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.zimo.winCount}次)</small></td>
                    <td>-${formatNumber(details.zimo.loseSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.zimo.loseCount}次)</small></td>
                    <td>${fmtVal(zimoNet)}</td>
                </tr>
                <tr>
                    <td><strong>放铳</strong></td>
                    <td>+${formatNumber(details.fangchong.winSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.fangchong.winCount}次)</small></td>
                    <td>-${formatNumber(details.fangchong.loseSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.fangchong.loseCount}次)</small></td>
                    <td>${fmtVal(fangchongNet)}</td>
                </tr>
                <tr>
                    <td><strong>花牌</strong></td>
                    <td>+${formatNumber(details.hua.winSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.hua.winCount}次)</small></td>
                    <td>-${formatNumber(details.hua.loseSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.hua.loseCount}次)</small></td>
                    <td>${fmtVal(huaNet)}</td>
                </tr>
                <tr>
                    <td><strong>杠牌</strong></td>
                    <td>+${formatNumber(details.gang.winSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.gang.winCount}次)</small></td>
                    <td>-${formatNumber(details.gang.loseSum)} <small style="color:var(--text-muted); font-size:0.7rem;">(${details.gang.loseCount}次)</small></td>
                    <td>${fmtVal(gangNet)}</td>
                </tr>
                <tr style="background: rgba(255, 255, 255, 0.04); border-top: 1px solid var(--card-border);">
                    <td><strong>总结算</strong></td>
                    <td colspan="2" style="text-align:right; font-weight:600; color:var(--text-muted); font-size:0.8rem;">合计输赢:</td>
                    <td class="txt-bold" style="font-size:0.95rem;">${fmtVal(totalNet)}</td>
                </tr>
            </tbody>
        </table>
    `;
    panel.style.display = 'block';
}

// --- 关系往来图渲染 ---

function showRelation(centerId) {
    const center = state.players[centerId];
    const others = state.players.filter(p => p.id !== centerId);
    
    relationMapContainer.innerHTML = '';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;');
    relationMapContainer.appendChild(svg);
    
    const centerNode = createNodeEl(center, 'center', 'left: 50%; top: 50%;');
    relationMapContainer.appendChild(centerNode);
    
    const outerPositions = [
        'left: 50%; top: 14%;',  // 顶部
        'left: 83%; top: 73%;',  // 右下
        'left: 17%; top: 73%;'   // 左下
    ];
    
    const centerCoord = { x: 160, y: 160 };
    const outerCoords = [
        { x: 160, y: 45 },
        { x: 265, y: 235 },
        { x: 55, y: 235 }
    ];
    
    others.forEach((p, idx) => {
        const outerNode = createNodeEl(p, 'outer', outerPositions[idx]);
        outerNode.id = `rel-node-${p.id}`;
        
        outerNode.onclick = () => {
            others.forEach(o => {
                const node = document.getElementById(`rel-node-${o.id}`);
                if (node) node.classList.remove('active');
            });
            outerNode.classList.add('active');
            renderRelationDetailTable(centerId, p.id);
        };
        
        relationMapContainer.appendChild(outerNode);
        
        const netFlow = state.flows[centerId][p.id];
        let color = 'rgba(255,255,255,0.12)';
        let strokeWidth = '2';
        
        if (netFlow > 0) {
            color = 'var(--success)';
            strokeWidth = '3.5';
        } else if (netFlow < 0) {
            color = 'var(--danger)';
            strokeWidth = '3.5';
        }
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerCoord.x);
        line.setAttribute('y1', centerCoord.y);
        line.setAttribute('x2', outerCoords[idx].x);
        line.setAttribute('y2', outerCoords[idx].y);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', strokeWidth);
        if (netFlow === 0) {
            line.setAttribute('stroke-dasharray', '4 4');
        }
        svg.appendChild(line);
        
        const midX = (centerCoord.x + outerCoords[idx].x) / 2;
        const midY = (centerCoord.y + outerCoords[idx].y) / 2;
        
        const label = document.createElement('div');
        let arrow = '';
        let labelClass = 'label-zero';
        const absVal = Math.abs(netFlow);
        
        if (netFlow > 0) {
            labelClass = 'label-win';
            if (idx === 0) arrow = '⬇️';
            if (idx === 1) arrow = '↖️';
            if (idx === 2) arrow = '↗️';
        } else if (netFlow < 0) {
            labelClass = 'label-lose';
            if (idx === 0) arrow = '⬆️';
            if (idx === 1) arrow = '↘️';
            if (idx === 2) arrow = '↙️';
        } else {
            arrow = '➖';
        }
        
        label.className = `relation-label ${labelClass}`;
        label.style.left = `${(midX / 3.2).toFixed(1)}%`;
        label.style.top = `${(midY / 3.2).toFixed(1)}%`;
        label.innerHTML = `${arrow} ${formatNumber(absVal)}`;
        relationMapContainer.appendChild(label);
    });
    
    relationTitle.innerText = `${center.pos}风 - ${center.name} 输赢账单`;
    relationSubtitle.innerHTML = `🟢 绿色表示<strong>你赢对方</strong>，🔴 红色表示<strong>你输给对方</strong>。<br><span style="color:var(--secondary); font-weight:600; font-size:0.8rem;">💡 点击上方玩家头像，可查看详细记录明细</span>`;
    
    modalRelation.classList.add('show');
    
    if (others.length > 0) {
        setTimeout(() => {
            const firstNode = document.getElementById(`rel-node-${others[0].id}`);
            if (firstNode) firstNode.click();
        }, 50);
    }
}

// 辅助创建节点 HTML 元素
function createNodeEl(player, type, styleStr) {
    const el = document.createElement('div');
    el.className = `relation-node ${type}`;
    el.setAttribute('style', styleStr);
    
    const scoreClass = player.score > 0 ? 'score-positive' : (player.score < 0 ? 'score-negative' : 'score-zero');
    const sign = player.score > 0 ? '+' : '';
    
    el.innerHTML = `
        <span class="node-pos">${player.pos}</span>
        <span class="node-name">${player.name}</span>
        <span class="node-score ${scoreClass}" style="font-size:0.75rem; font-weight:bold; margin-top:2px;">${sign}${formatNumber(player.score)}</span>
    `;
    return el;
}

// --- 撤销与历史 ---

function undo() {
    if (state.history.length === 0) return;
    
    const lastState = state.history.pop();
    state.players = lastState.players.map(p => ({ ...p }));
    
    state.flows = lastState.flows ? lastState.flows.map(row => [...row]) : [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    
    renderDashboard();
    updateUndoButton();
    if (modalHistory.classList.contains('show')) {
        renderHistoryList();
    }
    saveState();
}

function updateUndoButton() {
    btnUndo.disabled = state.history.length === 0;
    btnModalUndo.disabled = state.history.length === 0;
}

function renderHistoryList() {
    historyList.innerHTML = '';
    if (state.history.length === 0) {
        historyList.innerHTML = '<li class="history-item"><div class="history-desc" style="color:#9ca3af;text-align:center;">暂无记录</div></li>';
        return;
    }
    
    // 倒序显示
    [...state.history].reverse().forEach((record, index) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-desc">
                <div>${record.desc}</div>
                <div class="history-time">${record.time}</div>
            </div>
        `;
        historyList.appendChild(li);
    });
}

// --- 设置与存储 ---

function saveState() {
    localStorage.setItem('mahjongState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('mahjongState');
    if (saved) {
        try {
            state = JSON.parse(saved);
            
            if (!state.flows) {
                state.flows = [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ];
            }
            if (!state.settings.theme || state.settings.theme !== 'light') {
                state.settings.theme = 'dark';
            }
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }
}

function populateSettings() {
    state.players.forEach((p, i) => {
        document.getElementById(`name-${i}`).value = p.name;
    });
    document.getElementById('setting-theme').value = state.settings.theme || 'dark';
    document.getElementById('setting-initial').value = state.settings.initial;
    document.getElementById('setting-zimo').value = state.settings.zimo;
    document.getElementById('setting-fangchong').value = state.settings.fangchong;
    document.getElementById('setting-hua').value = state.settings.hua;
    document.getElementById('setting-gang').value = state.settings.gang;
}

function saveSettings() {
    state.players.forEach((p, i) => {
        p.name = document.getElementById(`name-${i}`).value || p.pos;
    });
    
    state.settings.theme = document.getElementById('setting-theme').value;
    state.settings.initial = parseFloat(document.getElementById('setting-initial').value) || 0;
    state.settings.zimo = parseFloat(document.getElementById('setting-zimo').value) || 0;
    state.settings.fangchong = parseFloat(document.getElementById('setting-fangchong').value) || 0;
    state.settings.hua = parseFloat(document.getElementById('setting-hua').value) || 0;
    state.settings.gang = parseFloat(document.getElementById('setting-gang').value) || 0;
    
    applyTheme();
    saveState();
    renderDashboard();
    modalSettings.classList.remove('show');
}

function resetGame() {
    if (confirm('确定要重置所有分数、资金关系和历史记录吗？')) {
        const initialScore = state.settings.initial;
        state.players.forEach(p => p.score = initialScore);
        state.flows = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];
        state.history = [];
        saveState();
        renderDashboard();
        updateUndoButton();
        modalSettings.classList.remove('show');
    }
}

// --- 事件监听 ---

function setupEventListeners() {
    // 弹窗关闭
    closeDiscard.onclick = () => { modalDiscard.classList.remove('show'); currentWinnerId = null; };
    closeConfirm.onclick = closeConfirmModal;
    btnCancelConfirm.onclick = closeConfirmModal;
    closeRelation.onclick = () => modalRelation.classList.remove('show');
    closeHistory.onclick = () => modalHistory.classList.remove('show');
    closeSettings.onclick = () => modalSettings.classList.remove('show');
    
    // 确认结算
    btnSubmitConfirm.onclick = submitConfirm;
    
    // 输入框回车直接确认
    confirmAmount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitConfirm();
        }
    });
    
    // 点击背景关闭弹窗
    window.onclick = (e) => {
        if (e.target === modalDiscard) { modalDiscard.classList.remove('show'); currentWinnerId = null; }
        if (e.target === modalConfirm) closeConfirmModal();
        if (e.target === modalRelation) modalRelation.classList.remove('show');
        if (e.target === modalHistory) modalHistory.classList.remove('show');
        if (e.target === modalSettings) modalSettings.classList.remove('show');
    };
    
    // 顶栏按钮
    btnUndo.onclick = undo;
    btnHistory.onclick = () => {
        renderHistoryList();
        modalHistory.classList.add('show');
    };
    btnSettings.onclick = () => {
        populateSettings();
        modalSettings.classList.add('show');
    };
    
    // 设置操作
    btnSaveSettings.onclick = saveSettings;
    btnResetGame.onclick = resetGame;
    btnModalUndo.onclick = undo;
}

// 启动
init();
