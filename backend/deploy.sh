#!/bin/bash
# deploy.sh - Render部署脚本

echo "🚀 开始部署小小作家助手..."

# 设置错误时退出
set -e

# 检查Python版本
echo "📋 检查Python版本..."
python --version

# 升级pip
echo "📦 升级pip..."
python -m pip install --upgrade pip

# 安装依赖
echo "📦 安装生产环境依赖..."
pip install -r requirements_production.txt

# 检查关键依赖
echo "🔍 检查关键依赖..."
python -c "import flask; print('✅ Flask:', flask.__version__)"
python -c "import gunicorn; print('✅ Gunicorn:', gunicorn.__version__)"
python -c "from flask_compress import Compress; print('✅ Flask-Compress 可用')"

# 检查环境变量
echo "🔧 检查环境变量..."
if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  警告: SUPABASE_URL 未设置"
fi

if [ -z "$SECRET_KEY" ]; then
    echo "⚠️  警告: SECRET_KEY 未设置"
fi

if [ -z "$CLAUDE_API_KEY" ]; then
    echo "⚠️  警告: CLAUDE_API_KEY 未设置"
fi

# 测试应用启动
echo "🧪 测试应用配置..."
python -c "
from app import app
print('✅ 应用配置加载成功')
print(f'DEBUG模式: {app.config.get(\"DEBUG\")}')
print(f'数据库: {\"Supabase\" if app.config.get(\"USE_SUPABASE\") else \"SQLite\"}')
"

echo "✅ 部署准备完成！"
