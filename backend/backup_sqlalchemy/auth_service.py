# backend/services/auth_service.py
"""
用户认证服务
处理用户注册、登录、JWT token生成和验证等功能
"""

from flask import current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import re
from models import db, User

def validate_email(email):
    """验证邮箱格式"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """验证用户名格式"""
    # 用户名长度3-20字符，只允许字母、数字、下划线
    if len(username) < 3 or len(username) > 20:
        return False
    pattern = r'^[a-zA-Z0-9_]+$'
    return re.match(pattern, username) is not None

def validate_password(password):
    """验证密码强度"""
    # 密码至少6位，包含字母和数字
    if len(password) < 6:
        return False
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    return has_letter and has_digit

def register_user(username, email, password):
    """
    用户注册
    返回: (success: bool, message: str, user_data: dict or None)
    """
    try:
        # 验证输入格式
        if not validate_username(username):
            return False, "用户名格式不正确，请使用3-20位字母、数字或下划线", None
        
        if not validate_email(email):
            return False, "邮箱格式不正确", None
        
        if not validate_password(password):
            return False, "密码至少6位，且包含字母和数字", None
        
        # 检查用户名是否已存在
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return False, "用户名已存在", None
        
        # 检查邮箱是否已存在
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return False, "邮箱已被注册", None
        
        # 创建新用户
        new_user = User(
            username=username,
            email=email,
            credits=10  # 新用户赠送10积分
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return True, "注册成功", new_user.to_dict()
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"用户注册失败: {e}")
        return False, "注册失败，请稍后重试", None

def login_user(username, password):
    """
    用户登录
    返回: (success: bool, message: str, token: str or None, user_data: dict or None)
    """
    try:
        # 查找用户（支持用户名或邮箱登录）
        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user:
            return False, "用户名或密码错误", None, None
        
        # 验证密码
        if not user.check_password(password):
            return False, "用户名或密码错误", None, None
        
        # 更新最后登录时间
        from datetime import datetime
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # 生成JWT token
        access_token = create_access_token(
            identity=user.user_id,
            expires_delta=timedelta(days=7)  # token有效期7天
        )
        
        return True, "登录成功", access_token, user.to_dict()
        
    except Exception as e:
        current_app.logger.error(f"用户登录失败: {e}")
        return False, "登录失败，请稍后重试", None, None

def get_current_user():
    """
    获取当前登录用户
    需要在JWT保护的路由中使用
    返回: User对象或None
    """
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            return User.query.get(current_user_id)
        return None
    except Exception as e:
        current_app.logger.error(f"获取当前用户失败: {e}")
        return None

def get_user_profile(user_id):
    """
    获取用户资料
    返回: (success: bool, message: str, user_data: dict or None)
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return False, "用户不存在", None
        
        return True, "获取成功", user.to_dict()
        
    except Exception as e:
        current_app.logger.error(f"获取用户资料失败: {e}")
        return False, "获取用户资料失败", None

def update_user_credits(user_id, credits_change, action_type="manual"):
    """
    更新用户积分
    credits_change: 正数为增加，负数为减少
    返回: (success: bool, message: str, new_credits: int or None)
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return False, "用户不存在", None
        
        if credits_change < 0 and user.credits < abs(credits_change):
            return False, "积分不足", None
        
        user.credits += credits_change
        
        # 记录使用日志（如果是消耗积分）
        if credits_change < 0:
            from models import UsageLog
            log = UsageLog(
                user_id=user_id,
                action_type=action_type,
                credits_consumed=abs(credits_change)
            )
            db.session.add(log)
        
        db.session.commit()
        
        return True, "积分更新成功", user.credits
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新用户积分失败: {e}")
        return False, "积分更新失败", None
