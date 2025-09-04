def get_current_user_unified():
    """统一的用户获取函数，支持SQLite和Supabase"""
    if USE_SUPABASE:
        return get_current_user_supabase()
    else:
        return get_current_user()

def get_user_credits_unified(user):
    """统一的积分获取函数"""
    if USE_SUPABASE:
        return user.get('credits', 0) if user else 0
    else:
        return user.credits if user else 0

def get_user_id_unified(user):
    """统一的用户ID获取函数"""
    if USE_SUPABASE:
        return user.get('user_id') if user else None
    else:
        return user.user_id if user else None
def update_user_credits_unified(user_id, credits_change, action_type="manual"):
    """统一的积分更新函数，支持SQLite和Supabase"""
    if USE_SUPABASE:
        from services.supabase_auth_service import update_user_credits_supabase
        return update_user_credits_supabase(user_id, credits_change, action_type)
    else:
        return update_user_credits(user_id, credits_change, action_type)
# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS # 用于处理跨域请求
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_compress import Compress
import os
from datetime import timedelta
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 导入配置
from config import get_config

# 从我们创建的 services 模块中导入函数
from services.claude_service import call_claude_api, DEFAULT_SYSTEM_PROMPT, generate_completed_essay
from services.auth_service import register_user, login_user, get_current_user, get_user_profile, update_user_credits
from services.redemption_service import redeem_code, get_user_redemption_history, validate_redemption_code, create_redemption_code, get_usage_statistics

# 导入数据库模型
from models import db, init_db

# 导入缓存工具
from utils.cache_utils import cache_user_data, cache_api_response, invalidate_user_cache, get_cache_stats

# 添加Supabase服务导入和配置开关
try:
    from services.supabase_auth_service import register_user_supabase, login_user_supabase
    from services.supabase_auth_service import get_current_user_supabase, get_user_profile_supabase
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("警告: Supabase服务不可用，将使用SQLite数据库")

# Supabase配置开关
USE_SUPABASE = os.environ.get('USE_SUPABASE', 'false').lower() == 'true' and SUPABASE_AVAILABLE
MIGRATION_MODE = os.environ.get('MIGRATION_MODE', 'false').lower() == 'true'

print(f"数据库配置: USE_SUPABASE={USE_SUPABASE}, MIGRATION_MODE={MIGRATION_MODE}")

# 初始化 Flask 应用
app = Flask(__name__)

# 加载配置
config_class = get_config()
app.config.from_object(config_class)

# 初始化扩展
jwt = JWTManager(app)
db.init_app(app)
compress = Compress(app)

# 配置CORS (Cross-Origin Resource Sharing)
CORS(app, origins=app.config.get('CORS_ORIGINS', ['*']))

# JWT错误处理
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"error": "Token已过期，请重新登录"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"error": "无效的Token"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"error": "需要登录才能访问"}), 401

# 辅助函数
def is_admin_user(user):
    """检查用户是否为管理员 - 支持SQLite和Supabase格式"""
    if not user:
        return False

    # SQLite格式 (User对象)
    if hasattr(user, 'username'):
        return user.username == 'admin'

    # Supabase格式 (字典)
    if isinstance(user, dict):
        return user.get('username') == 'admin'

    return False

def validate_input_length(text, max_length=1000):
    """验证输入长度"""
    return text and len(text.strip()) <= max_length

def sanitize_input(text):
    """清理输入文本"""
    if not text:
        return ""
    return text.strip()[:1000]  # 限制最大长度

# 根路由
@app.route('/')
def index():
    return "小小作家助手后端服务正在运行！"

# 用户认证相关路由
@app.route('/api/register', methods=['POST'])
def register():
    """用户注册 - 支持Supabase切换"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not all([username, email, password]):
            return jsonify({"error": "用户名、邮箱和密码都是必填项"}), 400

        # 获取客户端IP
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()

        # 根据配置选择数据库
        if USE_SUPABASE:
            success, message, user_data = register_user_supabase(username, email, password, ip_address)
        else:
            success, message, user_data = register_user(username, email, password)

        if success:
            return jsonify({
                "message": message,
                "user": user_data,
                "database": "Supabase" if USE_SUPABASE else "SQLite"
            }), 201
        else:
            return jsonify({"error": message}), 400

    except Exception as e:
        app.logger.error(f"注册请求处理失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """用户登录 - 支持Supabase切换"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        username = data.get('username')  # 可以是用户名或邮箱
        password = data.get('password')

        if not all([username, password]):
            return jsonify({"error": "用户名和密码都是必填项"}), 400

        # 获取客户端IP
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()

        # 根据配置选择数据库
        if USE_SUPABASE:
            success, message, token, user_data = login_user_supabase(username, password, ip_address)
        else:
            success, message, token, user_data = login_user(username, password)

        if success:
            return jsonify({
                "message": message,
                "access_token": token,
                "user": user_data,
                "database": "Supabase" if USE_SUPABASE else "SQLite"
            }), 200
        else:
            return jsonify({"error": message}), 401

    except Exception as e:
        app.logger.error(f"登录请求处理失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
@cache_user_data(ttl=600)  # 缓存10分钟
def get_profile():
    """获取用户资料"""
    try:
        current_user_id = get_jwt_identity()

        if USE_SUPABASE:
            success, message, user_data = get_user_profile_supabase(current_user_id)
        else:
            success, message, user_data = get_user_profile(current_user_id)

        if success:
            return jsonify({
                "message": message,
                "user": user_data
            }), 200
        else:
            return jsonify({"error": message}), 404

    except Exception as e:
        app.logger.error(f"获取用户资料失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/redeem', methods=['POST'])
@jwt_required()
def redeem():
    """兑换积分"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        code = data.get('code')
        if not code:
            return jsonify({"error": "兑换码不能为空"}), 400

        current_user_id = get_jwt_identity()
        success, message, credits_gained = redeem_code(code, current_user_id)

        if success:
            return jsonify({
                "message": message,
                "credits_gained": credits_gained
            }), 200
        else:
            return jsonify({"error": message}), 400

    except Exception as e:
        app.logger.error(f"兑换积分失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/redemption-history', methods=['GET'])
@jwt_required()
def get_redemption_history():
    """获取用户兑换记录"""
    try:
        current_user_id = get_jwt_identity()
        success, message, history = get_user_redemption_history(current_user_id)

        if success:
            return jsonify({
                "message": message,
                "history": history
            }), 200
        else:
            return jsonify({"error": message}), 400

    except Exception as e:
        app.logger.error(f"获取兑换记录失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/usage-history', methods=['GET'])
@jwt_required()
def get_usage_history():
    """获取用户使用记录"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({"error": "用户不存在"}), 404

        from models import UsageLog
        usage_logs = UsageLog.query.filter_by(user_id=current_user.user_id)\
                                  .order_by(UsageLog.timestamp.desc())\
                                  .limit(50).all()  # 最近50条记录

        history = [log.to_dict() for log in usage_logs]

        return jsonify({
            "message": "获取成功",
            "history": history
        }), 200

    except Exception as e:
        app.logger.error(f"获取使用记录失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/credits', methods=['GET'])
@jwt_required()
def get_credits():
    """获取用户积分余额"""
    try:
        current_user_id = get_jwt_identity()
        
        if USE_SUPABASE:
            current_user = get_current_user_supabase()
        else:
            current_user = get_current_user()

        if current_user:
            if USE_SUPABASE:
                credits = current_user.get('credits', 0)
                user_id = current_user.get('user_id')
            else:
                credits = current_user.credits
                user_id = current_user.user_id
                
            return jsonify({
                "credits": credits,
                "user_id": user_id
            }), 200
        else:
            return jsonify({"error": "用户不存在"}), 404

    except Exception as e:
        app.logger.error(f"获取用户积分失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

# 管理员相关API
@app.route('/api/admin/generate-code', methods=['POST'])
@jwt_required()
def admin_generate_code():
    """管理员生成兑换码"""
    try:
        current_user = get_current_user_unified()
        if not is_admin_user(current_user):
            return jsonify({"error": "权限不足"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        credits_value = data.get('credits_value')
        expires_days = data.get('expires_days')

        if not credits_value or credits_value <= 0:
            return jsonify({"error": "积分价值必须大于0"}), 400

        success, message, code_data = create_redemption_code(
            credits_value, expires_days, current_user.user_id
        )

        if success:
            return jsonify({
                "message": message,
                "code": code_data
            }), 201
        else:
            return jsonify({"error": message}), 400

    except Exception as e:
        app.logger.error(f"生成兑换码失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/admin/statistics', methods=['GET'])
@jwt_required()
def admin_get_statistics():
    """管理员获取使用统计"""
    try:
        current_user = get_current_user_unified()
        if not is_admin_user(current_user):
            return jsonify({"error": "权限不足"}), 403

        success, message, stats = get_usage_statistics()

        if success:
            return jsonify({
                "message": message,
                "statistics": stats
            }), 200
        else:
            return jsonify({"error": message}), 400

    except Exception as e:
        app.logger.error(f"获取统计信息失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    """管理员获取用户列表"""
    try:
        current_user = get_current_user_unified()
        if not is_admin_user(current_user):
            return jsonify({"error": "权限不足"}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '', type=str)

        if USE_SUPABASE:
            # Supabase实现
            from services.supabase_client import SupabaseClient
            supabase = SupabaseClient()

            # 构建查询参数
            params = {
                'order': 'created_at.desc',
                'limit': per_page,
                'offset': (page - 1) * per_page
            }

            # 搜索功能
            if search:
                params['or'] = f'username.ilike.%{search}%,email.ilike.%{search}%'

            success, users_data = supabase._make_request('GET', 'users', params=params)

            if success:
                # 获取总数 - 简化实现
                total = len(users_data) if users_data else 0

                return jsonify({
                    "message": "获取成功",
                    "users": users_data,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total": total,
                        "pages": max(1, (total + per_page - 1) // per_page),
                        "has_next": len(users_data) == per_page,
                        "has_prev": page > 1
                    }
                }), 200
            else:
                return jsonify({"error": "获取用户列表失败"}), 500
        else:
            # SQLite实现
            from models import User
            query = User.query

            # 搜索功能
            if search:
                query = query.filter(
                    (User.username.contains(search)) |
                    (User.email.contains(search))
                )

            # 分页
            users = query.order_by(User.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )

            return jsonify({
                "message": "获取成功",
                "users": [user.to_dict() for user in users.items],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": users.total,
                    "pages": users.pages,
                    "has_next": users.has_next,
                    "has_prev": users.has_prev
                }
            }), 200

    except Exception as e:
        app.logger.error(f"获取用户列表失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/admin/users/<user_id>', methods=['PATCH'])
@jwt_required()
def admin_update_user(user_id):
    """管理员更新用户信息"""
    try:
        current_user = get_current_user_unified()
        if not is_admin_user(current_user):
            return jsonify({"error": "权限不足"}), 403

        from models import User
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "用户不存在"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        # 更新积分
        if 'credits' in data:
            credits = data.get('credits')
            if isinstance(credits, int) and credits >= 0:
                user.credits = credits

        # 更新邮箱
        if 'email' in data:
            email = data.get('email')
            if email and email != user.email:
                # 检查邮箱是否已被其他用户使用
                existing_user = User.query.filter_by(email=email).first()
                if existing_user and existing_user.user_id != user_id:
                    return jsonify({"error": "邮箱已被其他用户使用"}), 400
                user.email = email

        db.session.commit()

        return jsonify({
            "message": "用户信息更新成功",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"更新用户信息失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/change-password', methods=['POST'])
@jwt_required()
def user_change_password():
    """用户修改密码"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({"error": "用户不存在"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not all([current_password, new_password]):
            return jsonify({"error": "当前密码和新密码都是必填项"}), 400

        # 验证当前密码
        if not current_user.check_password(current_password):
            return jsonify({"error": "当前密码错误"}), 400

        # 验证新密码格式
        from services.auth_service import validate_password
        if not validate_password(new_password):
            return jsonify({"error": "新密码至少6位，且包含字母和数字"}), 400

        # 更新密码
        current_user.set_password(new_password)
        db.session.commit()

        return jsonify({"message": "密码修改成功"}), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"修改密码失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/chat', methods=['POST'])
@jwt_required()  # 添加JWT保护
def chat_handler():
    """
    处理来自前端的聊天请求。
    接收用户消息和对话历史，调用Claude API，并返回AI的回复。
    现在需要消耗1积分。
    """
    try:
        # 检查用户积分
        if USE_SUPABASE:
         current_user = get_current_user_supabase()
        else:
         current_user = get_current_user()
        if not current_user:
            return jsonify({"error": "用户不存在"}), 404

        user_credits = get_user_credits_unified(current_user)
        if user_credits < 1:
            return jsonify({"error": "积分不足，请先充值"}), 402

        data = request.get_json() # 获取前端发送的JSON数据
        if not data:
            return jsonify({"error": "请求体不能为空，且必须是JSON格式"}), 400

        user_message_content = data.get('message') # 用户当前发送的消息内容
        # 对话历史，期望格式为 [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        conversation_history = data.get('history', [])

        if not user_message_content:
            return jsonify({"error": "请求中必须包含 'message' 字段"}), 400

        # 输入验证和清理
        user_message_content = sanitize_input(user_message_content)
        if not validate_input_length(user_message_content):
            return jsonify({"error": "消息内容过长或为空"}), 400

        if not isinstance(conversation_history, list):
            return jsonify({"error": "'history' 字段必须是一个列表"}), 400
        for msg in conversation_history:
            if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
                return jsonify({"error": "历史记录中的每条消息都必须包含 'role' 和 'content' 字段"}), 400

        # 构建发送给Claude的消息历史
        messages_to_send = conversation_history + [
            {"role": "user", "content": user_message_content}
        ]

        # 调用Claude API
        success, response_content = call_claude_api(messages_to_send)

        if success:
            # AI成功回复，扣除积分
            user_id = get_user_id_unified(current_user)
            credits_success, credits_message, new_credits = update_user_credits_unified(
                user_id, -1, "chat"
            )

            if not credits_success:
                app.logger.error(f"扣除积分失败: {credits_message}")
                return jsonify({"error": "积分扣除失败"}), 500

            # 更新后的历史应包含AI的这条新回复
            updated_history = conversation_history + [
                {"role": "user", "content": user_message_content}, # 用户的消息
                {"role": "assistant", "content": response_content} # AI的回复
            ]
            return jsonify({
                "reply": response_content,
                "history": updated_history, # 将更新后的完整历史返回给前端
                "credits_remaining": new_credits  # 返回剩余积分
            }), 200
        else:
            # AI调用失败，返回错误信息
            # response_content 在失败时是错误消息字符串
            return jsonify({"error": response_content}), 500

    except Exception as e:
        app.logger.error(f"处理 /api/chat 请求时发生意外错误: {e}") # 记录更详细的服务器端错误日志
        return jsonify({"error": "服务器内部发生未知错误，请稍后再试。"}), 500

@app.route('/api/complete_essay', methods=['POST'])
@jwt_required()  # 添加JWT保护
def complete_essay_handler():
    """
    处理来自前端的"完成作文"请求。
    接收对话历史，调用服务生成完整作文，并返回结果。
    现在需要消耗5积分。
    """
    try:
        # 检查用户积分
        current_user = get_current_user_unified()
        if not current_user:
            return jsonify({"error": "用户不存在"}), 404

        user_credits = get_user_credits_unified(current_user)
        if user_credits < 5:
            return jsonify({"error": "积分不足，完成作文需要5积分"}), 402

        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空，且必须是JSON格式"}), 400

        conversation_history = data.get('history') # 前端发送的是完整的对话历史

        if conversation_history is None or not isinstance(conversation_history, list):
            # 注意：允许空列表，因为 generate_completed_essay 内部会处理历史为空的情况
            # 但通常前端 script.js 中已做了非空判断
            return jsonify({"error": "请求中必须包含 'history' 字段，且其值必须是一个列表"}), 400

        # 调用新的服务函数来生成完整作文
        success, essay_or_error = generate_completed_essay(conversation_history)

        if success:
            # 生成成功，扣除积分
            user_id = get_user_id_unified(current_user)
            credits_success, credits_message, new_credits = update_user_credits(
                user_id, -5, "complete_essay"
            )
            

            if not credits_success:
                app.logger.error(f"扣除积分失败: {credits_message}")
                return jsonify({"error": "积分扣除失败"}), 500

            return jsonify({
                "completed_essay": essay_or_error,
                "credits_remaining": new_credits  # 返回剩余积分
            }), 200
        else:
            # essay_or_error 在失败时是错误消息字符串
            app.logger.error(f"生成完整作文失败: {essay_or_error}") # 记录服务器端错误
            return jsonify({"error": essay_or_error}), 500

    except Exception as e:
        app.logger.error(f"处理 /api/complete_essay 请求时发生意外错误: {e}")
        return jsonify({"error": "服务器内部在生成作文时发生未知错误。"}), 500

@app.route('/api/database/status', methods=['GET'])
def database_status():
    """获取数据库状态信息"""
    try:
        from datetime import datetime
        status = {
            "use_supabase": USE_SUPABASE,
            "migration_mode": MIGRATION_MODE,
            "supabase_available": SUPABASE_AVAILABLE,
            "current_database": "Supabase" if USE_SUPABASE else "SQLite",
            "timestamp": datetime.utcnow().isoformat()
        }

        # 检查数据库连接
        if USE_SUPABASE:
            try:
                from services.supabase_client import SupabaseClient
                supabase = SupabaseClient()
                # 简单的连接测试
                success, result = supabase._make_request('GET', 'users', params={'limit': 1})
                status["connection_status"] = "connected" if success else "failed"
                status["connection_error"] = result.get("error") if not success else None
            except Exception as e:
                status["connection_status"] = "failed"
                status["connection_error"] = str(e)
        else:
            try:
                from models import User
                User.query.limit(1).all()
                status["connection_status"] = "connected"
            except Exception as e:
                status["connection_status"] = "failed"
                status["connection_error"] = str(e)

        return jsonify(status), 200

    except Exception as e:
        app.logger.error(f"获取数据库状态失败: {e}")
        return jsonify({"error": "获取数据库状态失败"}), 500

@app.route('/api/cache/stats', methods=['GET'])
def cache_stats():
    """获取缓存统计信息"""
    try:
        stats = get_cache_stats()
        return jsonify({
            "message": "缓存统计获取成功",
            "stats": stats
        }), 200
    except Exception as e:
        app.logger.error(f"获取缓存统计失败: {e}")
        return jsonify({"error": "获取缓存统计失败"}), 500

@app.route('/api/cache/clear', methods=['POST'])
@jwt_required()
def clear_cache():
    """清除缓存（需要管理员权限）"""
    try:
        current_user = get_current_user_unified()
        if not is_admin_user(current_user):
            return jsonify({"error": "权限不足"}), 403

        from utils.cache_utils import clear_all_cache
        clear_all_cache()

        return jsonify({"message": "缓存清除成功"}), 200
    except Exception as e:
        app.logger.error(f"清除缓存失败: {e}")
        return jsonify({"error": "清除缓存失败"}), 500

if __name__ == '__main__':
    # 确保数据库表存在
    with app.app_context():
        db.create_all()
        print("数据库表检查完成")

    # 使用环境变量中的端口，或者默认为5001 (Render等平台会自动分配端口)
    port = int(os.environ.get("PORT", 5001))
    # 启动Flask开发服务器
    # debug=True 在开发时很有用，但在生产环境中应设为False或通过环境变量控制
    app.run(host='0.0.0.0', port=port, debug=True)