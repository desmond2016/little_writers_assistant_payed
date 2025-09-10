#!/usr/bin/env python3
"""
启动脚本 - 用于Render生产部署
自动选择最适合的服务器配置
"""
import os
import sys

def main():
    # 添加backend目录到Python路径
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    sys.path.insert(0, backend_dir)
    
    # 切换到backend目录
    os.chdir(backend_dir)
    
    # 设置生产环境变量
    os.environ.setdefault('FLASK_ENV', 'production')
    os.environ.setdefault('DEBUG', 'false')
    os.environ.setdefault('USE_SUPABASE', 'true')
    
    # 获取端口号
    port = int(os.environ.get('PORT', 5001))
    
    # 检查是否在生产环境
    is_production = (
        os.environ.get('RENDER') or 
        os.environ.get('FLASK_ENV') == 'production' or
        'onrender.com' in os.environ.get('RENDER_EXTERNAL_URL', '')
    )
    
    if is_production:
        # 生产环境：使用gunicorn
        print("🚀 启动生产服务器 (Gunicorn)")
        import subprocess
        cmd = [
            'gunicorn',
            '--bind', f'0.0.0.0:{port}',
            '--workers', str(os.environ.get('WEB_CONCURRENCY', 2)),
            '--timeout', str(os.environ.get('TIMEOUT', 30)),
            '--keep-alive', str(os.environ.get('KEEP_ALIVE', 2)),
            '--max-requests', str(os.environ.get('MAX_REQUESTS', 1000)),
            '--max-requests-jitter', str(os.environ.get('MAX_REQUESTS_JITTER', 100)),
            '--preload',
            '--access-logfile', '-',
            '--error-logfile', '-',
            'app:app'
        ]
        
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Gunicorn启动失败: {e}")
            sys.exit(1)
    else:
        # 开发环境：使用Flask开发服务器
        print("🔧 启动开发服务器 (Flask)")
        from app import app
        app.run(host='0.0.0.0', port=port, debug=True)

if __name__ == '__main__':
    main()
