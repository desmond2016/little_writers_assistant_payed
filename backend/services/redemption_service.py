# backend/services/redemption_service.py
"""
兑换码服务
处理兑换码的生成、验证和兑换功能
"""

from flask import current_app
from datetime import datetime, timedelta
from models import db, RedemptionCode, User, generate_redemption_code

def create_redemption_code(credits_value, expires_days=None, admin_user_id=None):
    """
    创建兑换码
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
        
        # 生成兑换码
        redemption_code = generate_redemption_code(credits_value, expires_days)
        
        db.session.add(redemption_code)
        db.session.commit()
        
        return True, "兑换码创建成功", redemption_code.to_dict()
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建兑换码失败: {e}")
        return False, "创建兑换码失败，请稍后重试", None

def redeem_code(code, user_id):
    """
    兑换积分
    code: 兑换码
    user_id: 用户ID
    返回: (success: bool, message: str, credits_gained: int or None)
    """
    try:
        # 查找兑换码
        redemption_code = RedemptionCode.query.filter_by(code=code.upper()).first()
        
        if not redemption_code:
            return False, "兑换码不存在", None
        
        # 检查兑换码是否有效
        if not redemption_code.is_valid():
            if redemption_code.is_used:
                return False, "兑换码已被使用", None
            elif redemption_code.is_expired():
                return False, "兑换码已过期", None
            else:
                return False, "兑换码无效", None
        
        # 查找用户
        user = User.query.get(user_id)
        if not user:
            return False, "用户不存在", None
        
        # 执行兑换
        if redemption_code.redeem(user_id):
            user.add_credits(redemption_code.credits_value)
            db.session.commit()
            
            return True, f"兑换成功！获得{redemption_code.credits_value}积分", redemption_code.credits_value
        else:
            return False, "兑换失败", None
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"兑换积分失败: {e}")
        return False, "兑换失败，请稍后重试", None

def get_user_redemption_history(user_id):
    """
    获取用户的兑换历史
    返回: (success: bool, message: str, history: list or None)
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return False, "用户不存在", None
        
        # 获取用户已兑换的兑换码
        redeemed_codes = RedemptionCode.query.filter_by(
            used_by_user_id=user_id,
            is_used=True
        ).order_by(RedemptionCode.used_at.desc()).all()
        
        history = [code.to_dict() for code in redeemed_codes]
        
        return True, "获取成功", history
        
    except Exception as e:
        current_app.logger.error(f"获取兑换历史失败: {e}")
        return False, "获取兑换历史失败", None

def get_all_redemption_codes(admin_user_id=None):
    """
    获取所有兑换码（管理员功能）
    返回: (success: bool, message: str, codes: list or None)
    """
    try:
        # 这里可以添加管理员权限验证
        # if not is_admin(admin_user_id):
        #     return False, "权限不足", None
        
        codes = RedemptionCode.query.order_by(RedemptionCode.created_at.desc()).all()
        codes_data = [code.to_dict() for code in codes]
        
        return True, "获取成功", codes_data
        
    except Exception as e:
        current_app.logger.error(f"获取兑换码列表失败: {e}")
        return False, "获取兑换码列表失败", None

def validate_redemption_code(code):
    """
    验证兑换码（不执行兑换）
    返回: (success: bool, message: str, code_info: dict or None)
    """
    try:
        redemption_code = RedemptionCode.query.filter_by(code=code.upper()).first()
        
        if not redemption_code:
            return False, "兑换码不存在", None
        
        if not redemption_code.is_valid():
            if redemption_code.is_used:
                return False, "兑换码已被使用", None
            elif redemption_code.is_expired():
                return False, "兑换码已过期", None
            else:
                return False, "兑换码无效", None
        
        # 返回兑换码信息（不包含敏感信息）
        code_info = {
            'credits_value': redemption_code.credits_value,
            'expires_at': redemption_code.expires_at.isoformat() if redemption_code.expires_at else None,
            'is_valid': True
        }
        
        return True, f"有效兑换码，价值{redemption_code.credits_value}积分", code_info
        
    except Exception as e:
        current_app.logger.error(f"验证兑换码失败: {e}")
        return False, "验证兑换码失败", None

def get_usage_statistics():
    """
    获取兑换码使用统计（管理员功能）
    返回: (success: bool, message: str, stats: dict or None)
    """
    try:
        total_codes = RedemptionCode.query.count()
        used_codes = RedemptionCode.query.filter_by(is_used=True).count()
        expired_codes = RedemptionCode.query.filter(
            RedemptionCode.expires_at < datetime.utcnow(),
            RedemptionCode.is_used == False
        ).count()
        
        total_credits_issued = db.session.query(
            db.func.sum(RedemptionCode.credits_value)
        ).filter_by(is_used=True).scalar() or 0
        
        stats = {
            'total_codes': total_codes,
            'used_codes': used_codes,
            'unused_codes': total_codes - used_codes,
            'expired_codes': expired_codes,
            'total_credits_issued': total_credits_issued,
            'usage_rate': round((used_codes / total_codes * 100), 2) if total_codes > 0 else 0
        }
        
        return True, "获取统计成功", stats
        
    except Exception as e:
        current_app.logger.error(f"获取使用统计失败: {e}")
        return False, "获取使用统计失败", None
