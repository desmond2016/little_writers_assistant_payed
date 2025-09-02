// 个人中心页面JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面元素
    const userInfo = document.getElementById('userInfo');
    const userAvatarLarge = document.getElementById('userAvatarLarge');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const joinDate = document.getElementById('joinDate');
    const creditsAmount = document.getElementById('creditsAmount');
    const messageContainer = document.getElementById('messageContainer');
    
    // 按钮元素
    const redeemBtn = document.getElementById('redeemBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const cancelRedeemBtn = document.getElementById('cancelRedeemBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    
    // 区域元素
    const redeemSection = document.getElementById('redeemSection');
    const historySection = document.getElementById('historySection');
    
    // 表单元素
    const redeemForm = document.getElementById('redeemForm');
    const redeemCode = document.getElementById('redeemCode');
    
    // 历史记录元素
    const usageHistory = document.getElementById('usageHistory');
    const redemptionHistory = document.getElementById('redemptionHistory');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // API URLs
    const API_BASE_URL = 'http://127.0.0.1:5001/api';
    const USER_PROFILE_URL = `${API_BASE_URL}/user/profile`;
    const REDEEM_URL = `${API_BASE_URL}/redeem`;
    const USAGE_HISTORY_URL = `${API_BASE_URL}/user/usage-history`;
    const REDEMPTION_HISTORY_URL = `${API_BASE_URL}/user/redemption-history`;

    let currentUser = null;

    // 工具函数
    function getAuthToken() {
        return localStorage.getItem('access_token');
    }

    function isLoggedIn() {
        return !!getAuthToken();
    }

    function logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.href = 'auth.html';
    }

    function showMessage(message, type = 'info') {
        clearMessages();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageContainer.appendChild(messageDiv);
        
        // 5秒后自动清除消息
        setTimeout(clearMessages, 5000);
    }

    function clearMessages() {
        messageContainer.innerHTML = '';
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // API调用函数
    async function fetchUserProfile() {
        const token = getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch(USER_PROFILE_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.user;
            } else if (response.status === 401) {
                logout();
                return null;
            }
        } catch (error) {
            console.error('获取用户资料失败:', error);
            showMessage('获取用户资料失败', 'error');
        }
        return null;
    }

    async function redeemCredits(code) {
        const token = getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch(REDEEM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: code })
            });

            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('兑换积分失败:', error);
            return { success: false, error: '网络错误，请稍后重试' };
        }
    }

    async function fetchUsageHistory() {
        const token = getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch(USAGE_HISTORY_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.history;
            }
        } catch (error) {
            console.error('获取使用记录失败:', error);
        }
        return null;
    }

    async function fetchRedemptionHistory() {
        const token = getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch(REDEMPTION_HISTORY_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.history;
            }
        } catch (error) {
            console.error('获取兑换记录失败:', error);
        }
        return null;
    }

    // UI更新函数
    function updateUserInfo(user) {
        currentUser = user;
        if (!user) {
            userInfo.innerHTML = `
                <div class="auth-buttons">
                    <a href="auth.html" class="auth-btn">登录</a>
                </div>
            `;
            return;
        }

        // 更新头部用户信息
        const userInitial = user.username.charAt(0).toUpperCase();
        userInfo.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar">${userInitial}</div>
                <div class="user-details">
                    <div class="user-name">${user.username}</div>
                    <div class="user-credits">积分: ${user.credits}</div>
                </div>
                <button class="logout-btn" onclick="logout()">退出</button>
            </div>
        `;

        // 更新个人资料卡片
        userAvatarLarge.textContent = userInitial;
        userName.textContent = user.username;
        userEmail.textContent = user.email;
        joinDate.textContent = formatDate(user.created_at);
        creditsAmount.textContent = user.credits;
    }

    function renderUsageHistory(history) {
        if (!history || history.length === 0) {
            usageHistory.innerHTML = '<div class="empty-state">暂无使用记录</div>';
            return;
        }

        const historyHTML = history.map(item => {
            const actionText = item.action_type === 'chat' ? '聊天对话' : '完成作文';
            return `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-action">${actionText}</div>
                        <div class="history-time">${formatDateTime(item.timestamp)}</div>
                    </div>
                    <div class="history-credits negative">-${item.credits_consumed}</div>
                </div>
            `;
        }).join('');

        usageHistory.innerHTML = historyHTML;
    }

    function renderRedemptionHistory(history) {
        if (!history || history.length === 0) {
            redemptionHistory.innerHTML = '<div class="empty-state">暂无兑换记录</div>';
            return;
        }

        const historyHTML = history.map(item => {
            return `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-action">兑换积分 (${item.code})</div>
                        <div class="history-time">${formatDateTime(item.used_at)}</div>
                    </div>
                    <div class="history-credits positive">+${item.credits_value}</div>
                </div>
            `;
        }).join('');

        redemptionHistory.innerHTML = historyHTML;
    }

    // 事件处理函数
    redeemBtn.addEventListener('click', () => {
        redeemSection.style.display = 'block';
        historySection.style.display = 'none';
        redeemCode.focus();
    });

    viewHistoryBtn.addEventListener('click', async () => {
        redeemSection.style.display = 'none';
        historySection.style.display = 'block';
        
        // 加载使用记录
        usageHistory.innerHTML = '<div class="loading">加载中...</div>';
        const usage = await fetchUsageHistory();
        renderUsageHistory(usage);
        
        // 加载兑换记录
        redemptionHistory.innerHTML = '<div class="loading">加载中...</div>';
        const redemption = await fetchRedemptionHistory();
        renderRedemptionHistory(redemption);
    });

    cancelRedeemBtn.addEventListener('click', () => {
        redeemSection.style.display = 'none';
        redeemForm.reset();
    });

    closeHistoryBtn.addEventListener('click', () => {
        historySection.style.display = 'none';
    });

    // 兑换表单提交
    redeemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const code = redeemCode.value.trim().toUpperCase();
        if (!code) {
            showMessage('请输入兑换码', 'error');
            return;
        }

        const submitBtn = redeemForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '兑换中...';

        const result = await redeemCredits(code);
        
        if (result.success) {
            showMessage(result.data.message, 'success');
            redeemForm.reset();
            redeemSection.style.display = 'none';
            
            // 刷新用户信息
            const updatedUser = await fetchUserProfile();
            updateUserInfo(updatedUser);
        } else {
            showMessage(result.error, 'error');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = '兑换';
    });

    // 标签页切换
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新内容显示
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === targetTab + 'Tab') {
                    pane.classList.add('active');
                }
            });
        });
    });

    // 使logout函数全局可用
    window.logout = logout;

    // 初始化
    async function initialize() {
        if (!isLoggedIn()) {
            window.location.href = 'auth.html';
            return;
        }

        const user = await fetchUserProfile();
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }

        updateUserInfo(user);

        // 检查URL参数，自动打开相应功能
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');

        if (action === 'redeem') {
            redeemSection.style.display = 'block';
            redeemCode.focus();
        } else if (action === 'history') {
            historySection.style.display = 'block';

            // 加载使用记录
            usageHistory.innerHTML = '<div class="loading">加载中...</div>';
            const usage = await fetchUsageHistory();
            renderUsageHistory(usage);

            // 加载兑换记录
            redemptionHistory.innerHTML = '<div class="loading">加载中...</div>';
            const redemption = await fetchRedemptionHistory();
            renderRedemptionHistory(redemption);
        }
    }

    initialize();
});
