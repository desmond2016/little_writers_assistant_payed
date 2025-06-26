# 🚀 快速部署指南

## 5分钟部署到生产环境

### 第一步：准备代码 (1分钟)

```bash
# 1. 创建.gitignore
echo "backend/.env
backend/new_venv/
backend/__pycache__/
backend/little_writers.db
*.pyc" > .gitignore

# 2. 提交到GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 第二步：部署后端到Render (2分钟)

1. 访问 [render.com](https://render.com) → 登录 → New Web Service
2. 选择你的GitHub仓库
3. 配置：
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
4. 添加环境变量：
   - `CLAUDE_API_KEY`: 你的API密钥
   - `CLAUDE_API_HOST`: `api.gptgod.online`
   - 其他变量点击"Generate"自动生成
5. 点击"Create Web Service"

### 第三步：更新API地址 (30秒)

```bash
# 使用脚本快速更新（替换your-app-name为你的Render应用名）
python update-api-urls.py your-app-name

# 提交更改
git add .
git commit -m "Update API URLs for production"
git push origin main
```

### 第四步：部署前端到Cloudflare (1分钟)

1. 访问 [pages.cloudflare.com](https://pages.cloudflare.com) → Create project
2. 连接GitHub → 选择仓库
3. 配置：
   - **Build output directory**: `frontend`
   - 其他保持默认
4. 点击"Save and Deploy"

### 第五步：测试 (30秒)

访问你的Cloudflare Pages URL，测试：
- 注册新用户
- 登录测试
- AI聊天功能

## 🔑 重要信息

**默认管理员账户：**
- 用户名：`admin`
- 密码：`admin123`
- ⚠️ **部署后立即修改密码！**

**你的应用地址：**
- 前端：`https://your-app.pages.dev`
- 后端：`https://your-app.onrender.com`

## 🆘 遇到问题？

1. **后端部署失败**：检查Render日志
2. **前端连接失败**：确认API地址更新正确
3. **登录问题**：清除浏览器缓存

详细指南请查看 `DEPLOYMENT_GUIDE.md`
