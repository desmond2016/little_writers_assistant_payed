import sqlite3
import uuid
from datetime import datetime
from services.supabase_client import SupabaseClient
from models import db, User, RedemptionCode, UsageLog
from init_db import create_app

def migrate_users():
    """迁移用户数据"""
    supabase = SupabaseClient()
    
    users = User.query.all()
    migrated_count = 0
    
    for user in users:
        user_data = {
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'password_hash': user.password_hash,
            'credits': user.credits,
            'is_admin': user.username == 'admin',
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'status': 'active'
        }
        
        success, result = supabase.create_user(user_data)
        if success:
            migrated_count += 1
            print(f"✅ 用户 {user.username} 迁移成功")
        else:
            print(f"❌ 用户 {user.username} 迁移失败: {result}")
    
    print(f"用户迁移完成: {migrated_count}/{len(users)}")

def migrate_redemption_codes():
    """迁移兑换码数据"""
    supabase = SupabaseClient()
    
    codes = RedemptionCode.query.all()
    migrated_count = 0
    
    for code in codes:
        code_data = {
            'code_id': code.code_id,
            'code': code.code,
            'credits_value': code.credits_value,
            'is_used': code.is_used,
            'used_by_user_id': code.used_by_user_id,
            'used_at': code.used_at.isoformat() if code.used_at else None,
            'created_at': code.created_at.isoformat() if code.created_at else None,
            'expires_at': code.expires_at.isoformat() if code.expires_at else None
        }
        
        success, result = supabase.create_redemption_code(code_data)
        if success:
            migrated_count += 1
            print(f"✅ 兑换码 {code.code} 迁移成功")
        else:
            print(f"❌ 兑换码 {code.code} 迁移失败: {result}")
    
    print(f"兑换码迁移完成: {migrated_count}/{len(codes)}")

def migrate_usage_logs():
    """迁移使用记录数据"""
    supabase = SupabaseClient()
    
    logs = UsageLog.query.all()
    migrated_count = 0
    
    for log in logs:
        log_data = {
            'log_id': log.log_id,
            'user_id': log.user_id,
            'action_type': log.action_type,
            'credits_consumed': log.credits_consumed,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None
        }
        
        success, result = supabase.create_usage_log(log_data)
        if success:
            migrated_count += 1
        else:
            print(f"❌ 使用记录迁移失败: {result}")
    
    print(f"使用记录迁移完成: {migrated_count}/{len(logs)}")

def main():
    """主迁移函数"""
    app = create_app()
    
    # 初始化数据库
    from models import db
    db.init_app(app)
    
    with app.app_context():
        print("🚀 开始数据迁移...")
        
        # 按顺序迁移数据
        migrate_users()
        migrate_redemption_codes()
        migrate_usage_logs()
        
        print("✅ 数据迁移完成！")

if __name__ == '__main__':
    main()