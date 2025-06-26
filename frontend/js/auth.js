// 认证页面JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // 获取页面元素
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const registerFormElement = document.getElementById('registerFormElement');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const messageContainer = document.getElementById('messageContainer');

    // API URLs
    const API_BASE_URL = 'https://little-writers-assistant-payed.onrender.com/api';
    const LOGIN_URL = `${API_BASE_URL}/login`;
    const REGISTER_URL = `${API_BASE_URL}/register`;

    // 切换表单显示
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        clearMessages();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        clearMessages();
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

    // 验证密码强度
    function validatePassword(password) {
        if (password.length < 6) {
            return '密码至少需要6位';
        }
        if (!/[a-zA-Z]/.test(password)) {
            return '密码必须包含字母';
        }
        if (!/[0-9]/.test(password)) {
            return '密码必须包含数字';
        }
        return null;
    }

    // 验证用户名
    function validateUsername(username) {
        if (username.length < 3 || username.length > 20) {
            return '用户名长度应为3-20位';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return '用户名只能包含字母、数字和下划线';
        }
        return null;
    }

    // 处理登录
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(loginFormElement);
        const username = formData.get('username').trim();
        const password = formData.get('password');

        if (!username || !password) {
            showMessage('请填写所有字段', 'error');
            return;
        }

        const submitButton = loginFormElement.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '登录中...';

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
                // 登录成功，保存token和用户信息
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_info', JSON.stringify(data.user));
                
                showMessage('登录成功！正在跳转...', 'success');
                
                // 2秒后跳转到主页
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showMessage(data.error || '登录失败', 'error');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '登录';
        }
    });

    // 处理注册
    registerFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(registerFormElement);
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // 前端验证
        if (!username || !email || !password || !confirmPassword) {
            showMessage('请填写所有字段', 'error');
            return;
        }

        const usernameError = validateUsername(username);
        if (usernameError) {
            showMessage(usernameError, 'error');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            showMessage(passwordError, 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('两次输入的密码不一致', 'error');
            return;
        }

        const submitButton = registerFormElement.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '注册中...';

        try {
            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('注册成功！请登录', 'success');
                
                // 清空注册表单
                registerFormElement.reset();
                
                // 2秒后切换到登录表单
                setTimeout(() => {
                    registerForm.classList.remove('active');
                    loginForm.classList.add('active');
                    clearMessages();
                }, 2000);
            } else {
                showMessage(data.error || '注册失败', 'error');
            }
        } catch (error) {
            console.error('注册请求失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '注册';
        }
    });

    // 检查是否已经登录
    const token = localStorage.getItem('access_token');
    if (token) {
        // 已登录，直接跳转到主页
        window.location.href = 'index.html';
    }
});
