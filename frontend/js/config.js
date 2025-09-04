// frontend/js/config.js
/**
 * 前端配置管理
 * 根据环境自动选择API地址
 */

// 环境检测 - 更严格的本地环境判断
const isLocalhost = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0' ||
    window.location.hostname === '' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.')
) && !window.location.hostname.includes('onrender.com');

// 配置对象
const CONFIG = {
    // API配置
    API: {
        // 根据环境选择API地址
        BASE_URL: isLocalhost 
            ? 'http://127.0.0.1:5001/api'  // 本地开发
            : 'https://little-writers-assistant-payed.onrender.com/api', // 生产环境
        
        // API超时时间
        TIMEOUT: 30000, // 30秒
        
        // 重试配置
        RETRY: {
            MAX_ATTEMPTS: 3,
            BASE_DELAY: 1000,
            MAX_DELAY: 10000
        }
    },
    
    // 缓存配置
    CACHE: {
        DEFAULT_TTL: 5 * 60 * 1000,      // 5分钟
        USER_PROFILE_TTL: 10 * 60 * 1000, // 10分钟
        USER_CREDITS_TTL: 2 * 60 * 1000   // 2分钟
    },
    
    // 性能配置
    PERFORMANCE: {
        SLOW_REQUEST_THRESHOLD: 3000, // 3秒
        LOG_PERFORMANCE: true
    },
    
    // 功能开关
    FEATURES: {
        ENABLE_CACHE: true,
        ENABLE_RETRY: true,
        ENABLE_PERFORMANCE_MONITORING: true,
        ENABLE_OFFLINE_SUPPORT: true
    }
};

// 生成完整的API URL
CONFIG.API.ENDPOINTS = {
    LOGIN: `${CONFIG.API.BASE_URL}/login`,
    REGISTER: `${CONFIG.API.BASE_URL}/register`,
    CHAT: `${CONFIG.API.BASE_URL}/chat`,
    COMPLETE_ESSAY: `${CONFIG.API.BASE_URL}/complete_essay`,
    USER_PROFILE: `${CONFIG.API.BASE_URL}/user/profile`,
    USER_CREDITS: `${CONFIG.API.BASE_URL}/user/credits`,
    DATABASE_STATUS: `${CONFIG.API.BASE_URL}/database/status`,
    CACHE_STATS: `${CONFIG.API.BASE_URL}/cache/stats`
};

// 环境信息
CONFIG.ENVIRONMENT = {
    IS_LOCALHOST: isLocalhost,
    IS_PRODUCTION: !isLocalhost,
    HOSTNAME: window.location.hostname,
    PROTOCOL: window.location.protocol
};

// 调试信息
console.log('🔧 环境检测详情:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    href: window.location.href,
    isLocalhost: isLocalhost,
    environment: isLocalhost ? 'development' : 'production'
});

if (CONFIG.FEATURES.ENABLE_PERFORMANCE_MONITORING) {
    console.log('🔧 前端配置加载完成:', {
        environment: CONFIG.ENVIRONMENT.IS_PRODUCTION ? 'production' : 'development',
        apiBaseUrl: CONFIG.API.BASE_URL,
        features: CONFIG.FEATURES
    });
}

// 导出配置
window.CONFIG = CONFIG;

// 兼容性：为现有代码提供变量
window.API_BASE_URL = CONFIG.API.BASE_URL;
window.CHAT_API_URL = CONFIG.API.ENDPOINTS.CHAT;
window.COMPLETE_ESSAY_API_URL = CONFIG.API.ENDPOINTS.COMPLETE_ESSAY;
window.USER_PROFILE_URL = CONFIG.API.ENDPOINTS.USER_PROFILE;
