// frontend/js/cache.js
/**
 * 前端缓存管理工具
 * 用于优化API调用和提升用户体验
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5分钟默认缓存时间
    }

    /**
     * 设置缓存
     * @param {string} key - 缓存键
     * @param {any} data - 缓存数据
     * @param {number} ttl - 生存时间（毫秒）
     */
    set(key, data, ttl = this.defaultTTL) {
        const expireTime = Date.now() + ttl;
        this.cache.set(key, {
            data,
            expireTime,
            timestamp: Date.now()
        });
        
        // 同时存储到localStorage作为持久化备份
        try {
            const cacheData = {
                data,
                expireTime,
                timestamp: Date.now()
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('localStorage缓存失败:', e);
        }
    }

    /**
     * 获取缓存
     * @param {string} key - 缓存键
     * @returns {any|null} 缓存数据或null
     */
    get(key) {
        // 首先检查内存缓存
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() < cached.expireTime) {
                return cached.data;
            } else {
                this.cache.delete(key);
            }
        }

        // 检查localStorage缓存
        try {
            const stored = localStorage.getItem(`cache_${key}`);
            if (stored) {
                const cached = JSON.parse(stored);
                if (Date.now() < cached.expireTime) {
                    // 恢复到内存缓存
                    this.cache.set(key, cached);
                    return cached.data;
                } else {
                    localStorage.removeItem(`cache_${key}`);
                }
            }
        } catch (e) {
            console.warn('localStorage读取失败:', e);
        }

        return null;
    }

    /**
     * 删除缓存
     * @param {string} key - 缓存键
     */
    delete(key) {
        this.cache.delete(key);
        try {
            localStorage.removeItem(`cache_${key}`);
        } catch (e) {
            console.warn('localStorage删除失败:', e);
        }
    }

    /**
     * 清空所有缓存
     */
    clear() {
        this.cache.clear();
        try {
            // 清除所有以cache_开头的localStorage项
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('localStorage清空失败:', e);
        }
    }

    /**
     * 获取缓存统计信息
     */
    getStats() {
        return {
            memorySize: this.cache.size,
            localStorageSize: Object.keys(localStorage).filter(k => k.startsWith('cache_')).length
        };
    }
}

// 创建全局缓存实例
const cacheManager = new CacheManager();

/**
 * 缓存装饰器函数
 * @param {string} cacheKey - 缓存键
 * @param {number} ttl - 缓存时间
 * @returns {Function} 装饰器函数
 */
function withCache(cacheKey, ttl = 5 * 60 * 1000) {
    return function(originalFunction) {
        return async function(...args) {
            // 生成包含参数的缓存键
            const fullKey = `${cacheKey}_${JSON.stringify(args)}`;
            
            // 尝试从缓存获取
            const cached = cacheManager.get(fullKey);
            if (cached !== null) {
                console.log(`缓存命中: ${fullKey}`);
                return cached;
            }

            // 执行原函数
            try {
                const result = await originalFunction.apply(this, args);
                // 缓存结果
                cacheManager.set(fullKey, result, ttl);
                console.log(`缓存存储: ${fullKey}`);
                return result;
            } catch (error) {
                console.error(`函数执行失败: ${fullKey}`, error);
                throw error;
            }
        };
    };
}

/**
 * 用户数据缓存工具
 */
const UserCache = {
    /**
     * 缓存用户资料
     */
    setProfile: (userData) => {
        cacheManager.set('user_profile', userData, 10 * 60 * 1000); // 10分钟
    },

    /**
     * 获取缓存的用户资料
     */
    getProfile: () => {
        return cacheManager.get('user_profile');
    },

    /**
     * 清除用户相关缓存
     */
    clearUserData: () => {
        cacheManager.delete('user_profile');
        cacheManager.delete('user_credits');
        cacheManager.delete('user_history');
    },

    /**
     * 缓存用户积分
     */
    setCredits: (credits) => {
        cacheManager.set('user_credits', credits, 2 * 60 * 1000); // 2分钟
    },

    /**
     * 获取缓存的用户积分
     */
    getCredits: () => {
        return cacheManager.get('user_credits');
    }
};

// 导出到全局
window.CacheManager = CacheManager;
window.cacheManager = cacheManager;
window.withCache = withCache;
window.UserCache = UserCache;
