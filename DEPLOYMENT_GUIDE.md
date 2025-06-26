# 小小作家助手 - 详细部署指南

本指南将帮你将项目部署到 Cloudflare Pages (前端) + Render (后端) 的生产环境。

## 📋 部署前准备清单

- [ ] GitHub 账户
- [ ] Cloudflare 账户
- [ ] Render 账户
- [ ] Claude API 密钥
- [ ] 项目代码已完成

## 🚀 第一步：准备项目文件

### 1.1 创建生产环境配置文件

在项目根目录创建 `.gitignore` 文件：
```bash
# 在项目根目录执行
echo "backend/.env
backend/new_venv/
backend/venv/
backend/__pycache__/
backend/little_writers.db
backend/services/__pycache__/
*.pyc
*.pyo
.DS_Store
node_modules/
.vscode/" > .gitignore
```

### 1.2 修改后端启动配置

编辑 `backend/app.py`，找到文件末尾的启动部分，替换为：

```python
if __name__ == '__main__':
    # 确保数据库表存在
    with app.app_context():
        db.create_all()
        print("数据库表检查完成")
    
    # 生产环境配置
    port = int(os.environ.get("PORT", 5001))
    debug_mode = os.environ.get("FLASK_ENV", "development") == "development"
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
```

### 1.3 更新CORS配置

在 `backend/app.py` 中找到CORS配置行，替换为：

```python
# 配置CORS - 生产环境
CORS(app, origins=[
    "https://*.pages.dev",  # Cloudflare Pages 域名
    "http://localhost:3000",  # 本地开发
    "http://127.0.0.1:5500",  # 本地开发
    "http://localhost:5500"   # 本地开发
])
```

## 📤 第二步：上传到GitHub

### 2.1 初始化Git仓库（如果还没有）

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: Little Writers Assistant with user auth and credit system"
```

### 2.2 创建GitHub仓库

1. 登录 GitHub
2. 点击 "New repository"
3. 仓库名：`little-writers-assistant-payed`
4. 设为 Public（或 Private，根据需要）
5. 不要初始化 README、.gitignore 或 license

### 2.3 推送代码到GitHub

```bash
# 替换为你的GitHub用户名和仓库名
git remote add origin https://github.com/YOUR_USERNAME/little-writers-assistant-payed.git
git branch -M main
git push -u origin main
```

## 🖥️ 第三步：部署后端到Render

### 3.1 登录Render

1. 访问 [render.com](https://render.com)
2. 使用GitHub账户登录
3. 授权Render访问你的GitHub仓库

### 3.2 创建Web Service

1. 点击 "New +" → "Web Service"
2. 选择你的GitHub仓库：`little-writers-assistant-payed`
3. 填写配置：

**基本设置：**
- **Name**: `little-writers-backend`
- **Region**: `Oregon (US West)` 或离你最近的区域
- **Branch**: `main`
- **Root Directory**: `backend`

**构建设置：**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python app.py`

### 3.3 配置环境变量

在 "Environment" 标签页添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CLAUDE_API_KEY` | 你的Claude API密钥 | 必填 |
| `CLAUDE_API_HOST` | `api.gptgod.online` | API主机 |
| `SECRET_KEY` | 点击"Generate"生成 | Flask密钥 |
| `JWT_SECRET_KEY` | 点击"Generate"生成 | JWT密钥 |
| `FLASK_ENV` | `production` | 生产环境 |
| `DATABASE_URL` | `sqlite:///little_writers.db` | 数据库配置 |

### 3.4 部署后端

1. 点击 "Create Web Service"
2. 等待部署完成（约3-5分钟）
3. 部署成功后，记录你的后端URL：`https://little-writers-backend.onrender.com`

### 3.5 测试后端

访问：`https://your-app-name.onrender.com`
应该看到："小小作家助手后端服务正在运行！"

## 🌐 第四步：更新前端API地址

### 4.1 更新所有JavaScript文件

需要修改以下文件中的API地址：

**文件列表：**
- `frontend/js/script.js`
- `frontend/js/auth.js`
- `frontend/js/profile.js`
- `frontend/js/admin.js`

**修改内容：**
找到每个文件中的：
```javascript
const API_BASE_URL = 'http://127.0.0.1:5001/api';
```

替换为：
```javascript
const API_BASE_URL = 'https://your-render-app-name.onrender.com/api';
```

**注意：** 将 `your-render-app-name` 替换为你在Render上的实际应用名称。

### 4.2 提交更改

```bash
git add .
git commit -m "Update API URLs for production deployment"
git push origin main
```

## ☁️ 第五步：部署前端到Cloudflare Pages

### 5.1 登录Cloudflare Pages

1. 访问 [pages.cloudflare.com](https://pages.cloudflare.com)
2. 登录你的Cloudflare账户
3. 点击 "Create a project"

### 5.2 连接GitHub

1. 选择 "Connect to Git"
2. 授权Cloudflare访问GitHub
3. 选择你的仓库：`little-writers-assistant-payed`

### 5.3 配置构建设置

**项目设置：**
- **Project name**: `little-writers-assistant`
- **Production branch**: `main`

**构建设置：**
- **Framework preset**: `None`
- **Build command**: 留空
- **Build output directory**: `frontend`
- **Root directory (advanced)**: 留空

### 5.4 部署前端

1. 点击 "Save and Deploy"
2. 等待部署完成（约1-2分钟）
3. 部署成功后，获得你的前端URL：`https://little-writers-assistant.pages.dev`

## 🔧 第六步：配置自定义域名（可选）

### 6.1 在Cloudflare Pages中

1. 进入你的项目设置
2. 点击 "Custom domains"
3. 添加你的域名
4. 按照提示配置DNS记录

### 6.2 更新CORS配置

如果使用自定义域名，需要在Render后端更新CORS配置：

1. 在Render控制台找到你的服务
2. 进入 "Environment" 标签
3. 添加环境变量：
   - `FRONTEND_URL`: `https://your-custom-domain.com`

## ✅ 第七步：验证部署

### 7.1 功能测试清单

访问你的前端URL，测试以下功能：

- [ ] 用户注册
- [ ] 用户登录
- [ ] AI聊天对话
- [ ] 完成作文功能
- [ ] 个人中心访问
- [ ] 积分兑换
- [ ] 管理员后台（使用admin/admin123登录）
- [ ] 兑换码生成

### 7.2 初始化管理员账户

1. 访问你的前端登录页面
2. 使用默认管理员账户登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. **重要：立即修改默认密码！**

## 🔒 第八步：安全配置

### 8.1 修改默认密码

1. 登录管理员账户后
2. 进入个人中心
3. 修改默认密码为强密码

### 8.2 生产环境安全检查

- [ ] 已修改默认管理员密码
- [ ] 环境变量中的密钥已设置为随机值
- [ ] CORS配置正确
- [ ] API密钥安全存储

## 📊 第九步：监控和维护

### 9.1 Render监控

- 在Render控制台查看应用日志
- 监控应用性能和响应时间
- 设置部署通知

### 9.2 Cloudflare分析

- 在Cloudflare Pages查看访问统计
- 监控页面加载性能

## 🆘 故障排除

### 常见问题及解决方案

**问题1：后端部署失败**
- 检查 `requirements.txt` 文件格式
- 确认Python版本兼容性
- 查看Render部署日志

**问题2：前端无法连接后端**
- 检查API URL是否正确
- 确认CORS配置
- 检查网络连接

**问题3：数据库初始化失败**
- 检查数据库权限
- 确认SQLite文件路径
- 查看应用日志

**问题4：JWT认证失败**
- 检查JWT密钥配置
- 确认token有效期设置
- 清除浏览器缓存

## 📞 获取帮助

如果遇到问题：

1. 查看Render应用日志
2. 检查浏览器开发者工具控制台
3. 确认所有环境变量配置正确
4. 参考本指南重新检查每个步骤

## 🎉 部署完成！

恭喜！你的小小作家助手现在已经成功部署到生产环境。

**你的应用地址：**
- 前端：`https://your-app.pages.dev`
- 后端：`https://your-app.onrender.com`

现在用户可以通过互联网访问你的应用，享受AI写作助手的服务！
