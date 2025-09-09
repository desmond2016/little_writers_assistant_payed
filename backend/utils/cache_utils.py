# backend/utils/cache_utils.py
"""
后端缓存工具
提供内存缓存和装饰器功能
"""
import time
import json
import hashlib
from functools import wraps
from typing import Any, Dict, Optional, Callable

class MemoryCache:
    """简单的内存缓存实现"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = 300  # 5分钟默认TTL
    
    def _is_expired(self, cache_entry: Dict[str, Any]) -> bool:
        """检查缓存项是否过期"""
        return time.time() > cache_entry['expires_at']
    
    def _cleanup_expired(self):
        """清理过期的缓存项"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time > entry['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        if self._is_expired(entry):
            del self._cache[key]
            return None
        
        # 更新访问时间
        entry['last_accessed'] = time.time()
        return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """设置缓存值"""
        if ttl is None:
            ttl = self._default_ttl
        
        current_time = time.time()
        self._cache[key] = {
            'value': value,
            'created_at': current_time,
            'last_accessed': current_time,
            'expires_at': current_time + ttl,
            'ttl': ttl
        }
        
        # 定期清理过期项
        if len(self._cache) % 100 == 0:
            self._cleanup_expired()
    
    def delete(self, key: str) -> bool:
        """删除缓存项"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """清空所有缓存"""
        self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        current_time = time.time()
        total_items = len(self._cache)
        expired_items = sum(
            1 for entry in self._cache.values()
            if current_time > entry['expires_at']
        )
        
        return {
            'total_items': total_items,
            'active_items': total_items - expired_items,
            'expired_items': expired_items,
            'memory_usage_estimate': sum(
                len(str(entry['value'])) for entry in self._cache.values()
            )
        }

# 全局缓存实例
_global_cache = MemoryCache()

def get_cache_key(*args, **kwargs) -> str:
    """生成缓存键"""
    # 将参数转换为字符串并生成哈希
    key_data = {
        'args': args,
        'kwargs': kwargs
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()

def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    缓存函数结果的装饰器
    
    Args:
        ttl: 缓存生存时间（秒）
        key_prefix: 缓存键前缀
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{key_prefix}:{func.__name__}:{get_cache_key(*args, **kwargs)}"
            
            # 尝试从缓存获取
            cached_result = _global_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 执行函数并缓存结果
            result = func(*args, **kwargs)
            _global_cache.set(cache_key, result, ttl)
            
            return result
        
        # 添加缓存控制方法
        wrapper.cache_clear = lambda: _global_cache.clear()
        wrapper.cache_delete = lambda *args, **kwargs: _global_cache.delete(
            f"{key_prefix}:{func.__name__}:{get_cache_key(*args, **kwargs)}"
        )
        
        return wrapper
    return decorator

def cache_user_data(ttl: int = 600):
    """
    专门用于缓存用户数据的装饰器
    TTL默认为10分钟
    包含用户ID以避免缓存冲突
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 获取当前用户ID作为缓存键的一部分
            try:
                from flask_jwt_extended import get_jwt_identity
                current_user_id = get_jwt_identity()
                if current_user_id:
                    cache_key = f"user_data:{func.__name__}:{current_user_id}:{get_cache_key(*args, **kwargs)}"
                else:
                    # 如果无法获取用户ID，使用原有逻辑但添加时间戳避免冲突
                    import time
                    cache_key = f"user_data:{func.__name__}:no_user:{int(time.time())}:{get_cache_key(*args, **kwargs)}"
            except Exception:
                # 如果JWT不可用，使用原有逻辑但添加时间戳
                import time
                cache_key = f"user_data:{func.__name__}:no_jwt:{int(time.time())}:{get_cache_key(*args, **kwargs)}"
            
            # 尝试从缓存获取
            cached_result = _global_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 执行函数并缓存结果
            result = func(*args, **kwargs)
            _global_cache.set(cache_key, result, ttl)
            
            return result
        
        # 添加缓存控制方法
        wrapper.cache_clear = lambda: _global_cache.clear()
        wrapper.cache_delete = lambda user_id=None: (
            _global_cache.delete(f"user_data:{func.__name__}:{user_id}:{get_cache_key()}")
            if user_id else _global_cache.clear()
        )
        
        return wrapper
    return decorator

def cache_api_response(ttl: int = 300):
    """
    专门用于缓存API响应的装饰器
    TTL默认为5分钟
    """
    return cache_result(ttl=ttl, key_prefix="api_response")

def invalidate_user_cache(user_id: str):
    """
    清除特定用户的所有缓存
    """
    # 这是一个简化实现，实际应用中可能需要更复杂的缓存键管理
    keys_to_delete = [
        key for key in _global_cache._cache.keys()
        if f"user_data:" in key and str(user_id) in key
    ]
    
    for key in keys_to_delete:
        _global_cache.delete(key)

# 缓存统计和管理函数
def get_cache_stats() -> Dict[str, Any]:
    """获取缓存统计信息"""
    return _global_cache.get_stats()

def clear_all_cache():
    """清空所有缓存"""
    _global_cache.clear()

def clear_expired_cache():
    """清理过期缓存"""
    _global_cache._cleanup_expired()

# 缓存预热函数
def warmup_cache():
    """缓存预热 - 可以在应用启动时调用"""
    # 这里可以预加载一些常用数据
    pass
