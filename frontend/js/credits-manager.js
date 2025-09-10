/**
 * 全局积分管理器 - 统一积分显示和更新逻辑
 */
class CreditsManager {
    constructor() {
        this.currentCredits = 0;
        this.listeners = [];
        this.isInitialized = false;
    }

    /**
     * 初始化积分管理器
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.refreshCredits();
            this.isInitialized = true;
            console.log('CreditsManager initialized with credits:', this.currentCredits);
        } catch (error) {
            console.error('Failed to initialize CreditsManager:', error);
        }
    }

    /**
     * 从服务器刷新积分信息 - 不使用缓存，确保实时性
     */
    async refreshCredits() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                this.updateCredits(0);
                return;
            }

            // 添加时间戳参数确保不使用缓存
            const timestamp = Date.now();
            const response = await fetch(`${CONFIG.API.ENDPOINTS.USER_PROFILE}?_t=${timestamp}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const credits = data.user?.credits || 0;
                this.updateCredits(credits);
            } else if (response.status === 401) {
                // Token过期，清除本地存储
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
                this.updateCredits(0);
            }
        } catch (error) {
            console.error('Failed to refresh credits:', error);
        }
    }

    /**
     * 更新积分值并通知所有监听器
     * @param {number} newCredits 新的积分值
     */
    updateCredits(newCredits) {
        const oldCredits = this.currentCredits;
        this.currentCredits = newCredits;
        
        console.log(`Credits updated: ${oldCredits} → ${newCredits}`);
        
        // 通知所有监听器
        this.notifyListeners(newCredits, oldCredits);
        
        // 更新本地存储中的用户信息
        this.updateLocalStorage();
    }

    /**
     * 通知所有监听器积分变化
     * @param {number} newCredits 新的积分值
     * @param {number} oldCredits 旧的积分值
     */
    notifyListeners(newCredits, oldCredits) {
        this.listeners.forEach(callback => {
            try {
                callback(newCredits, oldCredits);
            } catch (error) {
                console.error('Error in credits listener:', error);
            }
        });
    }

    /**
     * 添加积分变化监听器
     * @param {Function} callback 回调函数，接收参数 (newCredits, oldCredits)
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            
            // 立即调用一次，提供当前积分值
            if (this.isInitialized) {
                callback(this.currentCredits, this.currentCredits);
            }
        }
    }

    /**
     * 移除积分变化监听器
     * @param {Function} callback 要移除的回调函数
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 获取当前积分
     * @returns {number} 当前积分值
     */
    getCurrentCredits() {
        return this.currentCredits;
    }

    /**
     * 扣除积分（本地预扣，实际扣除由服务器处理）
     * @param {number} amount 扣除数量
     */
    deductCredits(amount) {
        if (amount > 0 && this.currentCredits >= amount) {
            this.updateCredits(this.currentCredits - amount);
        }
    }

    /**
     * 增加积分（本地预加，实际增加由服务器处理）
     * @param {number} amount 增加数量
     */
    addCredits(amount) {
        if (amount > 0) {
            this.updateCredits(this.currentCredits + amount);
        }
    }

    /**
     * 更新本地存储中的用户信息
     */
    updateLocalStorage() {
        try {
            const userInfo = localStorage.getItem('user_info');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                user.credits = this.currentCredits;
                localStorage.setItem('user_info', JSON.stringify(user));
            }
        } catch (error) {
            console.error('Failed to update user info in localStorage:', error);
        }
    }

    /**
     * 处理API响应中的积分信息
     * @param {Object} apiResponse API响应对象
     */
    handleApiResponse(apiResponse) {
        if (apiResponse.credits_remaining !== undefined) {
            this.updateCredits(apiResponse.credits_remaining);
        } else if (apiResponse.user?.credits !== undefined) {
            this.updateCredits(apiResponse.user.credits);
        }
    }

    /**
     * 重置积分管理器
     */
    reset() {
        this.currentCredits = 0;
        this.listeners = [];
        this.isInitialized = false;
    }
}

// 创建全局实例
const creditsManager = new CreditsManager();

// 导出到全局
window.CreditsManager = CreditsManager;
window.creditsManager = creditsManager;

console.log('CreditsManager loaded');