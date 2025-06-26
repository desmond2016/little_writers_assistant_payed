#!/usr/bin/env python3
"""
快速更新前端API地址脚本
使用方法：python update-api-urls.py your-render-app-name
"""

import sys
import os
import re

def update_api_url(file_path, new_api_url):
    """更新单个文件中的API URL"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # 查找并替换API_BASE_URL
        pattern = r"const API_BASE_URL = '[^']*';"
        replacement = f"const API_BASE_URL = '{new_api_url}';"
        
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f"✅ 已更新: {file_path}")
            return True
        else:
            print(f"⚠️  未找到API_BASE_URL: {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ 更新失败 {file_path}: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("使用方法: python update-api-urls.py your-render-app-name")
        print("例如: python update-api-urls.py little-writers-backend")
        sys.exit(1)
    
    app_name = sys.argv[1]
    new_api_url = f"https://{app_name}.onrender.com/api"
    
    print(f"🚀 开始更新API地址为: {new_api_url}")
    print("-" * 50)
    
    # 需要更新的文件列表
    js_files = [
        "frontend/js/script.js",
        "frontend/js/auth.js", 
        "frontend/js/profile.js",
        "frontend/js/admin.js"
    ]
    
    updated_count = 0
    
    for file_path in js_files:
        if os.path.exists(file_path):
            if update_api_url(file_path, new_api_url):
                updated_count += 1
        else:
            print(f"❌ 文件不存在: {file_path}")
    
    print("-" * 50)
    print(f"📊 更新完成: {updated_count}/{len(js_files)} 个文件")
    
    if updated_count > 0:
        print("\n📝 接下来的步骤:")
        print("1. 检查更新的文件")
        print("2. 提交更改: git add . && git commit -m 'Update API URLs for production'")
        print("3. 推送到GitHub: git push origin main")
        print("4. Cloudflare Pages会自动重新部署")
    
    print(f"\n🌐 你的应用地址:")
    print(f"   后端: https://{app_name}.onrender.com")
    print(f"   前端: https://your-app.pages.dev (部署后获得)")

if __name__ == "__main__":
    main()
