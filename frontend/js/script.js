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

    const API_BASE_URL = 'http://127.0.0.1:5001/api';
    const CHAT_API_URL = `${API_BASE_URL}/chat`;
    const COMPLETE_ESSAY_API_URL = `${API_BASE_URL}/complete_essay`;
    const USER_PROFILE_URL = `${API_BASE_URL}/user/profile`;

    let conversationHistory = [];
    let currentEssayTitle = "我的作文"; // 用于PDF的默认标题
    let sidebarCollapsed = false; // 侧边栏折叠状态
    let currentUser = null; // 当前用户信息

    // 用户认证相关函数
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
            const response = await fetch(USER_PROFILE_URL, {
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

    function updateUserInfo(user) {
        currentUser = user;
        if (!user) {
            // 未登录状态
            userInfo.innerHTML = `
                <div class="auth-buttons">
                    <a href="auth.html" class="auth-btn">登录</a>
                    <a href="auth.html" class="auth-btn primary">注册</a>
                    <a href="admin.html" class="auth-btn admin-btn">管理员</a>
                </div>
            `;
        } else {
            // 已登录状态
            const userInitial = user.username.charAt(0).toUpperCase();
            userInfo.innerHTML = `
                <div class="user-profile">
                    <div class="user-dropdown">
                        <div class="user-trigger" onclick="toggleUserDropdown(event)">
                            <div class="user-avatar">${userInitial}</div>
                            <div class="user-info">
                                <div class="user-name">${user.username}</div>
                                <div class="user-credits">${user.credits}积分</div>
                            </div>
                            <span class="dropdown-arrow">▼</span>
                        </div>

                        <div class="dropdown-menu" id="userDropdownMenu">
                            <a href="#" class="dropdown-item" onclick="showRedeemSection(event)">🎫 兑换积分</a>
                            <a href="#" class="dropdown-item" onclick="showPurchaseInfo(event)">🛒 购买积分</a>
                            <a href="#" class="dropdown-item" onclick="showUsageHistory(event)">📊 使用记录</a>
                            <a href="#" class="dropdown-item" onclick="showChangePassword(event)">🔑 修改密码</a>
                            <a href="#" class="dropdown-item" onclick="logout(event)">🚪 退出登录</a>
                        </div>
                    </div>
                    <a href="admin.html" class="admin-btn" title="管理员后台">管理员</a>
                </div>
            `;
        }
    }

    // 检查登录状态并初始化用户信息
    async function initializeAuth() {
        if (isLoggedIn()) {
            const user = await fetchUserProfile();
            updateUserInfo(user);
            if (!user) {
                // 如果获取用户信息失败，跳转到登录页
                window.location.href = 'auth.html';
                return false;
            }
        } else {
            updateUserInfo(null);
            // 未登录，跳转到登录页
            window.location.href = 'auth.html';
            return false;
        }
        return true;
    }

    // 下拉菜单功能
    function toggleUserDropdown(event) {
        event.preventDefault();
        event.stopPropagation();

        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }

    function closeUserDropdown() {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }

    // 点击外部区域关闭下拉菜单
    document.addEventListener('click', (event) => {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            closeUserDropdown();
        }
    });

    // 兑换积分功能
    function showRedeemSection(event) {
        event.preventDefault();
        closeUserDropdown();
        window.location.href = 'profile.html?action=redeem';
    }

    // 购买积分功能
    function showPurchaseInfo(event) {
        event.preventDefault();
        closeUserDropdown();
        window.location.href = 'purchase.html';
    }

    // 使用记录功能
    function showUsageHistory(event) {
        event.preventDefault();
        closeUserDropdown();
        window.location.href = 'profile.html?action=history';
    }

    // 修改密码功能
    function showChangePassword(event) {
        event.preventDefault();
        closeUserDropdown();
        showPasswordChangeModal();
    }

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

    // 初始化用户认证
    initializeAuth();
});
