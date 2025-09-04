# 🚀 部署指南 - 免费套餐优化版

本指南将帮助您在 **Cloudflare + Render + Supabase** 免费套餐上部署小小作家助手。

## 📋 部署前准备

### 1. 账户注册
- [ ] [Cloudflare](https://cloudflare.com) 账户
- [ ] [Render](https://render.com) 账户  
- [ ] [Supabase](https://supabase.com) 账户

### 2. 环境变量准备
复制 `backend/.env.example` 为 `backend/.env` 并填入以下信息：

```bash
# 必需的环境变量
SECRET_KEY=生成一个强密码
JWT_SECRET_KEY=生成另一个强密码
SUPABASE_URL=你的Supabase项目URL
SUPABASE_ANON_KEY=你的Supabase匿名密钥
SUPABASE_SERVICE_KEY=你的Supabase服务密钥
CLAUDE_API_KEY=你的Claude API密钥
```

## 🗄️ Supabase 数据库设置

### 1. 创建项目
1. 登录 [Supabase](https://supabase.com)
2. 点击 "New Project"
3. 选择免费套餐
4. 记录项目URL和API密钥

### 2. 创建数据表
在 Supabase SQL 编辑器中执行：

```sql
-- 用户表
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    credits INTEGER DEFAULT 10,
    registration_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 兑换码表
CREATE TABLE redemption_codes (
    code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    credits_value INTEGER NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES users(user_id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用记录表
CREATE TABLE usage_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL,
    credits_consumed INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);
CREATE INDEX idx_redemption_codes_code ON redemption_codes(code);
```

### 3. 配置行级安全 (RLS)
```sql
-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own logs" ON usage_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);
```

## 🖥️ Render 后端部署

### 1. 连接GitHub仓库
1. 登录 [Render](https://render.com)
2. 点击 "New +" → "Web Service"
3. 连接你的GitHub仓库

### 2. 配置部署设置
- **Name**: `little-writers-backend`
- **Environment**: `Python 3`
- **Build Command**: 
  ```bash
  cd backend && pip install -r requirements_production.txt
  ```
- **Start Command**:
  ```bash
  cd backend && gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 30 --keep-alive 2 --max-requests 1000 --max-requests-jitter 100 app:app
  ```

### 3. 设置环境变量
在 Render 控制台的 Environment 标签页中添加：

```
FLASK_ENV=production
DEBUG=false
USE_SUPABASE=true
SECRET_KEY=你的密钥
JWT_SECRET_KEY=你的JWT密钥
SUPABASE_URL=你的Supabase URL
SUPABASE_ANON_KEY=你的Supabase匿名密钥
SUPABASE_SERVICE_KEY=你的Supabase服务密钥
CLAUDE_API_KEY=你的Claude API密钥
CLAUDE_API_HOST=api.gptgod.online
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
```

### 4. 部署
点击 "Create Web Service" 开始部署。

## 🌐 Cloudflare 前端部署

### 1. 上传前端文件
1. 登录 [Cloudflare](https://cloudflare.com)
2. 进入 "Pages"
3. 点击 "Create a project"
4. 选择 "Upload assets"
5. 上传 `frontend` 文件夹中的所有文件

### 2. 配置缓存规则
在 Cloudflare 控制台中设置页面规则：

1. **静态资源缓存**:
   - URL: `*.css`, `*.js`, `*.png`, `*.jpg`, `*.svg`
   - 缓存级别: 标准
   - 边缘缓存TTL: 1天

2. **HTML缓存**:
   - URL: `*.html`
   - 缓存级别: 标准
   - 边缘缓存TTL: 1小时

### 3. 配置Workers (可选)
1. 进入 "Workers & Pages"
2. 点击 "Create application"
3. 选择 "Create Worker"
4. 复制 `cloudflare-worker.js` 的内容
5. 部署Worker

## 🔧 配置API连接

### 1. 更新前端API地址
编辑 `frontend/js/script.js` 和 `frontend/js/auth.js`：

```javascript
// 将本地地址替换为Render部署地址
const API_BASE_URL = 'https://your-app-name.onrender.com/api';
```

### 2. 配置CORS
确保后端允许前端域名的跨域请求。

## 📊 性能优化配置

### 1. Cloudflare优化
- 启用 "Auto Minify" (CSS, JS, HTML)
- 启用 "Brotli" 压缩
- 启用 "Rocket Loader"

### 2. Render优化
- 使用 Gunicorn 多进程
- 启用 Keep-Alive
- 配置请求限制

### 3. Supabase优化
- 使用连接池
- 创建适当的索引
- 启用行级安全

## 🧪 部署验证

### 1. 后端健康检查
访问: `https://your-app.onrender.com/api/database/status`

预期响应:
```json
{
  "use_supabase": true,
  "connection_status": "connected",
  "current_database": "Supabase"
}
```

### 2. 前端功能测试
1. 访问前端URL
2. 测试用户注册
3. 测试聊天功能
4. 检查缓存是否工作

### 3. 性能测试
```bash
# 测试API响应时间
curl -w "@curl-format.txt" -o /dev/null -s "https://your-app.onrender.com/api/database/status"
```

## 🚨 故障排除

### 常见问题

1. **Render应用休眠**
   - 免费套餐15分钟无活动后休眠
   - 可以使用外部监控服务定期ping

2. **Supabase连接失败**
   - 检查URL和密钥是否正确
   - 确认数据表已创建

3. **CORS错误**
   - 检查Cloudflare Workers配置
   - 确认后端CORS设置

4. **Claude API超时**
   - 检查API密钥
   - 确认网络连接

## 📈 监控和维护

### 1. 日志监控
- Render: 查看应用日志
- Cloudflare: 查看Analytics
- Supabase: 查看数据库日志

### 2. 性能监控
- 使用内置的缓存统计接口
- 监控API响应时间
- 检查数据库查询性能

### 3. 定期维护
- 清理过期缓存
- 检查数据库存储使用量
- 更新依赖包

## 🎯 免费套餐限制

### Render限制
- CPU: 0.1 CPU
- 内存: 512MB
- 休眠: 15分钟无活动
- 构建时间: 500分钟/月

### Supabase限制
- 存储: 500MB
- API请求: 50,000/月
- 用户: 50,000 MAU

### Cloudflare限制
- 请求: 100,000/天
- Workers: 100,000请求/天

## 🚀 升级建议

当达到免费套餐限制时，建议按以下顺序升级：

1. **Render**: 升级到 $7/月 套餐
2. **Supabase**: 升级到 $25/月 套餐  
3. **Cloudflare**: 升级到 $20/月 套餐

---

**部署完成！** 🎉

您的小小作家助手现在已经在免费套餐上运行，具备了生产级的性能优化。
