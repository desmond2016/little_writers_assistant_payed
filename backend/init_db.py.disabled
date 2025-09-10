# backend/init_db.py
"""
数据库初始化脚本
运行此脚本来创建数据库表和初始数据
"""

import os
import sys
from flask import Flask
from models import db, init_db, User, RedemptionCode, generate_redemption_code
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def create_app():
    """创建Flask应用实例"""
    app = Flask(__name__)
    
    # 数据库配置
    # 开发环境使用SQLite，生产环境可以使用PostgreSQL
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///little_writers.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    return app

def create_admin_user(app):
    """创建管理员用户"""
    with app.app_context():
        # 检查是否已存在管理员用户
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@example.com',
                credits=999999  # 管理员拥有大量积分
            )
            admin.set_password('admin123')  # 默认密码，生产环境需要修改
            db.session.add(admin)
            db.session.commit()
            print("管理员用户创建成功！")
            print("用户名: admin")
            print("密码: admin123")
            print("请在生产环境中修改默认密码！")
        else:
            print("管理员用户已存在")

def create_sample_codes(app):
    """创建一些示例兑换码"""
    with app.app_context():
        # 创建不同价值的兑换码 (按照1元=5积分的比例)
        sample_codes = [
            {'credits': 25, 'expires_days': 30},   # 5元
            {'credits': 50, 'expires_days': 60},   # 10元
            {'credits': 100, 'expires_days': 90}   # 20元
        ]
        
        for code_info in sample_codes:
            code = generate_redemption_code(
                credits_value=code_info['credits'],
                expires_days=code_info['expires_days']
            )
            db.session.add(code)
        
        db.session.commit()
        
        # 显示创建的兑换码
        print("\n示例兑换码创建成功：")
        codes = RedemptionCode.query.filter_by(is_used=False).all()
        for code in codes:
            print(f"兑换码: {code.code}, 价值: {code.credits_value}积分, 过期时间: {code.expires_at}")

def main():
    """主函数"""
    print("开始初始化数据库...")
    
    app = create_app()
    
    # 初始化数据库
    init_db(app)
    
    # 创建管理员用户
    create_admin_user(app)
    
    # 创建示例兑换码
    create_sample_codes(app)
    
    print("\n数据库初始化完成！")

if __name__ == '__main__':
    main()
