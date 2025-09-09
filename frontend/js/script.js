// 全局变量
let currentUser = null; // 当前用户信息

// 等待整个HTML文档加载完成后再执行脚本
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面上的主要元素
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const completeEssayButton = document.getElementById('completeEssayButton');
    const essayModal = document.getElementById('essayModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const completedEssayBody = document.getElementById('completedEssayBody');
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const modalTitleElement = essayModal.querySelector('.modal-header h2'); // 获取模态框标题元素
    const userInfo = document.getElementById('userInfo');

    // 侧边栏折叠相关元素
    const toggleSidebarsButton = document.getElementById('toggleSidebars');
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const mainContentArea = document.getElementById('mainContentArea');

    // 使用统一配置
    const API_BASE_URL = CONFIG.API.BASE_URL;
    const CHAT_API_URL = CONFIG.API.ENDPOINTS.CHAT;
    const COMPLETE_ESSAY_API_URL = CONFIG.API.ENDPOINTS.COMPLETE_ESSAY;
    const USER_PROFILE_URL = CONFIG.API.ENDPOINTS.USER_PROFILE;

    let conversationHistory = [];
    let currentEssayTitle = "我的作文"; // 用于PDF的默认标题
    let sidebarCollapsed = false; // 侧边栏折叠状态

    // 导航栏相关函数
    function initNavigation() {
        // 获取导航栏元素
        const guestNav = document.getElementById('guestNav');
        const userNav = document.getElementById('userNav');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const adminBtn = document.getElementById('adminBtn');
        const userAdminBtn = document.getElementById('userAdminBtn');
        const userDropdown = document.getElementById('userDropdown');
        const userBtn = document.getElementById('userBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const logoutBtn = document.getElementById('logoutBtn');

        // 绑定事件
        if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
        if (registerBtn) registerBtn.addEventListener('click', showRegisterModal);
        if (adminBtn) adminBtn.addEventListener('click', () => window.location.href = 'admin-login.html');
        if (userAdminBtn) userAdminBtn.addEventListener('click', () => window.location.href = 'admin-login.html');
        if (userBtn) userBtn.addEventListener('click', toggleUserDropdown);
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        // 绑定下拉菜单选项
        const redeemBtn = document.getElementById('redeemBtn');
        const purchaseBtn = document.getElementById('purchaseBtn');
        const usageHistoryBtn = document.getElementById('usageHistoryBtn');
        const changePasswordBtn = document.getElementById('changePasswordBtn');

        if (redeemBtn) redeemBtn.addEventListener('click', showRedeemModal);
        if (purchaseBtn) purchaseBtn.addEventListener('click', showPurchaseModal);
        if (usageHistoryBtn) usageHistoryBtn.addEventListener('click', showUsageHistoryModal);
        if (changePasswordBtn) changePasswordBtn.addEventListener('click', showChangePasswordModal);

        // 点击外部关闭下拉菜单
        document.addEventListener('click', (event) => {
            if (userDropdown && !userDropdown.contains(event.target)) {
                closeUserDropdown();
            }
        });

        // 初始化显示状态
        updateNavigationDisplay();
    }

    function toggleUserDropdown() {
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.classList.toggle('active');
        }
    }

    // 模态框显示函数
    function showLoginModal() {
        const loginForm = `
            <form id="loginForm" class="auth-form">
                <div class="form-group">
                    <label for="loginEmail">用户名或邮箱</label>
                    <input type="text" id="loginEmail" name="email" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">密码</label>
                    <input type="password" id="loginPassword" name="password" required>
                </div>
            </form>
        `;
        
        const footer = `
            <button type="button" class="action-button" onclick="handleLogin()">登录</button>
            <p class="auth-switch">
                还没有账号？<a href="#" onclick="showRegisterModal()">立即注册</a>
            </p>
        `;

        universalModal.show({
            title: '用户登录',
            body: loginForm,
            footer: footer,
            bodyClass: 'auth-modal-body',
            size: 'small'
        });
    }

    function showRegisterModal() {
        const registerForm = `
            <form id="registerForm" class="auth-form">
                <div class="form-group">
                    <label for="registerUsername">用户名</label>
                    <input type="text" id="registerUsername" name="username" required>
                </div>
                <div class="form-group">
                    <label for="registerEmail">邮箱</label>
                    <input type="email" id="registerEmail" name="email" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">密码</label>
                    <input type="password" id="registerPassword" name="password" required>
                </div>
            </form>
        `;
        
        const footer = `
            <button type="button" class="action-button" onclick="handleRegister()">注册</button>
            <p class="auth-switch">
                已有账号？<a href="#" onclick="showLoginModal()">立即登录</a>
            </p>
        `;

        universalModal.show({
            title: '用户注册',
            body: registerForm,
            footer: footer,
            bodyClass: 'auth-modal-body',
            size: 'small'
        });
    }

    // 登录处理函数
    window.handleLogin = async function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            alert('请填写完整信息');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_info', JSON.stringify(data.user));
                
                // 关闭模态框
                universalModal.hide();
                
                // 更新导航栏显示
                updateNavigationDisplay();
                
                alert('登录成功！');
            } else {
                const error = await response.json();
                alert(error.message || '登录失败，请检查用户名和密码');
            }
        } catch (error) {
            console.error('登录错误:', error);
            alert('登录过程中出现错误，请稍后重试');
        }
    };

    // 注册处理函数
    window.handleRegister = async function() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        if (!username || !email || !password) {
            alert('请填写完整信息');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });

            if (response.ok) {
                alert('注册成功！请登录');
                showLoginModal();
            } else {
                const error = await response.json();
                alert(error.message || '注册失败');
            }
        } catch (error) {
            console.error('注册错误:', error);
            alert('注册过程中出现错误，请稍后重试');
        }
    };

    function showRedeemModal() {
        const redeemForm = `
            <div class="redeem-modal-content">
                <h3>兑换积分</h3>
                <p class="section-description">请输入16位兑换码来获取积分</p>
                
                <form id="redeemModalForm" class="modal-form">
                    <div class="form-group">
                        <label for="modalRedeemCode">兑换码</label>
                        <input type="text" id="modalRedeemCode" placeholder="请输入16位兑换码" maxlength="16" required>
                        <small>兑换码格式：XXXX-XXXX-XXXX-XXXX</small>
                    </div>
                </form>
            </div>
        `;
        
        const footer = `
            <button type="button" class="action-button" onclick="handleRedeem()">兑换</button>
            <button type="button" class="action-button secondary" onclick="universalModal.hide()">取消</button>
        `;

        universalModal.show({
            title: '兑换积分',
            body: redeemForm,
            footer: footer,
            bodyClass: 'redeem-modal-body',
            size: 'small'
        });
        
        closeUserDropdown();
    }

    function showPurchaseModal() {
        const purchaseInfo = `
            <div class="purchase-modal-content">
                <div class="price-section">
                    <h3>💰 积分价格</h3>
                    <p>按照1元=5积分的比例</p>
                    
                    <div class="price-cards-compact">
                        <div class="price-card-compact">
                            <div class="price">¥5</div>
                            <div class="credits">25积分</div>
                        </div>
                        <div class="price-card-compact popular">
                            <div class="price">¥10</div>
                            <div class="credits">50积分</div>
                            <span class="badge">推荐</span>
                        </div>
                        <div class="price-card-compact">
                            <div class="price">¥20</div>
                            <div class="credits">100积分</div>
                        </div>
                        <div class="price-card-compact">
                            <div class="price">¥50</div>
                            <div class="credits">250积分</div>
                        </div>
                    </div>
                </div>
                
                <div class="purchase-methods-compact">
                    <h4>🛒 购买方式</h4>
                    <div class="method-item">
                        <div class="method-icon">🎫</div>
                        <div class="method-info">
                            <strong>兑换码购买</strong>
                            <p>联系管理员获取兑换码</p>
                        </div>
                    </div>
                    <div class="method-item">
                        <div class="method-icon">💬</div>
                        <div class="method-info">
                            <strong>联系客服</strong>
                            <p>QQ: 123456789</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const footer = `
            <button type="button" class="action-button" onclick="contactSupport()">联系客服</button>
            <button type="button" class="action-button secondary" onclick="universalModal.hide()">关闭</button>
        `;

        universalModal.show({
            title: '购买积分',
            body: purchaseInfo,
            footer: footer,
            bodyClass: 'purchase-modal-body',
            size: 'medium'
        });
        
        closeUserDropdown();
    }

    function showUsageHistoryModal() {
        const historyContent = `
            <div class="history-modal-content">
                <div class="history-tabs">
                    <button class="tab-btn active" data-tab="usage" onclick="switchHistoryTab('usage')">使用记录</button>
                    <button class="tab-btn" data-tab="redemption" onclick="switchHistoryTab('redemption')">兑换记录</button>
                </div>
                
                <div class="tab-content">
                    <div class="tab-pane active" id="modalUsageTab">
                        <div class="history-list" id="modalUsageHistory">
                            <div class="loading">加载中...</div>
                        </div>
                    </div>
                    
                    <div class="tab-pane" id="modalRedemptionTab">
                        <div class="history-list" id="modalRedemptionHistory">
                            <div class="loading">加载中...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const footer = `
            <button type="button" class="action-button secondary" onclick="universalModal.hide()">关闭</button>
        `;

        universalModal.show({
            title: '使用记录',
            body: historyContent,
            footer: footer,
            bodyClass: 'history-modal-body',
            size: 'large'
        });
        
        // 加载使用记录数据
        loadModalUsageHistory();
        closeUserDropdown();
    }

    function showChangePasswordModal() {
        const passwordForm = `
            <div class="password-modal-content">
                <p class="section-description">请输入当前密码和新密码</p>
                
                <form id="changePasswordForm" class="modal-form">
                    <div class="form-group">
                        <label for="currentPassword">当前密码</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">新密码</label>
                        <input type="password" id="newPassword" name="newPassword" required>
                        <small>至少6位，包含字母和数字</small>
                    </div>
                    <div class="form-group">
                        <label for="confirmNewPassword">确认新密码</label>
                        <input type="password" id="confirmNewPassword" name="confirmNewPassword" required>
                    </div>
                </form>
            </div>
        `;
        
        const footer = `
            <button type="button" class="action-button" onclick="handleChangePassword()">修改密码</button>
            <button type="button" class="action-button secondary" onclick="universalModal.hide()">取消</button>
        `;

        universalModal.show({
            title: '修改密码',
            body: passwordForm,
            footer: footer,
            bodyClass: 'password-modal-body',
            size: 'small'
        });
        
        closeUserDropdown();
    }

    // 检查登录状态并初始化用户信息
    async function initializeAuth() {
        try {
            if (isLoggedIn()) {
                const user = await fetchUserProfile();
                if (!user) {
                    // API错误时不立即跳转，显示错误提示并启用游客模式
                    showApiErrorMessage();
                    enableGuestMode();
                    return false;
                }
                // 用户认证成功，更新UI
                updateUserInterface(user);
                return true;
            } else {
                // 未登录，启用游客模式
                enableGuestMode();
                return false;
            }
        } catch (error) {
            console.error('认证检查失败:', error);
            showApiErrorMessage();
            enableGuestMode();
            return false;
        }
    }

    // 显示API错误消息
    function showApiErrorMessage() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'api-error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <div class="error-text">
                    <strong>服务连接异常</strong>
                    <p>服务器暂时不可用，部分功能受限。您仍可以浏览基本内容。</p>
                    <button onclick="location.reload()" class="retry-btn">重试连接</button>
                </div>
            </div>
        `;
        
        // 插入到页面顶部
        const body = document.body;
        if (body.firstChild) {
            body.insertBefore(errorDiv, body.firstChild);
        } else {
            body.appendChild(errorDiv);
        }
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    // 启用游客模式
    function enableGuestMode() {
        console.log('启用游客模式');
        currentUser = null;
        updateNavigationDisplay();
        
        // 禁用需要登录的功能
        const loginRequiredElements = document.querySelectorAll('.login-required');
        loginRequiredElements.forEach(element => {
            element.style.opacity = '0.5';
            element.style.pointerEvents = 'none';
            element.title = '此功能需要登录';
        });
    }

    // 更新用户界面
    function updateUserInterface(user) {
        currentUser = user;
        updateNavigationDisplay();
        
        // 启用所有功能
        const loginRequiredElements = document.querySelectorAll('.login-required');
        loginRequiredElements.forEach(element => {
            element.style.opacity = '';
            element.style.pointerEvents = '';
            element.title = '';
        });
    }

    // 全局函数 - 从旧代码迁移，供HTML onclick使用
    window.showRedeemSection = function(event) {
        event.preventDefault();
        closeUserDropdown();
        showRedeemModal();
    };

    window.showPurchaseInfo = function(event) {
        event.preventDefault();
        closeUserDropdown();
        showPurchaseModal();
    };

    window.showUsageHistory = function(event) {
        event.preventDefault();
        closeUserDropdown();
        showUsageHistoryModal();
    };

    window.showChangePassword = function(event) {
        event.preventDefault();
        closeUserDropdown();
        showChangePasswordModal();
    };

    window.toggleUserDropdown = function(event) {
        event.preventDefault();
        event.stopPropagation();
        toggleUserDropdown();
    };

    // 通用模态框组件
    class UniversalModal {
        constructor() {
            this.modal = document.getElementById('universalModal');
            this.title = document.getElementById('universalModalTitle');
            this.body = document.getElementById('universalModalBody');
            this.footer = document.getElementById('universalModalFooter');
            this.closeButton = document.getElementById('universalModalClose');
            
            this.init();
        }

        init() {
            // 关闭按钮事件
            if (this.closeButton) {
                this.closeButton.addEventListener('click', () => this.hide());
            }

            // 点击背景关闭
            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) {
                        this.hide();
                    }
                });
            }

            // ESC键关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) {
                    this.hide();
                }
            });
        }

        show(config) {
            const {
                title = '标题',
                body = '',
                footer = '',
                bodyClass = '',
                size = 'medium' // small, medium, large
            } = config;

            // 设置标题
            if (this.title) {
                this.title.textContent = title;
            }

            // 设置内容
            if (this.body) {
                this.body.innerHTML = body;
                this.body.className = `modal-body ${bodyClass}`;
            }

            // 设置底部
            if (this.footer) {
                this.footer.innerHTML = footer;
            }

            // 设置尺寸
            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.className = `modal-content modal-${size}`;
            }

            // 显示模态框
            if (this.modal) {
                this.modal.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // 防止背景滚动
            }
        }

        hide() {
            if (this.modal) {
                this.modal.style.display = 'none';
                document.body.style.overflow = ''; // 恢复滚动
            }
        }

        isVisible() {
            return this.modal && this.modal.style.display === 'flex';
        }
    }

    // 创建全局模态框实例
    const universalModal = new UniversalModal();

    // 密码修改模态框
    function showPasswordChangeModal() {
        const modalHTML = `
            <div class="modal" id="passwordModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>修改密码</h2>
                        <button class="close-button" onclick="closePasswordModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="passwordChangeForm">
                            <div class="form-group">
                                <label for="currentPasswordInput">当前密码</label>
                                <input type="password" id="currentPasswordInput" required>
                            </div>
                            <div class="form-group">
                                <label for="newPasswordInput">新密码</label>
                                <input type="password" id="newPasswordInput" required>
                            </div>
                            <div class="form-group">
                                <label for="confirmPasswordInput">确认新密码</label>
                                <input type="password" id="confirmPasswordInput" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="action-button" onclick="closePasswordModal()">取消</button>
                        <button type="button" class="action-button" onclick="submitPasswordChange()">确认修改</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('passwordModal').style.display = 'block';
    }

    function closePasswordModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.remove();
        }
    }

    async function submitPasswordChange() {
        const currentPassword = document.getElementById('currentPasswordInput').value;
        const newPassword = document.getElementById('newPasswordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage('请填写所有字段', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('新密码和确认密码不匹配', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('新密码至少需要6位', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/user/change-password`, {
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
                closePasswordModal();
            } else {
                showMessage(result.error || '密码修改失败', 'error');
            }
        } catch (error) {
            console.error('密码修改失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        }
    }

    // 消息提示功能
    function showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer') || createMessageContainer();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        messageContainer.appendChild(messageDiv);

        // 3秒后自动移除消息
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    function createMessageContainer() {
        const container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    // 使函数全局可用
    window.logout = logout;
    window.toggleUserDropdown = toggleUserDropdown;
    window.showRedeemSection = showRedeemSection;
    window.showPurchaseInfo = showPurchaseInfo;
    window.showUsageHistory = showUsageHistory;
    window.showChangePassword = showChangePassword;
    window.closePasswordModal = closePasswordModal;
    window.submitPasswordChange = submitPasswordChange;
    window.showMessage = showMessage;

    // --- 侧边栏折叠功能 ---
    function toggleSidebars() {
        sidebarCollapsed = !sidebarCollapsed;

        if (sidebarCollapsed) {
            leftSidebar.classList.add('collapsed');
            rightSidebar.classList.add('collapsed');
            toggleSidebarsButton.classList.add('collapsed');
            toggleSidebarsButton.title = '展开侧边栏';
        } else {
            leftSidebar.classList.remove('collapsed');
            rightSidebar.classList.remove('collapsed');
            toggleSidebarsButton.classList.remove('collapsed');
            toggleSidebarsButton.title = '折叠侧边栏';
        }

        // 保存用户偏好到localStorage
        localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    }

    // 从localStorage恢复侧边栏状态
    function restoreSidebarState() {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebarCollapsed = true;
            leftSidebar.classList.add('collapsed');
            rightSidebar.classList.add('collapsed');
            toggleSidebarsButton.classList.add('collapsed');
            toggleSidebarsButton.title = '展开侧边栏';
        } else {
            toggleSidebarsButton.title = '折叠侧边栏';
        }
    }

    // --- 辅助函数 ---
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'assistant-message');
        const avatarImg = document.createElement('img');
        avatarImg.classList.add('avatar');
        if (sender === 'assistant') {
            avatarImg.src = 'assets/images/mascot.svg';
            avatarImg.alt = '助手头像';
        }
        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('message-content');
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        messageContentDiv.appendChild(paragraph);
        if (sender === 'assistant') {
            messageDiv.appendChild(avatarImg);
        }
        messageDiv.appendChild(messageContentDiv);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTypingIndicator() {
        if (document.getElementById('typingIndicator')) return;
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'assistant-message');
        typingDiv.id = 'typingIndicator';
        const avatarImg = document.createElement('img');
        avatarImg.classList.add('avatar');
        avatarImg.src = 'assets/images/mascot.svg';
        avatarImg.alt = '助手头像';
        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('message-content');
        const paragraph = document.createElement('p');
        paragraph.innerHTML = '正在思考中... <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
        messageContentDiv.appendChild(paragraph);
        typingDiv.appendChild(avatarImg);
        typingDiv.appendChild(messageContentDiv);
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) typingIndicator.remove();
    }

    async function callChatAPI(userMessageText) {
        showTypingIndicator();
        sendButton.disabled = true;
        userInput.disabled = true;

        // 为了确保 conversationHistory 在调用API前包含用户的最新消息
        // 使得如果API调用失败，历史记录也是最新的。
        // 但后端返回的 history 应该已经是完整的了。
        // 我们需要确保不重复添加。
        // 现在的策略是：前端历史只在AI成功回复后用后端返回的完整历史更新。
        const payload = {
            message: userMessageText,
            history: conversationHistory // 发送的是 *不包含* 当前 userMessageText 的历史
        };

        try {
            const token = getAuthToken();
            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });
            removeTypingIndicator();
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `请求失败，状态码: ${response.status}` }));
                throw new Error(errorData.error || `AI服务返回错误，状态: ${response.status}`);
            }
            const data = await response.json();
            if (data.reply) {
                appendMessage(data.reply, 'assistant');

                // 彻底修正历史记录逻辑：
                // 不再依赖后端返回的 history，前端自己维护。
                // 这样可以从根本上解决历史记录不一致或丢失的问题。
                conversationHistory.push({ role: 'user', content: userMessageText });
                conversationHistory.push({ role: 'assistant', content: data.reply });

                // 更新用户积分显示
                if (data.credits_remaining !== undefined && currentUser) {
                    currentUser.credits = data.credits_remaining;
                    updateUserInfo(currentUser);
                }

            } else {
                throw new Error('AI的回复格式不正确，缺少 reply 字段。');
            }
        } catch (error) {
            console.error('调用AI聊天API时出错:', error);
            appendMessage(`抱歉，连接AI助手时遇到问题：${error.message}`, 'assistant');
            // 如果API调用失败，也应该将用户的消息添加到前端历史中，以便下次重试时包含它
            let userMessageExists = conversationHistory.some(msg => msg.role === 'user' && msg.content === userMessageText);
            if (!userMessageExists) { // 避免重复添加
                conversationHistory.push({ role: 'user', content: userMessageText });
            }
            removeTypingIndicator();
        } finally {
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    }

    function handleSendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;
        appendMessage(messageText, 'user');
        // 在调用API之前，就将用户消息加入历史，这样即使API失败，历史也是最新的
        // conversationHistory.push({ role: 'user', content: messageText }); // 移到 callChatAPI 成功回调中或依赖后端返回
        callChatAPI(messageText);
        userInput.value = '';
        userInput.style.height = 'auto';
    }

    /**
     * 从作文文本中提取标题并移除标题行
     * @param {string} essayText - 完整的作文文本
     * @returns {{title: string, body: string}}
     */
    function extractTitleAndBody(essayText) {
        const lines = essayText.split('\n');
        let title = "生成的作文"; // 默认标题
        let body = essayText;

        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            // 假设标题是以 # 开头，或者就是第一行非空内容
            if (firstLine.startsWith('#')) {
                title = firstLine.replace(/^#+\s*/, '').trim(); // 移除 # 和前导空格
                body = lines.slice(1).join('\n');
            } else if (firstLine.length > 0 && firstLine.length < 50 && lines.length > 1) { // 简单判断第一行是否像标题
                // 这是一个启发式规则，如果第一行较短且不是唯一的行，则认为是标题
                const potentialTitle = firstLine;
                // 检查第二行是否是空行或者不是以#开头（避免误判正文第一句为标题）
                if (lines.length > 1 && (lines[1].trim() === '' || !lines[1].trim().startsWith('#'))) {
                     // 进一步检查标题是否在对话中被提及，这比较复杂，暂时简化
                     // 假设AI生成的作文，如果包含标题，会放在第一行
                     title = potentialTitle;
                     body = lines.slice(1).join('\n');
                }
            }
        }
        currentEssayTitle = title; // 更新全局的作文标题，供PDF使用
        return { title, body };
    }


    async function handleCompleteEssay() {
        console.log("当前对话历史 (点击完成作文时):", JSON.stringify(conversationHistory));
        if (conversationHistory.length === 0 || !conversationHistory.some(msg => msg.role === 'user')) {
            alert("还没有有效的用户对话内容，无法生成作文哦！先和AI聊聊你的想法吧。");
            return;
        }

        const originalButtonText = completeEssayButton.textContent;
        completeEssayButton.textContent = '正在生成作文...';
        completeEssayButton.disabled = true;

        try {
            const token = getAuthToken();
            const response = await fetch(COMPLETE_ESSAY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ history: conversationHistory }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `请求失败，状态码: ${response.status}` }));
                throw new Error(errorData.error || `AI生成作文失败，状态: ${response.status}`);
            }
            const data = await response.json();
            if (data.completed_essay) {
                const { title, body } = extractTitleAndBody(data.completed_essay);
                if(modalTitleElement) modalTitleElement.textContent = title; // 设置模态框标题
                completedEssayBody.innerHTML = body.replace(/\n/g, '<br>');

                // 更新用户积分显示
                if (data.credits_remaining !== undefined && currentUser) {
                    currentUser.credits = data.credits_remaining;
                    updateUserInfo(currentUser);
                }

                openModal();
            } else {
                throw new Error('AI返回的作文内容格式不正确。');
            }
        } catch (error) {
            console.error('生成完整作文时出错:', error);
            alert(`生成作文失败：${error.message}`);
        } finally {
            completeEssayButton.textContent = originalButtonText;
            completeEssayButton.disabled = false;
        }
    }

    function openModal() {
        if(essayModal) essayModal.style.display = 'block';
        if(downloadPdfButton) { // 重置PDF按钮状态
            downloadPdfButton.textContent = '下载PDF';
            downloadPdfButton.disabled = false;
        }
    }
    function closeModal() {
        if(essayModal) essayModal.style.display = 'none';
        if(completedEssayBody) completedEssayBody.innerHTML = '';
    }

    async function downloadEssayAsPDF() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            alert("PDF生成库 (jsPDF) 未加载。"); return;
        }
        if (typeof window.html2canvas === 'undefined') {
            alert("PDF生成库 (html2canvas) 未加载。"); return;
        }

        const { jsPDF } = window.jspdf;
        const essayContentElementToCapture = completedEssayBody; // 我们要截图的HTML元素
        
        // 创建一个新的div来渲染作文内容，包含标题，用于截图
        const printableArea = document.createElement('div');
        printableArea.style.padding = '20px'; // 给截图内容一些内边距
        printableArea.style.backgroundColor = '#ffffff'; // 确保背景是白色
        printableArea.style.width = '210mm'; // A4宽度模拟
        printableArea.style.boxSizing = 'border-box';


        const titleElementForPdf = document.createElement('h1');
        titleElementForPdf.textContent = currentEssayTitle; // 使用处理过的标题
        titleElementForPdf.style.textAlign = 'center';
        titleElementForPdf.style.fontSize = '18pt';
        titleElementForPdf.style.marginBottom = '20px';
        titleElementForPdf.style.fontFamily = 'Kaiti, STKaiti, sans-serif'; // 尝试指定楷体

        printableArea.appendChild(titleElementForPdf);
        
        // 将 completedEssayBody 的内容（已经是处理过换行的HTML）复制过来
        // completedEssayBody.innerHTML 是 <br> 分隔的，html2canvas 会处理
        const bodyContentForPdf = document.createElement('div');
        bodyContentForPdf.innerHTML = completedEssayBody.innerHTML; // 获取的是带<br>的HTML
        bodyContentForPdf.style.fontSize = '12pt';
        bodyContentForPdf.style.lineHeight = '1.6';
        bodyContentForPdf.style.fontFamily = 'Noto Sans SC, sans-serif'; // 正文字体

        printableArea.appendChild(bodyContentForPdf);

        // 临时将这个可打印区域添加到DOM中（但设为不可见），以便html2canvas可以渲染它
        printableArea.style.position = 'absolute';
        printableArea.style.left = '-9999px';
        document.body.appendChild(printableArea);


        if (!printableArea || printableArea.innerText.trim() === '') {
            alert("没有作文内容可以下载。");
            document.body.removeChild(printableArea);
            return;
        }
        
        const originalButtonText = downloadPdfButton.textContent;
        downloadPdfButton.textContent = '正在生成PDF...';
        downloadPdfButton.disabled = true;

        try {
            const canvas = await html2canvas(printableArea, { // 截图新创建的printableArea
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: printableArea.scrollWidth, // 使用元素的实际宽度
                windowHeight: printableArea.scrollHeight // 使用元素的实际高度
            });
            
            document.body.removeChild(printableArea); // 截图完成后移除临时元素

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            // const pdfHeight = pdf.internal.pageSize.getHeight(); // PDF页面高度
            const imgProps = pdf.getImageProperties(imgData);
            
            // 计算图片在PDF中的尺寸，保持宽高比，并适应页面宽度（留出边距）
            const margin = 40; // pt
            const usablePdfWidth = pdfWidth - 2 * margin;
            const imgFinalWidth = usablePdfWidth;
            const imgFinalHeight = (imgProps.height * imgFinalWidth) / imgProps.width;
            
            let currentYPos = margin; // 初始Y轴位置 (上边距)
            let heightLeft = imgFinalHeight;

            // 添加第一页
            pdf.addImage(imgData, 'PNG', margin, currentYPos, imgFinalWidth, imgFinalHeight);
            heightLeft -= (pdf.internal.pageSize.getHeight() - currentYPos - margin); // 减去当前页可用于图片的高度

            // 如果图片高度超过一页，则添加新页
            while (heightLeft > 0) {
                currentYPos = -(pdf.internal.pageSize.getHeight() - 2 * margin) * (Math.ceil(imgFinalHeight / (pdf.internal.pageSize.getHeight() - 2 * margin)) - Math.ceil(heightLeft / (pdf.internal.pageSize.getHeight() - 2 * margin))) + margin ;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, currentYPos, imgFinalWidth, imgFinalHeight);
                heightLeft -= (pdf.internal.pageSize.getHeight() - 2* margin);
            }
            
            pdf.save(`${currentEssayTitle}.pdf`);

        } catch (error) {
            console.error("生成PDF失败:", error);
            alert("生成PDF失败: " + error.message);
            if (document.body.contains(printableArea)) { // 确保移除
                document.body.removeChild(printableArea);
            }
        } finally {
            downloadPdfButton.textContent = originalButtonText;
            downloadPdfButton.disabled = false;
        }
    }

    if (sendButton) sendButton.addEventListener('click', handleSendMessage);
    if (userInput) {
        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); handleSendMessage();
            }
        });
        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            let newHeight = userInput.scrollHeight;
            const maxHeight = parseInt(getComputedStyle(userInput).maxHeight, 10) || 120;
            if (newHeight > maxHeight) newHeight = maxHeight;
            userInput.style.height = newHeight + 'px';
        });
        userInput.focus();
    }

    if (completeEssayButton) completeEssayButton.addEventListener('click', handleCompleteEssay);
    if (closeModalButton) closeModalButton.addEventListener('click', closeModal);
    if (downloadPdfButton) downloadPdfButton.addEventListener('click', downloadEssayAsPDF);

    // 侧边栏折叠按钮事件监听
    if (toggleSidebarsButton) toggleSidebarsButton.addEventListener('click', toggleSidebars);

    // 页面加载时恢复侧边栏状态
    restoreSidebarState();

    window.addEventListener('click', (event) => {
        if (event.target === essayModal) closeModal();
    });
    
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .typing-dots span { opacity: 0; animation: typing-dot 1s infinite; }
        .typing-dots span:nth-child(1) { animation-delay: 0s; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-dot { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
    `;
    document.head.appendChild(styleSheet);

    // 初始化用户认证和导航栏
    initializeAuth();
    initNavigation();
});

// 全局函数，移出DOMContentLoaded作用域
function getAuthToken() {
    return localStorage.getItem('access_token');
}

function isLoggedIn() {
    return !!getAuthToken();
}

function logout(event) {
    if (event) {
        event.preventDefault();
        closeUserDropdown();
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    window.location.href = 'auth.html';
}

async function fetchUserProfile() {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const response = await fetch(CONFIG.API.ENDPOINTS.USER_PROFILE, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else if (response.status === 401) {
            // Token过期，清除本地存储并跳转到登录页
            logout();
            return null;
        }
    } catch (error) {
        console.error('获取用户资料失败:', error);
    }
    return null;
}

function closeUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.remove('active');
    }
}

function updateNavigationDisplay() {
    const guestNav = document.getElementById('guestNav');
    const userNav = document.getElementById('userNav');

    if (isLoggedIn() && currentUser) {
        // 显示用户导航栏
        if (guestNav) guestNav.style.display = 'none';
        if (userNav) userNav.style.display = 'flex';
        updateUserInfoDisplay(currentUser);
    } else {
        // 显示访客导航栏
        if (guestNav) guestNav.style.display = 'flex';
        if (userNav) userNav.style.display = 'none';
    }
}

function updateUserInfoDisplay(user) {
    if (!user) return;
    
    // 更新用户名显示
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.textContent = user.username || '用户';
    }

    // 更新积分显示
    const creditsText = document.querySelector('.credits-text');
    if (creditsText) {
        creditsText.textContent = `${user.credits || 0}积分`;
    }
    
    console.log('用户信息已更新:', { username: user.username, credits: user.credits });
}

// 保持向后兼容的updateUserInfo函数
async function updateUserInfo() {
    if (currentUser) {
        updateUserInfoDisplay(currentUser);
    } else {
        const user = await fetchUserProfile();
        if (user) {
            currentUser = user;
            updateUserInfoDisplay(user);
        }
    }
}

// 模态框处理函数
window.handleRedeem = async function() {
    const redeemCode = document.getElementById('modalRedeemCode').value;
    
    if (!redeemCode || redeemCode.length !== 16) {
        alert('请输入正确的16位兑换码');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API.BASE_URL}/redeem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                redemption_code: redeemCode
            })
        });

        if (response.ok) {
            const data = await response.json();
            alert(`兑换成功！获得${data.credits}积分`);
            universalModal.hide();
            updateNavigationDisplay(); // 刷新积分显示
        } else {
            const error = await response.json();
            alert(error.message || '兑换失败');
        }
    } catch (error) {
        console.error('兑换错误:', error);
        alert('兑换过程中出现错误，请稍后重试');
    }
};

window.handleChangePassword = async function() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('请填写完整信息');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('两次输入的新密码不一致');
        return;
    }

    if (newPassword.length < 6) {
        alert('新密码至少需要6位');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API.BASE_URL}/user/change-password`, {
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

        if (response.ok) {
            alert('密码修改成功！');
            universalModal.hide();
        } else {
            const error = await response.json();
            alert(error.message || '密码修改失败');
        }
    } catch (error) {
        console.error('修改密码错误:', error);
        alert('修改密码过程中出现错误，请稍后重试');
    }
};

window.contactSupport = function() {
    alert('请联系客服QQ: 123456789 或邮箱: support@example.com');
};

window.switchHistoryTab = function(tabType) {
    // 切换标签样式
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');
    
    // 切换内容显示
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    const targetPane = tabType === 'usage' ? 'modalUsageTab' : 'modalRedemptionTab';
    document.getElementById(targetPane).classList.add('active');
    
    // 加载对应数据
    if (tabType === 'usage') {
        loadModalUsageHistory();
    } else {
        loadModalRedemptionHistory();
    }
};

async function loadModalUsageHistory() {
    const historyContainer = document.getElementById('modalUsageHistory');
    if (!historyContainer) return;

    try {
        const response = await fetch(`${CONFIG.API.BASE_URL}/user/usage-history`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.usage_history && data.usage_history.length > 0) {
                historyContainer.innerHTML = data.usage_history.map(item => `
                    <div class="history-item">
                        <div class="history-info">
                            <strong>${item.description}</strong>
                            <span class="history-date">${new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <div class="history-credits">-${item.credits_used}积分</div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<div class="no-data">暂无使用记录</div>';
            }
        } else {
            historyContainer.innerHTML = '<div class="error">加载失败</div>';
        }
    } catch (error) {
        console.error('加载使用记录失败:', error);
        historyContainer.innerHTML = '<div class="error">加载失败</div>';
    }
}

async function loadModalRedemptionHistory() {
    const historyContainer = document.getElementById('modalRedemptionHistory');
    if (!historyContainer) return;

    try {
        const response = await fetch(`${CONFIG.API.BASE_URL}/user/redemption-history`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.redemption_history && data.redemption_history.length > 0) {
                historyContainer.innerHTML = data.redemption_history.map(item => `
                    <div class="history-item">
                        <div class="history-info">
                            <strong>兑换码: ${item.redemption_code}</strong>
                            <span class="history-date">${new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <div class="history-credits">+${item.credits}积分</div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<div class="no-data">暂无兑换记录</div>';
            }
        } else {
            historyContainer.innerHTML = '<div class="error">加载失败</div>';
        }
    } catch (error) {
        console.error('加载兑换记录失败:', error);
        historyContainer.innerHTML = '<div class="error">加载失败</div>';
    }
}
