# backend/utils/validators.py
"""
数据验证工具函数
提供用户名、邮箱、密码等数据的验证功能
"""

import re

def validate_email(email):
    """验证邮箱格式"""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """验证用户名格式"""
    if not username:
        return False
    # 用户名长度3-20字符，只允许字母、数字、下划线
    if len(username) < 3 or len(username) > 20:
        return False
    pattern = r'^[a-zA-Z0-9_]+$'
    return re.match(pattern, username) is not None

def validate_password(password):
    """验证密码强度"""
    if not password:
        return False
    # 密码至少6位
    if len(password) < 6:
        return False
    # 必须包含字母
    if not re.search(r'[a-zA-Z]', password):
        return False
    # 必须包含数字
    if not re.search(r'[0-9]', password):
        return False
    return True

def validate_credits_amount(amount):
    """验证积分数量"""
    try:
        amount = int(amount)
        return amount >= 0
    except (ValueError, TypeError):
        return False

def validate_redemption_code(code):
    """验证兑换码格式"""
    if not code:
        return False
    # 兑换码应该是16位字符，只包含大写字母和数字
    code = code.replace('-', '').replace(' ', '').upper()
    if len(code) != 16:
        return False
    pattern = r'^[A-Z0-9]{16}$'
    return re.match(pattern, code) is not None