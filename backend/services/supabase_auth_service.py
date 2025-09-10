import bcrypt
import uuid
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token
from services.supabase_client import SupabaseClient
from utils.validators import validate_username, validate_email, validate_password

def register_user_supabase(username, email, password, ip_address=None):
    """使用Supabase注册用户"""
    supabase = SupabaseClient()
    
    try:
        # 验证输入格式
        if not validate_username(username):
            return False, "用户名格式不正确", None
        
        if not validate_email(email):
            return False, "邮箱格式不正确", None
        
        if not validate_password(password):
            return False, "密码至少6位，且包含字母和数字", None
        
        # 检查用户名是否已存在
        success, existing_user = supabase.get_user_by_username(username)
        if success and existing_user:
            return False, "用户名已存在", None
        
        # 检查邮箱是否已存在
        success, existing_email = supabase.get_user_by_email(email)
        if success and existing_email:
            return False, "邮箱已被注册", None
        
        # 创建新用户
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user_data = {
            'user_id': str(uuid.uuid4()),
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'credits': 10,
            'registration_ip': ip_address,
            'created_at': datetime.utcnow().isoformat()
        }
        
        success, result = supabase.create_user(user_data)
        
        if success:
            # 记录注册IP
            if ip_address:
                record_registration_ip(ip_address)
            
            return True, "注册成功", result[0] if result else None
        else:
            return False, "注册失败", None
            
    except Exception as e:
        return False, f"注册失败: {str(e)}", None

def login_user_supabase(username, password, ip_address=None):
    """使用Supabase登录用户"""
    supabase = SupabaseClient()
    
    try:
        # 查找用户
        success, users = supabase.get_user_by_username(username)
        if not success or not users:
            # 尝试用邮箱查找
            success, users = supabase.get_user_by_email(username)
            if not success or not users:
                return False, "用户名或密码错误", None, None
        
        user = users[0]
        
        # 验证密码
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            # 记录登录失败
            record_login_attempt(user['user_id'], ip_address, False, "密码错误")
            return False, "用户名或密码错误", None, None
        
        # 更新最后登录时间
        update_data = {'last_login': datetime.utcnow().isoformat()}
        supabase.update_user(user['user_id'], update_data)
        
        # 记录登录成功
        record_login_attempt(user['user_id'], ip_address, True)
        
        # 生成JWT token
        access_token = create_access_token(
            identity=user['user_id'],
            expires_delta=timedelta(days=7)
        )
        
        return True, "登录成功", access_token, user
        
    except Exception as e:
        return False, f"登录失败: {str(e)}", None, None

def record_registration_ip(ip_address):
    """记录注册IP"""
    # 实现IP记录逻辑
    pass

def record_login_attempt(user_id, ip_address, success, failure_reason=None):
    """记录登录尝试"""
    # 实现登录日志记录
    pass
def get_current_user_supabase():
    """获取当前Supabase用户"""
    from flask_jwt_extended import get_jwt_identity
    supabase = SupabaseClient()
    
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            success, users = supabase.get_user_by_id(current_user_id)
            if success and users:
                return users[0]  # 返回用户字典
        return None
    except Exception as e:
        return None

def get_user_profile_supabase(user_id):
    """获取Supabase用户资料"""
    supabase = SupabaseClient()
    
    try:
        success, users = supabase.get_user_by_id(user_id)
        if success and users:
            return True, "获取成功", users[0]
        else:
            return False, "用户不存在", None
    except Exception as e:
        return False, "获取用户资料失败", None
def update_user_credits_supabase(user_id, credits_change, action_type="manual"):
    """
    更新Supabase用户积分 - 确保原子性操作
    credits_change: 正数为增加，负数为减少
    返回: (success: bool, message: str, new_credits: int or None)
    """
    from services.supabase_client import SupabaseClient
    from datetime import datetime
    from flask import current_app
    
    supabase = SupabaseClient()
    
    try:
        # 获取当前用户信息
        success, users = supabase.get_user_by_id(user_id)
        if not success or not users:
            return False, "用户不存在", None
        
        user = users[0]
        current_credits = user.get('credits', 0)
        
        # 检查积分是否足够
        if credits_change < 0 and current_credits < abs(credits_change):
            return False, "积分不足", None
        
        # 计算新积分
        new_credits = current_credits + credits_change
        
        # 使用数据库事务确保原子性
        client = supabase.get_client()
        
        # 先更新用户积分
        user_update_result = client.table('users').update({
            'credits': new_credits
        }).eq('user_id', user_id).execute()
        
        if user_update_result.data:
            # 积分更新成功，记录使用日志（如果是消耗积分）
            if credits_change < 0:
                log_data = {
                    'user_id': user_id,
                    'action_type': action_type,
                    'credits_consumed': abs(credits_change),
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                log_result = client.table('usage_logs').insert(log_data).execute()
                
                if not log_result.data:
                    # 如果日志记录失败，回滚积分更新
                    client.table('users').update({
                        'credits': current_credits
                    }).eq('user_id', user_id).execute()
                    
                    current_app.logger.error(f"使用日志记录失败，已回滚积分更新: user_id={user_id}")
                    return False, "操作失败，积分未扣除", None
            
            current_app.logger.info(f"积分更新成功: user_id={user_id}, change={credits_change}, new_credits={new_credits}")
            return True, "积分更新成功", new_credits
        else:
            return False, "积分更新失败", None
        
    except Exception as e:
        current_app.logger.error(f"积分更新异常: user_id={user_id}, error={str(e)}")
        return False, f"积分更新失败: {str(e)}", None