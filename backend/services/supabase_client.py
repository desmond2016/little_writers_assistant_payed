import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json
import time

class SupabaseClient:
    def __init__(self):
        self.url = os.environ.get('SUPABASE_URL')
        self.anon_key = os.environ.get('SUPABASE_ANON_KEY')
        self.service_key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not all([self.url, self.anon_key, self.service_key]):
            raise ValueError("Supabase配置不完整")

        self.headers = {
            'apikey': self.anon_key,
            'Authorization': f'Bearer {self.service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

        # 创建优化的session
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """创建优化的requests session"""
        session = requests.Session()

        # 配置重试策略
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"]
        )

        # 配置HTTP适配器
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=10,
            pool_maxsize=10,
            pool_block=False
        )

        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # 设置默认超时
        session.timeout = 30

        return session

    def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Tuple[bool, Dict]:
        """发送HTTP请求到Supabase"""
        url = f"{self.url}/rest/v1/{endpoint}"
        start_time = time.time()

        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=self.headers,
                json=data,
                params=params,
                timeout=30
            )

            duration = time.time() - start_time

            # 记录慢查询
            if duration > 2.0:
                print(f"慢速Supabase查询: {endpoint} 耗时 {duration:.2f}s")

            if response.status_code in [200, 201]:
                return True, response.json()
            else:
                return False, {"error": response.text, "status_code": response.status_code}

        except Exception as e:
            duration = time.time() - start_time
            print(f"Supabase请求失败: {endpoint} 耗时 {duration:.2f}s, 错误: {str(e)}")
            return False, {"error": str(e)}
    
    # 用户相关操作
    def create_user(self, user_data: Dict) -> Tuple[bool, Dict]:
        return self._make_request('POST', 'users', user_data)
    
    def get_user_by_username(self, username: str) -> Tuple[bool, Dict]:
        params = {'username': f'eq.{username}'}
        return self._make_request('GET', 'users', params=params)
    
    def get_user_by_email(self, email: str) -> Tuple[bool, Dict]:
        params = {'email': f'eq.{email}'}
        return self._make_request('GET', 'users', params=params)
    
    def update_user(self, user_id: str, update_data: Dict) -> Tuple[bool, Dict]:
        params = {'user_id': f'eq.{user_id}'}
        return self._make_request('PATCH', 'users', update_data, params)
    
    # 兑换码相关操作
    def create_redemption_code(self, code_data: Dict) -> Tuple[bool, Dict]:
        return self._make_request('POST', 'redemption_codes', code_data)
    
    def get_redemption_code(self, code: str) -> Tuple[bool, Dict]:
        params = {'code': f'eq.{code}'}
        return self._make_request('GET', 'redemption_codes', params=params)
    
    # 使用记录相关操作
    def create_usage_log(self, log_data: Dict) -> Tuple[bool, Dict]:
        return self._make_request('POST', 'usage_logs', log_data)
    
    def get_user_usage_logs(self, user_id: str, limit: int = 50) -> Tuple[bool, Dict]:
        params = {
            'user_id': f'eq.{user_id}',
            'order': 'timestamp.desc',
            'limit': limit
        }
    def get_user_by_id(self, user_id: str) -> Tuple[bool, Dict]:
        """根据用户ID获取用户信息"""
        params = {'user_id': f'eq.{user_id}'}
        return self._make_request('GET', 'users', params=params)
        