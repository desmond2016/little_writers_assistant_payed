# backend/utils/__init__.py
"""
工具模块
"""
from .cache_utils import (
    cache_result,
    cache_user_data,
    cache_api_response,
    invalidate_user_cache,
    get_cache_stats,
    clear_all_cache,
    clear_expired_cache,
    warmup_cache
)

__all__ = [
    'cache_result',
    'cache_user_data', 
    'cache_api_response',
    'invalidate_user_cache',
    'get_cache_stats',
    'clear_all_cache',
    'clear_expired_cache',
    'warmup_cache'
]
