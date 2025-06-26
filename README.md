# 小小作家助手 - 付费版

一个基于AI的写作助手应用，支持用户注册登录、积分付费系统和兑换码管理。

## 功能特性

### 用户功能
- 用户注册和登录
- AI聊天对话辅助写作（消耗1积分/次）
- AI完成作文功能（消耗5积分/次）
- 积分余额查看
- 兑换码兑换积分
- 使用记录查看
- 个人资料管理

### 管理员功能
- 生成兑换码
- 查看系统统计
- 积分发放管理

### 安全特性
- JWT身份认证
- 密码加密存储
- 输入验证和清理
- 请求频率限制
- 跨域请求保护

## 技术栈

### 后端
- Python 3.12+
- Flask 3.1.1
- Flask-SQLAlchemy 3.1.1
- Flask-JWT-Extended 4.6.0
- Flask-CORS 6.0.0
- bcrypt 4.2.1
- SQLite/PostgreSQL

### 前端
- HTML5
- CSS3
- JavaScript (ES6+)
- 响应式设计

## 安装和部署

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd little_writers_assistant_payed

# 创建虚拟环境
cd backend
python -m venv new_venv

# 激活虚拟环境 (Windows)
new_venv\Scripts\activate

# 激活虚拟环境 (Linux/Mac)
source new_venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 环境配置

在 `backend` 目录下创建 `.env` 文件：

```env
# Claude API配置
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_API_HOST=api.gptgod.online

# 应用安全配置
SECRET_KEY=your-very-secure-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# 数据库配置（可选，默认使用SQLite）
DATABASE_URL=sqlite:///little_writers.db
```

### 3. 数据库初始化

```bash
# 初始化数据库和创建管理员账户
python init_db.py
```

默认管理员账户：
- 用户名: admin
- 密码: admin123
- **生产环境请立即修改默认密码！**

### 4. 启动应用

```bash
# 启动后端服务
python app.py
```

后端服务将在 http://127.0.0.1:5001 启动

### 5. 前端部署

将 `frontend` 目录部署到Web服务器，或使用Live Server等工具进行开发。

## 使用说明

### 用户流程
1. 访问 `auth.html` 进行注册/登录
2. 登录后自动跳转到主页面
3. 点击用户头像进入个人中心
4. 在个人中心可以兑换积分、查看使用记录
5. 返回主页使用AI写作功能

### 管理员流程
1. 使用管理员账户登录
2. 访问 `admin.html` 进入管理后台
3. 生成兑换码并发送给付费用户
4. 查看系统使用统计

### 积分系统
- 新用户注册赠送10积分
- 聊天对话：1积分/次
- 完成作文：5积分/次
- 通过兑换码充值积分

## API文档

### 认证相关
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录
- `GET /api/user/profile` - 获取用户资料

### 功能相关
- `POST /api/chat` - AI聊天（需要认证）
- `POST /api/complete_essay` - 完成作文（需要认证）

### 积分相关
- `GET /api/user/credits` - 获取积分余额
- `POST /api/redeem` - 兑换积分
- `GET /api/user/usage-history` - 使用记录
- `GET /api/user/redemption-history` - 兑换记录

### 管理员相关
- `POST /api/admin/generate-code` - 生成兑换码（管理员）
- `GET /api/admin/statistics` - 系统统计（管理员）

## 安全注意事项

### 生产环境配置
1. 修改默认密码和密钥
2. 使用HTTPS
3. 配置防火墙
4. 定期备份数据库
5. 监控系统日志

### 推荐的生产环境设置
```env
SECRET_KEY=生成一个强随机密钥
JWT_SECRET_KEY=生成另一个强随机密钥
DATABASE_URL=postgresql://user:password@localhost/dbname
```

## 故障排除

### 常见问题
1. **Token过期**: 用户需要重新登录
2. **积分不足**: 提示用户充值
3. **API调用失败**: 检查Claude API配置
4. **数据库连接失败**: 检查数据库配置

### 日志查看
应用日志会输出到控制台，包含详细的错误信息。

## 开发说明

### 项目结构
```
little_writers_assistant_payed/
├── backend/
│   ├── app.py              # 主应用文件
│   ├── models.py           # 数据库模型
│   ├── init_db.py          # 数据库初始化
│   ├── requirements.txt    # Python依赖
│   ├── services/           # 业务逻辑
│   │   ├── auth_service.py
│   │   ├── claude_service.py
│   │   └── redemption_service.py
│   └── .env               # 环境配置
├── frontend/
│   ├── index.html         # 主页面
│   ├── auth.html          # 登录注册页面
│   ├── profile.html       # 个人中心
│   ├── admin.html         # 管理后台
│   ├── css/               # 样式文件
│   └── js/                # JavaScript文件
└── README.md              # 项目说明
```

### 扩展功能建议
- 邮箱验证
- 密码找回
- 多种支付方式
- 积分有效期
- 推荐奖励系统
- 使用统计分析

## 许可证

本项目仅供学习和个人使用。

## 支持

如有问题，请查看故障排除部分或联系开发者。
