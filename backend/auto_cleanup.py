#!/usr/bin/env python3
"""
自动数据库清理脚本
直接执行清理操作，无需交互确认
"""

import sys
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加当前目录到路径
sys.path.append(os.path.dirname(__file__))

from services.supabase_client import SupabaseClient
from datetime import datetime

def print_separator(title):
    """打印分隔符"""
    print("\n" + "="*60)
    print(f" {title} ")
    print("="*60)

def cleanup_data():
    """清理数据库数据"""
    print_separator("执行数据库清理")
    
    try:
        client = SupabaseClient()
        
        # 1. 清理usage_logs表的所有数据
        print("🗑️ 清理使用记录表 (usage_logs)...")
        # 使用不同的方式清理 - 直接删除所有记录
        success, result = client._make_request('DELETE', 'usage_logs', params={'log_id': 'not.is.null'})
        if success:
            print("   ✅ 使用记录表清理完成")
        else:
            print(f"   ❌ 清理使用记录表失败: {result}")
        
        # 2. 清理redemption_codes表的所有数据
        print("\n🗑️ 清理兑换码表 (redemption_codes)...")
        success, result = client._make_request('DELETE', 'redemption_codes', params={'code_id': 'not.is.null'})
        if success:
            print("   ✅ 兑换码表清理完成")
        else:
            print(f"   ❌ 清理兑换码表失败: {result}")
        
        # 3. 删除除了admin和pan之外的所有用户
        print("\n🗑️ 清理用户表 (users) - 保留admin和pan...")
        
        # 首先获取所有用户
        success, users = client._make_request('GET', 'users')
        if success and users:
            deleted_count = 0
            for user in users:
                username = user.get('username', '')
                if username not in ['admin', 'pan']:
                    user_id = user.get('user_id')
                    success, result = client._make_request('DELETE', 'users', params={'user_id': f'eq.{user_id}'})
                    if success:
                        print(f"   ✅ 删除用户: {username}")
                        deleted_count += 1
                    else:
                        print(f"   ❌ 删除用户 {username} 失败: {result}")
            
            print(f"\n   📊 共删除 {deleted_count} 个用户账号")
        
        print("\n🎉 数据库清理完成！")
        
    except Exception as e:
        print(f"❌ 清理数据时发生错误: {e}")

def get_remaining_data():
    """获取清理后的剩余数据"""
    print_separator("清理后的数据库状态")
    
    try:
        client = SupabaseClient()
        
        # 获取剩余用户数据
        print("\n👥 剩余用户:")
        success, users = client._make_request('GET', 'users', params={'order': 'created_at.asc'})
        if success and users:
            for i, user in enumerate(users, 1):
                print(f"  {i}. 用户名: {user.get('username', 'N/A')}")
                print(f"     邮箱: {user.get('email', 'N/A')}")
                print(f"     积分: {user.get('credits', 'N/A')}")
                print(f"     注册时间: {user.get('created_at', 'N/A')}")
                print()
        else:
            print("  没有剩余用户或查询失败")
        
        # 检查兑换码表
        print("\n🎟️ 兑换码表状态:")
        success, codes = client._make_request('GET', 'redemption_codes')
        if success and codes:
            print(f"  剩余兑换码数量: {len(codes)}")
        else:
            print("  兑换码表已清空")
        
        # 检查使用记录表
        print("\n📊 使用记录表状态:")
        success, logs = client._make_request('GET', 'usage_logs')
        if success and logs:
            print(f"  剩余记录数量: {len(logs)}")
        else:
            print("  使用记录表已清空")
            
    except Exception as e:
        print(f"❌ 获取数据时发生错误: {e}")

def get_admin_info():
    """获取admin和pan账号的详细信息"""
    print_separator("管理员账号信息")
    
    try:
        client = SupabaseClient()
        
        for username in ['admin', 'pan']:
            print(f"\n🔑 用户: {username}")
            success, users = client._make_request('GET', 'users', params={'username': f'eq.{username}'})
            
            if success and users:
                user = users[0]
                print(f"   ✅ 找到用户信息:")
                print(f"      用户名: {user.get('username', 'N/A')}")
                print(f"      邮箱: {user.get('email', 'N/A')}")
                print(f"      积分余额: {user.get('credits', 'N/A')}")
                print(f"      用户ID: {user.get('user_id', 'N/A')}")
                print(f"      注册时间: {user.get('created_at', 'N/A')}")
                print(f"      最后登录: {user.get('last_login', '从未登录')}")
                
                # 密码提示
                if username == 'admin':
                    print(f"      🔐 密码: 'admin123' (默认管理员密码)")
                elif username == 'pan':
                    print(f"      🔐 密码: 需要查看注册时的密码或进行密码重置")
                
            else:
                print(f"   ❌ 用户 {username} 不存在或查询失败: {users}")
    
    except Exception as e:
        print(f"❌ 获取管理员信息时发生错误: {e}")

def main():
    """主函数"""
    print_separator("Supabase 数据库自动清理工具")
    print("正在执行数据库清理操作...")
    
    # 执行清理
    cleanup_data()
    
    # 显示清理后的状态
    get_remaining_data()
    
    # 显示管理员信息
    get_admin_info()
    
    print_separator("清理操作完成")
    print("📝 总结:")
    print("   • 已删除除admin和pan外的所有用户")
    print("   • 已清空所有兑换码记录")
    print("   • 已清空所有使用记录")
    print("   • 保留了admin和pan两个管理员账号")

if __name__ == "__main__":
    main()