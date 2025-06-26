# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS # 用于处理跨域请求
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
import os
from datetime import timedelta
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从我们创建的 services 模块中导入函数
from services.claude_service import call_claude_api, DEFAULT_SYSTEM_PROMPT, generate_completed_essay
from services.auth_service import register_user, login_user, get_current_user, get_user_profile, update_user_credits
from services.redemption_service import redeem_code, get_user_redemption_history, validate_redemption_code, create_redemption_code, get_usage_statistics

# 导入数据库模型
from models import db, init_db

# 初始化 Flask 应用
app = Flask(__name__)

# 应用配置
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)  # JWT token有效期

# 数据库配置
database_url = os.environ.get('DATABASE_URL', 'sqlite:///little_writers.db')
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化扩展
jwt = JWTManager(app)
db.init_app(app)

# 配置CORS (Cross-Origin Resource Sharing)
CORS(app) # 允许所有来源的跨域请求

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
    """检查用户是否为管理员"""
    return user and user.username == 'admin'

def validate_input_length(text, max_length=1000):
    """验证输入长度"""
    return text and len(text.strip()) <= max_length

def sanitize_input(text):
    """清理输入文本"""
    if not text:
        return ""
    return text.strip()[:1000]  # 限制最大长度

# 用户认证相关路由
@app.route('/api/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not all([username, email, password]):
            return jsonify({"error": "用户名、邮箱和密码都是必填项"}), 400

        success, message, user_data = register_user(username, email, password)

        if success:
            return jsonify({
                "message": message,
                "user": user_data
            }), 201
        else:
            return jsonify({"error": message}), 400

    except Exception as e:
        app.logger.error(f"注册请求处理失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400

        username = data.get('username')  # 可以是用户名或邮箱
        password = data.get('password')

        if not all([username, password]):
            return jsonify({"error": "用户名和密码都是必填项"}), 400

        success, message, token, user_data = login_user(username, password)

        if success:
            return jsonify({
                "message": message,
                "access_token": token,
                "user": user_data
            }), 200
        else:
            return jsonify({"error": message}), 401

    except Exception as e:
        app.logger.error(f"登录请求处理失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """获取用户资料"""
    try:
        current_user_id = get_jwt_identity()
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

@app.route('/api/user/credits', methods=['GET'])
@jwt_required()
def get_credits():
    """获取用户积分余额"""
    try:
        current_user_id = get_jwt_identity()
        user = get_current_user()

        if user:
            return jsonify({
                "credits": user.credits,
                "user_id": user.user_id
            }), 200
        else:
            return jsonify({"error": "用户不存在"}), 404

    except Exception as e:
        app.logger.error(f"获取用户积分失败: {e}")
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/api/user/redemption-history', methods=['GET'])
@jwt_required()
def get_redemption_history():
    """获取用户兑换历史"""
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
        app.logger.error(f"获取兑换历史失败: {e}")
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

# 管理员相关API
@app.route('/api/admin/generate-code', methods=['POST'])
@jwt_required()
def admin_generate_code():
    """管理员生成兑换码"""
    try:
        current_user = get_current_user()
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
        current_user = get_current_user()
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
        current_user = get_current_user()
        if not current_user:
            return jsonify({"error": "用户不存在"}), 404

        if current_user.credits < 1:
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


        # 构造发送给 Claude API 的消息列表
        # 这里的逻辑是：如果前端没有发送任何历史记录（即第一次提问），
        # 我们将添加系统提示和用户的第一条消息。
        # 如果前端发送了历史记录，我们假设历史记录中可能已经包含了系统提示（或者前端自己管理），
        # 然后追加用户的当前消息。
        # claude_service.py 中的 call_claude_api 也会检查并确保 system prompt 存在。

        messages_for_claude = []
        
        # 检查历史记录中是否已有 system prompt
        has_system_prompt_in_history = any(msg.get("role") == "system" for msg in conversation_history)

        if not conversation_history and not has_system_prompt_in_history:
            # 这是全新的对话，添加系统提示
            messages_for_claude.append({"role": "system", "content": DEFAULT_SYSTEM_PROMPT})
        
        # 添加已有的对话历史
        messages_for_claude.extend(conversation_history)
        
        # 添加用户当前的新消息
        messages_for_claude.append({"role": "user", "content": user_message_content})
        
        # 调用 claude_service 中的函数
        success, response_content = call_claude_api(messages_for_claude)

        if success:
            # AI成功回复，扣除积分
            credits_success, credits_message, new_credits = update_user_credits(
                current_user.user_id, -1, "chat"
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

# 一个简单的根路由，用于测试服务是否正在运行
@app.route('/')
# backend/app.py
# ... (保持文件顶部的 import 和现有的路由函数不变) ...

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
        current_user = get_current_user()
        if not current_user:
            return jsonify({"error": "用户不存在"}), 404

        if current_user.credits < 5:
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
            credits_success, credits_message, new_credits = update_user_credits(
                current_user.user_id, -5, "complete_essay"
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

# ... (保持 if __name__ == '__main__': 部分不变) ...

def index():
    return "小小作家助手后端服务正在运行！"

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