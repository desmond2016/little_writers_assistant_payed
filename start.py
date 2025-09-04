#!/usr/bin/env python3
"""
启动脚本 - 用于Render部署
从根目录启动backend/app.py
"""
import os
import sys

# 添加backend目录到Python路径
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# 切换到backend目录
os.chdir(backend_dir)

# 导入并运行app
if __name__ == '__main__':
    from app import app
    
    # 获取端口号
    port = int(os.environ.get('PORT', 5001))
    
    # 启动应用
    app.run(host='0.0.0.0', port=port, debug=False)
