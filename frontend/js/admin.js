// 管理员后台JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面元素
    const userInfo = document.getElementById('userInfo');
    const messageContainer = document.getElementById('messageContainer');
    const generateForm = document.getElementById('generateForm');
    const generateResult = document.getElementById('generateResult');
    const generatedCode = document.getElementById('generatedCode');
    const copyBtn = document.getElementById('copyBtn');
    const codeCredits = document.getElementById('codeCredits');
    const codeExpires = document.getElementById('codeExpires');
    const quickBtns = document.querySelectorAll('.quick-btn');
    
    // 统计元素
    const totalUsers = document.getElementById('totalUsers');
    const totalCodes = document.getElementById('totalCodes');
    const usedCodes = document.getElementById('usedCodes');
    const totalCredits = document.getElementById('totalCredits');

    // 新功能元素
    const passwordForm = document.getElementById('passwordForm');
    const userSearch = document.getElementById('userSearch');
    const searchBtn = document.getElementById('searchBtn');
    const userTableBody = document.getElementById('userTableBody');
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');

    // API URLs - 使用配置文件中的API地址
    const API_BASE_URL = CONFIG.API.BASE_URL;
    const USER_PROFILE_URL = `${API_BASE_URL}/user/profile`;
    const GENERATE_CODE_URL = `${API_BASE_URL}/admin/generate-code`;
    const STATISTICS_URL = `${API_BASE_URL}/admin/statistics`;
    const USERS_URL = `${API_BASE_URL}/admin/users`;
    const CHANGE_PASSWORD_URL = `${API_BASE_URL}/admin/change-password`;

    let currentUser = null;
    let currentPage = 1;
    let currentSearch = '';

    // 管理员token管理函数
    function getAuthToken() {
        return localStorage.getItem('admin_token');
    }

    function isLoggedIn() {
        return !!getAuthToken();
    }

    function logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_info');
        window.location.href = 'admin-login.html';
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
        if (!dateString) return '永不过期';
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    async function generateRedemptionCode(creditsValue, expiresDays) {
        const token = getAuthToken();
        if (!token) return null;

        try {
            const payload = { credits_value: creditsValue };
            if (expiresDays) {
                payload.expires_days = expiresDays;
            }

            const response = await fetch(GENERATE_CODE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('生成兑换码失败:', error);
            return { success: false, error: '网络错误，请稍后重试' };
        }
    }

    async function fetchStatistics() {
        const token = getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch(STATISTICS_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.statistics;
            }
        } catch (error) {
            console.error('获取统计信息失败:', error);
        }
        return null;
    }

    // UI更新函数
    function updateUserInfo(user) {
        currentUser = user;
        if (!user) {
            userInfo.innerHTML = `
                <div class="auth-buttons">
                    <button class="auth-btn" onclick="goToHomePage()">回到首页</button>
                </div>
            `;
            return;
        }

        // 检查是否为管理员（使用统一的权限验证函数）
        if (!isAdminUser(user)) {
            showMessage('权限不足，只有管理员可以访问此页面', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }

        const userInitial = user.username.charAt(0).toUpperCase();
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar">${userInitial}</div>
                    <div class="user-details">
                        <div class="user-name">${user.username} (管理员)</div>
                        <div class="user-credits">积分: ${user.credits}</div>
                    </div>
                    <button class="logout-btn" onclick="logout()">退出</button>
                </div>
            `;
        }
    }

    function updateStatistics(stats) {
        if (!stats) return;

        if (totalUsers) totalUsers.textContent = stats.total_users || 0;
        if (totalCodes) totalCodes.textContent = stats.total_codes || 0;
        if (usedCodes) usedCodes.textContent = stats.used_codes || 0;
        if (totalCredits) totalCredits.textContent = stats.total_credits_issued || 0;
    }

    function showGenerateResult(codeData) {
        if (generatedCode) generatedCode.value = codeData.code;
        if (codeCredits) codeCredits.textContent = codeData.credits_value;
        if (codeExpires) codeExpires.textContent = formatDate(codeData.expires_at);
        if (generateResult) {
            generateResult.classList.remove('hidden');
            // 滚动到结果区域
            generateResult.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 事件处理函数
    generateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const creditsValue = parseInt(document.getElementById('creditsValue').value);
        const expiresDays = document.getElementById('expiresDays').value;
        
        if (!creditsValue || creditsValue <= 0) {
            showMessage('请输入有效的积分价值', 'error');
            return;
        }

        const submitBtn = generateForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '生成中...';

        const result = await generateRedemptionCode(
            creditsValue, 
            expiresDays ? parseInt(expiresDays) : null
        );
        
        if (result.success) {
            showMessage('兑换码生成成功！', 'success');
            showGenerateResult(result.data.code);
            generateForm.reset();
            
            // 刷新统计信息
            const stats = await fetchStatistics();
            updateStatistics(stats);
        } else {
            showMessage(result.error, 'error');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = '生成兑换码';
    });

    // 复制按钮
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(generatedCode.value);
            showMessage('兑换码已复制到剪贴板', 'success');
            copyBtn.textContent = '已复制';
            setTimeout(() => {
                copyBtn.textContent = '复制';
            }, 2000);
        } catch (error) {
            // 降级方案
            generatedCode.select();
            document.execCommand('copy');
            showMessage('兑换码已复制到剪贴板', 'success');
        }
    });

    // 快速生成按钮
    quickBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const credits = parseInt(btn.dataset.credits);
            const days = parseInt(btn.dataset.days);
            
            btn.disabled = true;
            btn.textContent = '生成中...';

            const result = await generateRedemptionCode(credits, days);
            
            if (result.success) {
                showMessage(`${credits}积分兑换码生成成功！`, 'success');
                showGenerateResult(result.data.code);
                
                // 刷新统计信息
                const stats = await fetchStatistics();
                updateStatistics(stats);
            } else {
                showMessage(result.error, 'error');
            }

            btn.disabled = false;
            // 恢复按钮原始文本
            const creditsText = btn.dataset.credits;
            const priceMap = {'25': '5元', '50': '10元', '100': '20元', '250': '50元'};
            btn.textContent = `${creditsText}积分 (${priceMap[creditsText] || creditsText + '元'})`;
        });
    });

    // 密码修改功能
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;

            if (!currentPassword || !newPassword) {
                showMessage('请填写所有字段', 'error');
                return;
            }

            const submitBtn = passwordForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '修改中...';

            try {
                const response = await fetch(CHANGE_PASSWORD_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage('密码修改成功', 'success');
                    passwordForm.reset();
                } else {
                    showMessage(result.error || '密码修改失败', 'error');
                }
            } catch (error) {
                console.error('密码修改失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = '修改密码';
        });
    }

    // 用户管理功能
    async function fetchUsers(page = 1, search = '') {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: 10
            });

            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`${USERS_URL}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                const error = await response.json();
                showMessage(error.error || '获取用户列表失败', 'error');
                return null;
            }
        } catch (error) {
            console.error('获取用户列表失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
            return null;
        }
    }

    function renderUsers(data) {
        if (!data || !userTableBody) return;

        userTableBody.innerHTML = '';

        if (data.users.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="5" style="text-align: center; color: #666; padding: 20px;">
                    ${currentSearch ? '没有找到匹配的用户' : '暂无用户数据'}
                </td>
            `;
            userTableBody.appendChild(emptyRow);
            return;
        }

        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td><strong>${user.credits}</strong></td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <div class="user-actions">
                        <button type="button" class="detail-btn" onclick="showUserDetail('${user.user_id}')">详情</button>
                        <button type="button" class="edit-btn" onclick="editUser('${user.user_id}', ${user.credits})">编辑积分</button>
                        <button type="button" class="disable-btn" onclick="toggleUserStatus('${user.user_id}', ${user.is_active || true})">
                            ${user.is_active === false ? '启用' : '禁用'}
                        </button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        renderPagination(data.pagination);
    }

    function renderPagination(paginationData) {
        if (!pagination) return;

        pagination.innerHTML = '';

        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.disabled = !paginationData.has_prev;
        prevBtn.className = paginationData.has_prev ? '' : 'disabled';
        prevBtn.onclick = () => loadUsers(currentPage - 1, currentSearch);
        pagination.appendChild(prevBtn);

        // 页码按钮
        const startPage = Math.max(1, paginationData.page - 2);
        const endPage = Math.min(paginationData.pages, paginationData.page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === paginationData.page ? 'active' : '';
            pageBtn.onclick = () => loadUsers(i, currentSearch);
            pagination.appendChild(pageBtn);
        }

        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.disabled = !paginationData.has_next;
        nextBtn.className = paginationData.has_next ? '' : 'disabled';
        nextBtn.onclick = () => loadUsers(currentPage + 1, currentSearch);
        pagination.appendChild(nextBtn);

        // 更新分页信息
        if (paginationInfo) {
            paginationInfo.innerHTML = `
                <span>第 ${paginationData.page} / ${paginationData.pages} 页，共 ${paginationData.total} 条记录</span>
            `;
        }
    }

    async function loadUsers(page = 1, search = '') {
        currentPage = page;
        currentSearch = search;

        const data = await fetchUsers(page, search);
        if (data) {
            renderUsers(data);
        }
    }

    // 搜索功能
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const search = userSearch.value.trim();
            loadUsers(1, search);
        });
    }

    if (userSearch) {
        userSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const search = userSearch.value.trim();
                loadUsers(1, search);
            }
        });
    }

    // 编辑用户函数（全局）
    window.editUser = async function(userId, currentCredits) {
        const newCredits = prompt(`请输入新的积分值（当前：${currentCredits}）:`, currentCredits);

        if (newCredits === null) return;

        const credits = parseInt(newCredits);
        if (isNaN(credits) || credits < 0) {
            showMessage('请输入有效的积分值', 'error');
            return;
        }

        try {
            const response = await fetch(`${USERS_URL}/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ credits: credits })
            });

            const result = await response.json();

            if (response.ok) {
                showMessage('用户积分更新成功', 'success');
                loadUsers(currentPage, currentSearch);
            } else {
                showMessage(result.error || '更新失败', 'error');
            }
        } catch (error) {
            console.error('更新用户失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        }
    };

    // 统计刷新按钮
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', async () => {
            refreshStatsBtn.disabled = true;
            refreshStatsBtn.textContent = '刷新中...';
            
            const stats = await fetchStatistics();
            updateStatistics(stats);
            
            refreshStatsBtn.disabled = false;
            refreshStatsBtn.textContent = '刷新统计';
            showMessage('统计信息已刷新', 'success');
        });
    }

    // 管理员登出按钮
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', logout);
    }

    // 使logout函数全局可用
    window.logout = logout;

    // 检查是否为管理员用户
    function isAdminUser(userData) {
        // 统一权限验证：检查用户名和is_admin字段
        return userData && (
            userData.username === 'admin' || 
            userData.is_admin === true
        );
    }

    // 初始化
    async function initialize() {
        if (!isLoggedIn()) {
            window.location.href = 'admin-login.html';
            return;
        }

        const user = await fetchUserProfile();
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }

        // 调试：查看用户数据结构
        console.log('🔍 管理员权限验证 - 用户数据结构:', user);
        console.log('🔍 用户名:', user.username);
        console.log('🔍 是否管理员字段:', user.is_admin);

        // 检查是否为管理员
        if (!isAdminUser(user)) {
            console.log('❌ 权限验证失败 - 非管理员用户');
            showMessage('权限不足，只有管理员可以访问此页面', 'error');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
            return;
        }

        console.log('✅ 权限验证通过 - 管理员用户');

        updateUserInfo(user);

        // 加载统计信息
        const stats = await fetchStatistics();
        updateStatistics(stats);

        // 加载用户列表
        loadUsers();
    }

    initialize();

    // 用户详情模态框功能
    let currentUserDetail = null;

    // 显示用户详情模态框
    window.showUserDetail = async function(userId) {
        try {
            // 从当前用户列表中查找用户信息
            const users = Array.from(document.querySelectorAll('#userTableBody tr')).map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length > 0) {
                    return {
                        user_id: userId, // 从参数获取
                        username: cells[0].textContent,
                        email: cells[1].textContent,
                        credits: parseInt(cells[2].textContent),
                        created_at: cells[3].textContent
                    };
                }
                return null;
            }).filter(user => user && user.username);

            // 或者从后端获取完整用户信息
            const response = await fetch(`${USERS_URL}/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            let userData;
            if (response.ok) {
                const result = await response.json();
                userData = result.user || result;
            } else {
                // 如果后端API不支持，使用表格中的数据
                userData = users.find(u => u.username) || {
                    user_id: userId,
                    username: '未知',
                    email: '未知',
                    credits: 0,
                    created_at: new Date().toISOString(),
                    is_active: true
                };
            }

            currentUserDetail = userData;
            populateUserDetailModal(userData);
            showModal('userDetailModal');

        } catch (error) {
            console.error('获取用户详情失败:', error);
            showMessage('获取用户详情失败', 'error');
        }
    };

    // 填充用户详情模态框
    function populateUserDetailModal(user) {
        document.getElementById('detailUserId').textContent = user.user_id || '未知';
        document.getElementById('detailUsername').textContent = user.username || '未知';
        document.getElementById('detailEmail').textContent = user.email || '未知';
        document.getElementById('detailCredits').textContent = user.credits || 0;
        document.getElementById('detailStatus').textContent = user.is_active === false ? '已禁用' : '正常';
        document.getElementById('detailCreatedAt').textContent = formatDate(user.created_at);
        document.getElementById('detailLastLogin').textContent = formatDate(user.last_login) || '从未登录';
        document.getElementById('detailRegistrationIp').textContent = user.registration_ip || '未记录';
        
        // 更新状态切换按钮文本
        const toggleBtn = document.getElementById('toggleStatusText');
        if (toggleBtn) {
            toggleBtn.textContent = user.is_active === false ? '启用账户' : '禁用账户';
        }
    }

    // 显示模态框
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // 关闭模态框
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 关闭用户详情模态框
    window.closeUserDetailModal = function() {
        closeModal('userDetailModal');
        currentUserDetail = null;
    };

    // 模态框外部点击关闭
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('userDetailModal');
        if (event.target === modal) {
            closeUserDetailModal();
        }
    });

    // 关闭按钮事件
    document.getElementById('closeUserDetailModal').addEventListener('click', closeUserDetailModal);

    // ESC键关闭模态框
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeUserDetailModal();
        }
    });

    // 模态框中的功能函数
    window.editUserCredits = function() {
        if (currentUserDetail) {
            editUser(currentUserDetail.user_id, currentUserDetail.credits);
        }
    };

    window.toggleUserStatus = async function(userId, currentStatus) {
        const user = currentUserDetail || { user_id: userId, is_active: currentStatus };
        const newStatus = !currentStatus;
        const action = newStatus ? '启用' : '禁用';
        
        if (!confirm(`确定要${action}用户 ${user.username || userId} 吗？`)) {
            return;
        }

        try {
            // 这里需要后端支持用户状态切换API
            const response = await fetch(`${USERS_URL}/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ is_active: newStatus })
            });

            if (response.ok) {
                showMessage(`用户${action}成功`, 'success');
                
                // 更新当前详情数据
                if (currentUserDetail) {
                    currentUserDetail.is_active = newStatus;
                    populateUserDetailModal(currentUserDetail);
                }
                
                // 刷新用户列表
                loadUsers(currentPage, currentSearch);
            } else {
                const result = await response.json();
                showMessage(result.error || `用户${action}失败`, 'error');
            }
        } catch (error) {
            console.error(`${action}用户失败:`, error);
            showMessage(`${action}用户失败`, 'error');
        }
    };

    window.resetUserPassword = async function() {
        if (!currentUserDetail) return;
        
        if (!confirm(`确定要重置用户 ${currentUserDetail.username} 的密码吗？`)) {
            return;
        }

        try {
            // 这里需要后端支持密码重置API
            const response = await fetch(`${API_BASE_URL}/admin/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ user_id: currentUserDetail.user_id })
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(`密码重置成功，新密码：${result.new_password}`, 'success');
            } else {
                const result = await response.json();
                showMessage(result.error || '密码重置失败', 'error');
            }
        } catch (error) {
            console.error('密码重置失败:', error);
            showMessage('密码重置失败', 'error');
        }
    };
});

// 全局函数
function goToHomePage() {
    window.location.href = 'index.html';
}
