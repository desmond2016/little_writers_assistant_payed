// 管理员登录页面JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面元素
    const adminLoginForm = document.getElementById('adminLoginForm');
    const messageContainer = document.getElementById('messageContainer');
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');

    // API URLs
    const API_BASE_URL = CONFIG.API.BASE_URL;
    const LOGIN_URL = `${API_BASE_URL}/login`;

    // 调试信息
    console.log('🔐 管理员登录页面配置:', {
        apiBaseUrl: API_BASE_URL,
        loginUrl: LOGIN_URL,
        hostname: window.location.hostname
    });

    // 显示消息
    function showMessage(message, type = 'info') {
        clearMessages();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageContainer.appendChild(messageDiv);
        
        // 3秒后自动清除成功消息
        if (type === 'success') {
            setTimeout(clearMessages, 3000);
        }
    }

    // 清除消息
    function clearMessages() {
        messageContainer.innerHTML = '';
    }

    // 验证管理员登录表单
    function validateAdminForm(username, password) {
        if (!username || !password) {
            showMessage('请填写用户名和密码', 'error');
            return false;
        }

        if (username.trim().length < 3) {
            showMessage('用户名至少需要3位字符', 'error');
            return false;
        }

        if (password.length < 6) {
            showMessage('密码至少需要6位字符', 'error');
            return false;
        }

        return true;
    }

    // 检查用户是否为管理员
    function isAdminUser(userData) {
        return userData && userData.username === 'admin';
    }

    // 处理管理员登录
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(adminLoginForm);
        const username = formData.get('username').trim();
        const password = formData.get('password');

        // 前端验证
        if (!validateAdminForm(username, password)) {
            return;
        }

        // 获取提交按钮
        const submitButton = adminLoginForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        // 禁用按钮并显示加载状态
        submitButton.disabled = true;
        submitButton.textContent = '登录中...';
        clearMessages();

        try {
            const response = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // 检查是否为管理员用户
                if (!isAdminUser(data.user)) {
                    showMessage('权限不足，只有管理员可以访问此页面', 'error');
                    return;
                }

                // 登录成功，保存token和用户信息
                // 管理员使用专门的token存储
                localStorage.setItem('admin_token', data.access_token);
                localStorage.setItem('admin_info', JSON.stringify(data.user));
                
                showMessage('管理员登录成功！正在跳转...', 'success');
                
                // 2秒后跳转到管理员后台
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 2000);
            } else {
                // 登录失败
                showMessage(data.error || '登录失败，请检查用户名和密码', 'error');
            }
        } catch (error) {
            console.error('管理员登录请求失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });

    // 检查是否已经登录且为管理员
    function checkExistingLogin() {
        const token = localStorage.getItem('access_token');
        const userInfo = localStorage.getItem('user_info');
        
        if (token && userInfo) {
            try {
                const userData = JSON.parse(userInfo);
                if (isAdminUser(userData)) {
                    // 已登录且为管理员，直接跳转到管理后台
                    window.location.href = 'admin.html';
                    return;
                }
            } catch (error) {
                console.error('解析用户信息失败:', error);
                // 清除无效的登录信息
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
            }
        }
    }

    // 页面加载时检查现有登录状态
    checkExistingLogin();

    // 添加键盘事件监听
    document.addEventListener('keydown', (e) => {
        // 按 Enter 键提交表单
        if (e.key === 'Enter' && (usernameInput === document.activeElement || passwordInput === document.activeElement)) {
            e.preventDefault();
            adminLoginForm.dispatchEvent(new Event('submit'));
        }
    });

    // 自动聚焦到用户名输入框
    if (usernameInput) {
        usernameInput.focus();
    }

    // 添加输入框的实时验证反馈
    usernameInput.addEventListener('input', () => {
        const username = usernameInput.value.trim();
        if (username.length > 0 && username.length < 3) {
            usernameInput.style.borderColor = '#e74c3c';
        } else {
            usernameInput.style.borderColor = '#ecf0f1';
        }
    });

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        if (password.length > 0 && password.length < 6) {
            passwordInput.style.borderColor = '#e74c3c';
        } else {
            passwordInput.style.borderColor = '#ecf0f1';
        }
    });

    // 清除错误状态当用户开始输入时
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('focus', () => {
            clearMessages();
        });
    });

    console.log('管理员登录页面初始化完成');
});
