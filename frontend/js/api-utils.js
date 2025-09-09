// frontend/js/api-utils.js
/**
 * API调用工具和重试机制
 * 优化网络请求的可靠性和性能
 */

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试机制的fetch函数
 * @param {string} url - 请求URL
 * @param {object} options - fetch选项
 * @param {number} maxRetries - 最大重试次数
 * @param {number} baseDelay - 基础延迟时间（毫秒）
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // 添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
            
            const fetchOptions = {
                ...options,
                signal: controller.signal
            };
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            // 如果响应成功，直接返回
            if (response.ok) {
                return response;
            }
            
            // 如果是客户端错误（4xx），不重试
            if (response.status >= 400 && response.status < 500) {
                return response;
            }
            
            // 服务器错误（5xx）或网络错误，准备重试
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
        } catch (error) {
            lastError = error;
            
            // 如果是最后一次尝试，抛出错误
            if (attempt === maxRetries) {
                console.error(`API请求失败，已重试${maxRetries}次:`, url, error);
                throw error;
            }
            
            // 计算延迟时间（指数退避）
            const delayTime = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(`API请求失败，${delayTime}ms后重试 (${attempt + 1}/${maxRetries}):`, url, error.message);
            
            await delay(delayTime);
        }
    }
}

/**
 * API调用包装器
 */
class ApiClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * 设置认证token
     */
    setAuthToken(token) {
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
    }

    /**
     * 通用请求方法
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const requestOptions = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        const startTime = Date.now();
        
        try {
            const response = await fetchWithRetry(url, requestOptions);
            const duration = Date.now() - startTime;
            
            // 记录性能
            if (duration > 5000) {
                console.warn(`慢速API调用: ${endpoint} 耗时 ${duration}ms`);
            }
            
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`API调用失败: ${endpoint} 耗时 ${duration}ms`, error);
            throw error;
        }
    }

    /**
     * GET请求
     */
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return this.request(url.pathname + url.search, { method: 'GET' });
    }

    /**
     * POST请求
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT请求
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE请求
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

/**
 * 性能监控工具
 */
const PerformanceMonitor = {
    /**
     * 记录API调用性能
     */
    trackApiCall: (endpoint, startTime, success = true) => {
        const duration = Date.now() - startTime;
        const logData = {
            endpoint,
            duration,
            success,
            timestamp: new Date().toISOString()
        };
        
        // 存储到本地用于分析
        try {
            const logs = JSON.parse(localStorage.getItem('api_performance_logs') || '[]');
            logs.push(logData);
            
            // 只保留最近100条记录
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('api_performance_logs', JSON.stringify(logs));
        } catch (e) {
            console.warn('性能日志存储失败:', e);
        }
        
        // 控制台输出
        if (duration > 3000) {
            console.warn(`慢速API: ${endpoint} - ${duration}ms`);
        } else if (duration > 1000) {
            console.log(`API调用: ${endpoint} - ${duration}ms`);
        }
    },

    /**
     * 获取性能统计
     */
    getStats: () => {
        try {
            const logs = JSON.parse(localStorage.getItem('api_performance_logs') || '[]');
            if (logs.length === 0) return null;

            const durations = logs.map(log => log.duration);
            const successCount = logs.filter(log => log.success).length;
            
            return {
                totalCalls: logs.length,
                successRate: (successCount / logs.length * 100).toFixed(2) + '%',
                avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0) + 'ms',
                maxDuration: Math.max(...durations) + 'ms',
                minDuration: Math.min(...durations) + 'ms'
            };
        } catch (e) {
            console.warn('性能统计获取失败:', e);
            return null;
        }
    },

    /**
     * 清除性能日志
     */
    clearLogs: () => {
        try {
            localStorage.removeItem('api_performance_logs');
        } catch (e) {
            console.warn('性能日志清除失败:', e);
        }
    }
};

/**
 * 网络状态监控
 */
const NetworkMonitor = {
    isOnline: navigator.onLine,
    
    init: () => {
        window.addEventListener('online', () => {
            NetworkMonitor.isOnline = true;
            console.log('网络连接已恢复');
            // 可以在这里触发重新加载或重试失败的请求
        });
        
        window.addEventListener('offline', () => {
            NetworkMonitor.isOnline = false;
            console.warn('网络连接已断开');
        });
    },
    
    checkConnection: async () => {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/database/status`, {
                method: 'HEAD',
                cache: 'no-cache'
            });
            return response.ok;
        } catch {
            return false;
        }
    }
};

// 初始化网络监控
NetworkMonitor.init();

// 导出到全局
window.fetchWithRetry = fetchWithRetry;
window.ApiClient = ApiClient;
window.PerformanceMonitor = PerformanceMonitor;
window.NetworkMonitor = NetworkMonitor;
