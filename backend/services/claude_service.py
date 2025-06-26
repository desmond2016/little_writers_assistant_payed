# backend/services/claude_service.py
import http.client
import json
import os
from dotenv import load_dotenv # 用于加载 .env 文件中的环境变量

# 在脚本的开头加载 .env 文件中的环境变量
# 这样在本地开发时，os.environ.get 就能获取到 .env 文件中定义的变量
# 在 Render 等部署平台上，环境变量会由平台直接设置
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env')) # 指向 backend/.env

# 从环境变量中获取API密钥和API主机地址
CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY")
CLAUDE_API_HOST = os.environ.get("CLAUDE_API_HOST", "api.gptgod.online")
CLAUDE_API_ENDPOINT = "/v1/chat/completions"

# 系统提示，用于引导Claude的行为
DEFAULT_SYSTEM_PROMPT = """
你是"小小作家助手"，一个友善且富有启发性的写作导师，专门帮助小学生和中学生写作文。
你的任务是通过苏格拉底式的提问，一步步引导学生思考，将他们脑中的模糊想法变得清晰、具体，并形成有条理的作文内容。
你需要：
1.  一次只问一个开放性的问题，鼓励学生多思考、多表达。
2.  耐心倾听学生的回答，并基于他们的回答进行追问，帮助他们深入挖掘自己的想法和感受。
3.  在合适的时机，可以简单介绍一些实用的写作方法（比如：如何进行细节描写、如何组织段落、如何运用比喻等），并提问学生打算如何运用这些方法。
4.  保持积极鼓励的语气，让学生在轻松的氛围中学习写作。
5.  不要直接替学生写作文，而是引导他们自己发现观点、组织材料、运用语言。
6.  当学生表达了一个完整的想法或者完成了一个段落的构思后，可以进行小结，并询问他们接下来想写什么。
7.  请务必全程使用简体中文进行交流，不要输出任何英文单词或句子。
"""

# 新的系统提示，用于"完成作文"功能
COMPLETE_ESSAY_SYSTEM_PROMPT = """
你是一位优秀的作文编辑老师。现在你收到了一段学生与"小小作家助手"之间的对话记录。
你的任务是：
1.  仔细阅读并理解这段完整的对话历史。
2.  基于这段对话中学生表达的想法、AI的引导和建议，以及逐步形成的作文思路。
3.  将这些零散的对话内容，综合、提炼并润色，整理成一篇结构完整、语言流畅、符合中小学生水平和口吻的中文作文。
4.  作文内容必须严格基于提供的对话历史，不要随意添加对话中未提及的全新内容或情节。
5.  确保作文的开头、主体和结尾都得到体现，并且逻辑连贯。
6.  如果对话中提到了具体的作文题目，请在作文的开头或者合适的位置体现出来。
7.  请直接输出整理好的作文正文，不需要额外的开场白或总结语。
8.  请务必确保生成的作文内容全部为简体中文，不包含任何英文单词或句子。
"""

def call_claude_api(messages_history, temperature=0.7, model="claude-3-7-sonnet-20250219"):
    """
    调用 Claude API 获取回复。

    Args:
        messages_history (list): 包含对话历史的列表，每个元素是一个字典，
                                 格式如 {"role": "user", "content": "你好"} 或
                                 {"role": "assistant", "content": "你好！有什么可以帮您？"}
                                 这个列表应该由调用者（如 Flask app）构建。
                                 如果此列表的第一个消息不是 system role,
                                 则会默认添加 DEFAULT_SYSTEM_PROMPT。
        temperature (float): 控制生成文本的随机性。
        model (str): 使用的Claude模型名称。

    Returns:
        tuple: (success_boolean, response_data_or_error_message)
               成功时，response_data_or_error_message 是Claude回复的内容字符串。
               失败时，response_data_or_error_message 是错误信息字符串。
    """
    if not CLAUDE_API_KEY:
        # 在本地开发环境中允许无密钥以离线模式运行，避免前端报错循环
        last_user_msg = messages_history[-1]["content"] if messages_history else "你好！"
        placeholder_reply = f"[本地离线模式回复] 收到你的消息：{last_user_msg}"
        print("警告：未检测到 CLAUDE_API_KEY，已启用离线占位回复模式。")
        return True, placeholder_reply

    final_messages = []
    # 检查传入的 messages_history 是否已经包含 system prompt
    # generate_completed_essay 会传入一个以 system prompt 开头的 messages_history
    # 常规聊天则可能不包含，此时需要添加默认的
    has_system_prompt = any(msg.get("role") == "system" for msg in messages_history)
    
    if not has_system_prompt:
        final_messages.append({"role": "system", "content": DEFAULT_SYSTEM_PROMPT})
    
    final_messages.extend(messages_history)

    payload = {
        "temperature": temperature,
        "messages": final_messages,
        "model": model,
        "stream": False
    }

    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {CLAUDE_API_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        conn = http.client.HTTPSConnection(CLAUDE_API_HOST)
        conn.request("POST", CLAUDE_API_ENDPOINT, json.dumps(payload), headers)
        res = conn.getresponse()
        response_body = res.read().decode("utf-8")
        conn.close()

        if res.status >= 200 and res.status < 300:
            data = json.loads(response_body)
            if data.get("choices") and isinstance(data["choices"], list) and len(data["choices"]) > 0:
                message = data["choices"][0].get("message", {})
                content = message.get("content")
                if content:
                    return True, content
                else:
                    print(f"Claude API响应解析错误: 'choices'内部结构不符合预期或'content'未找到。响应: {data}")
                    return False, f"无法从AI回复中提取内容（结构不符）。响应：{str(data)[:200]}..."
            elif data.get("error") and data["error"].get("message"): # 检查API是否直接返回错误
                print(f"Claude API 返回错误: {data['error']['message']}")
                return False, data["error"]["message"]
            else:
                print(f"Claude API响应解析错误: 未知的成功响应结构。响应: {data}")
                return False, f"AI返回了未知格式的数据。请检查后端日志。响应开始：{str(data)[:200]}..."
        else:
            error_message = f"AI服务请求失败 (状态码: {res.status})。"
            try:
                error_data = json.loads(response_body)
                if error_data.get("error") and error_data["error"].get("message"):
                    error_message = f"AI服务错误: {error_data['error']['message']} (状态码: {res.status})"
                elif error_data.get("message"):
                     error_message = f"AI服务错误: {error_data.get('message')} (状态码: {res.status})"
            except json.JSONDecodeError:
                error_message = f"AI服务请求失败 (状态码: {res.status})。响应: {response_body[:200]}..."
            print(error_message)
            return False, error_message

    except http.client.HTTPException as e:
        print(f"HTTP连接错误: {e}")
        return False, f"网络连接到AI服务失败: {e}"
    except json.JSONDecodeError as e:
        response_body_for_error = response_body if 'response_body' in locals() else "N/A"
        print(f"JSON解析错误: {e}. 响应体: {response_body_for_error[:200]}...")
        return False, f"AI服务返回的数据格式无法解析。响应开始: {response_body_for_error[:200]}..."
    except Exception as e:
        print(f"调用Claude API时发生未知错误: {e}")
        return False, f"与AI服务通信时发生内部错误: {e}"


def generate_completed_essay(conversation_history):
    """
    根据对话历史，调用 Claude API 生成一篇完整的作文。

    Args:
        conversation_history (list): 包含完整对话历史的列表。

    Returns:
        tuple: (success_boolean, essay_text_or_error_message)
    """
    if not CLAUDE_API_KEY:
        print("错误：CLAUDE_API_KEY 未在环境变量中设置。")
        return False, "API密钥未配置，请联系管理员。"

    if not conversation_history:
        return False, "对话历史为空，无法生成作文。"

    messages_for_completion = [
        {"role": "system", "content": COMPLETE_ESSAY_SYSTEM_PROMPT}
    ]
    messages_for_completion.extend(conversation_history)
    
    # 调用通用的 call_claude_api 函数
    success, response_content = call_claude_api(messages_for_completion)

    if success:
        return True, response_content
    else:
        return False, f"AI生成作文时遇到问题: {response_content}"


if __name__ == '__main__':
    if not CLAUDE_API_KEY:
        print("请先在 backend/.env 文件中设置 CLAUDE_API_KEY 环境变量以进行测试。")
        print("例如: CLAUDE_API_KEY='your_actual_api_key'")
    else:
        print("测试常规聊天调用Claude API...")
        test_messages_initial = [
            {"role": "user", "content": "你好，请只用中文回答。"}
        ]
        success, response = call_claude_api(test_messages_initial)
        if success:
            print(f"\nClaude的回复 (初始对话): \n{response}")
        else:
            print(f"\nAPI调用失败 (初始对话): {response}")

        print("\n测试生成完整作文调用Claude API...")
        test_history_for_essay = [
            {"role": "user", "content": "我想写一篇关于夏天的日记。"},
            {"role": "assistant", "content": "好啊！夏天有什么让你印象深刻的事情吗？"},
            {"role": "user", "content": "天气很热，我吃了很多冰淇淋。"},
            {"role": "assistant", "content": "听起来很棒！除了吃冰淇淋，还有其他有趣的活动吗？比如游泳或者去公园玩？"},
            {"role": "user", "content": "我还和朋友们一起去游泳了，特别开心。"}
        ]
        success_essay, essay_content = generate_completed_essay(test_history_for_essay)
        if success_essay:
            print(f"\n生成的作文内容: \n{essay_content}")
        else:
            print(f"\n生成作文失败: {essay_content}")
