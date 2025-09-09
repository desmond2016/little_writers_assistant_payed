# backend/services/supabase_redemption_service.py
"""
Supabase兑换码服务
处理兑换码的生成、验证和兑换功能 - 完全基于Supabase
"""

import secrets
import string
from datetime import datetime, timedelta
from flask import current_app
from services.supabase_client import SupabaseClient

def generate_redemption_code():
    """生成随机兑换码"""
    length = 16
    characters = string.ascii_uppercase + string.digits
    # 排除容易混淆的字符
    characters = characters.replace('O', '').replace('0', '').replace('I', '').replace('L', '').replace('1', '')
    return ''.join(secrets.choice(characters) for _ in range(length))

def create_redemption_code_supabase(credits_value, expires_days=None, admin_user_id=None):
    """
    创建兑换码 - Supabase版本
    credits_value: 兑换码价值（积分数）
    expires_days: 过期天数，None表示永不过期
    admin_user_id: 创建者ID（管理员）
    返回: (success: bool, message: str, code_data: dict or None)
    """
    try:
        if credits_value <= 0:
            return False, "积分价值必须大于0", None
        
        if expires_days is not None and expires_days <= 0:
            return False, "过期天数必须大于0", None
        
        supabase = SupabaseClient()
        
        # 生成唯一兑换码
        max_attempts = 10
        for _ in range(max_attempts):
            code = generate_redemption_code()
            # 检查兑换码是否已存在
            success, existing_codes = supabase._make_request('GET', 'redemption_codes', params={
                'code': f'eq.{code}',
                'select': 'code'
            })
            
            if success and not existing_codes:
                # 兑换码不存在，可以使用
                break
        else:
            return False, "生成兑换码失败，请重试", None
        
        # 计算过期时间
        expires_at = None
        if expires_days:
            expires_at = (datetime.utcnow() + timedelta(days=expires_days)).isoformat()
        
        # 创建兑换码记录
        code_data = {
            'code': code,
            'credits_value': credits_value,
            'is_used': False,
            'expires_at': expires_at,
            'created_by_admin_id': admin_user_id,
            'created_at': datetime.utcnow().isoformat()
        }
        
        success, result = supabase._make_request('POST', 'redemption_codes', data=code_data)
        
        if success:
            return True, "兑换码创建成功", result[0] if result else code_data
        else:
            return False, f"创建兑换码失败: {result.get('message', '未知错误')}", None
        
    except Exception as e:
        current_app.logger.error(f"创建兑换码失败: {e}")
        return False, "创建兑换码失败，请稍后重试", None

def redeem_code_supabase(code, user_id):
    """
    兑换积分 - Supabase版本
    code: 兑换码
    user_id: 用户ID
    返回: (success: bool, message: str, credits_gained: int or None)
    """
    try:
        supabase = SupabaseClient()
        
        # 查找兑换码
        success, redemption_codes = supabase._make_request('GET', 'redemption_codes', params={
            'code': f'eq.{code.upper()}'
        })
        
        if not success or not redemption_codes:
            return False, "兑换码不存在", None
        
        redemption_code = redemption_codes[0]
        
        # 检查兑换码是否已被使用
        if redemption_code.get('is_used'):
            return False, "兑换码已被使用", None
        
        # 检查兑换码是否已过期
        if redemption_code.get('expires_at'):
            expires_at = datetime.fromisoformat(redemption_code['expires_at'].replace('Z', '+00:00'))
            if datetime.utcnow() > expires_at.replace(tzinfo=None):
                return False, "兑换码已过期", None
        
        # 查找用户
        success, users = supabase.get_user_by_id(user_id)
        if not success or not users:
            return False, "用户不存在", None
        
        user = users[0]
        credits_value = redemption_code['credits_value']
        
        # 开始事务操作
        current_time = datetime.utcnow().isoformat()
        
        # 1. 标记兑换码为已使用
        update_code_success, _ = supabase._make_request('PATCH', f'redemption_codes', 
            params={'code': f'eq.{code.upper()}'},
            data={
                'is_used': True,
                'used_by_user_id': user_id,
                'used_at': current_time
            }
        )
        
        if not update_code_success:
            return False, "兑换失败，请稍后重试", None
        
        # 2. 更新用户积分
        new_credits = user.get('credits', 0) + credits_value
        update_user_success, _ = supabase.update_user(user_id, {
            'credits': new_credits
        })
        
        if not update_user_success:
            # 回滚兑换码状态
            supabase._make_request('PATCH', f'redemption_codes', 
                params={'code': f'eq.{code.upper()}'},
                data={
                    'is_used': False,
                    'used_by_user_id': None,
                    'used_at': None
                }
            )
            return False, "积分更新失败", None
        
        # 3. 记录使用日志
        log_data = {
            'user_id': user_id,
            'action_type': 'redeem_code',
            'credits_consumed': -credits_value,  # 负数表示获得积分
            'timestamp': current_time,
            'request_details': f'兑换码: {code}'
        }
        supabase.create_usage_log(log_data)
        
        return True, f"兑换成功！获得{credits_value}积分", credits_value
        
    except Exception as e:
        current_app.logger.error(f"兑换积分失败: {e}")
        return False, "兑换失败，请稍后重试", None

def get_user_redemption_history_supabase(user_id):
    """
    获取用户的兑换历史 - Supabase版本
    返回: (success: bool, message: str, history: list or None)
    """
    try:
        supabase = SupabaseClient()
        
        # 检查用户是否存在
        success, users = supabase.get_user_by_id(user_id)
        if not success or not users:
            return False, "用户不存在", None
        
        # 获取用户已兑换的兑换码
        success, redeemed_codes = supabase._make_request('GET', 'redemption_codes', params={
            'used_by_user_id': f'eq.{user_id}',
            'is_used': 'eq.true',
            'order': 'used_at.desc'
        })
        
        if success:
            return True, "获取成功", redeemed_codes
        else:
            return False, "获取兑换历史失败", None
        
    except Exception as e:
        current_app.logger.error(f"获取兑换历史失败: {e}")
        return False, "获取兑换历史失败", None

def validate_redemption_code_supabase(code):
    """
    验证兑换码（不执行兑换） - Supabase版本
    返回: (success: bool, message: str, code_info: dict or None)
    """
    try:
        supabase = SupabaseClient()
        
        # 查找兑换码
        success, redemption_codes = supabase._make_request('GET', 'redemption_codes', params={
            'code': f'eq.{code.upper()}'
        })
        
        if not success or not redemption_codes:
            return False, "兑换码不存在", None
        
        redemption_code = redemption_codes[0]
        
        # 检查是否已被使用
        if redemption_code.get('is_used'):
            return False, "兑换码已被使用", None
        
        # 检查是否已过期
        if redemption_code.get('expires_at'):
            expires_at = datetime.fromisoformat(redemption_code['expires_at'].replace('Z', '+00:00'))
            if datetime.utcnow() > expires_at.replace(tzinfo=None):
                return False, "兑换码已过期", None
        
        # 返回兑换码信息
        code_info = {
            'credits_value': redemption_code['credits_value'],
            'expires_at': redemption_code.get('expires_at'),
            'is_valid': True
        }
        
        return True, f"有效兑换码，价值{redemption_code['credits_value']}积分", code_info
        
    except Exception as e:
        current_app.logger.error(f"验证兑换码失败: {e}")
        return False, "验证兑换码失败", None

def get_usage_statistics_supabase():
    """
    获取兑换码使用统计（管理员功能） - Supabase版本
    返回: (success: bool, message: str, stats: dict or None)
    """
    try:
        supabase = SupabaseClient()
        
        # 获取用户总数
        users_success, users_data = supabase._make_request('GET', 'users', params={'select': 'count'})
        total_users = users_data[0]['count'] if users_success and users_data else 0
        
        # 获取兑换码统计
        codes_success, codes_data = supabase._make_request('GET', 'redemption_codes', params={'select': 'count'})
        total_codes = codes_data[0]['count'] if codes_success and codes_data else 0
        
        used_codes_success, used_codes_data = supabase._make_request('GET', 'redemption_codes', params={
            'select': 'count',
            'is_used': 'eq.true'
        })
        used_codes = used_codes_data[0]['count'] if used_codes_success and used_codes_data else 0
        
        # 获取已过期的兑换码
        current_time = datetime.utcnow().isoformat()
        expired_codes_success, expired_codes_data = supabase._make_request('GET', 'redemption_codes', params={
            'select': 'count',
            'expires_at': f'lt.{current_time}',
            'is_used': 'eq.false'
        })
        expired_codes = expired_codes_data[0]['count'] if expired_codes_success and expired_codes_data else 0
        
        # 获取已使用兑换码的积分总额
        credits_success, credits_data = supabase._make_request('GET', 'redemption_codes', params={
            'select': 'credits_value',
            'is_used': 'eq.true'
        })
        total_credits_issued = sum(item['credits_value'] for item in credits_data) if credits_success and credits_data else 0
        
        stats = {
            'total_users': total_users,
            'total_codes': total_codes,
            'used_codes': used_codes,
            'unused_codes': total_codes - used_codes,
            'expired_codes': expired_codes,
            'total_credits': total_credits_issued,
            'usage_rate': round((used_codes / total_codes * 100), 2) if total_codes > 0 else 0
        }
        
        return True, "获取统计成功", stats
        
    except Exception as e:
        current_app.logger.error(f"获取使用统计失败: {e}")
        return False, "获取使用统计失败", None