# backend/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import uuid
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    """用户表"""
    __tablename__ = 'users'
    
    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    credits = db.Column(db.Integer, default=10, nullable=False)  # 新用户赠送10积分
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    
    # 关系
    usage_logs = db.relationship('UsageLog', backref='user', lazy=True)
    redeemed_codes = db.relationship('RedemptionCode', foreign_keys='RedemptionCode.used_by_user_id', backref='redeemed_by', lazy=True)
    
    def set_password(self, password):
        """设置密码哈希"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def consume_credits(self, amount):
        """消耗积分"""
        if self.credits >= amount:
            self.credits -= amount
            return True
        return False
    
    def add_credits(self, amount):
        """增加积分"""
        self.credits += amount
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'credits': self.credits,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class RedemptionCode(db.Model):
    """兑换码表"""
    __tablename__ = 'redemption_codes'
    
    code_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = db.Column(db.String(32), unique=True, nullable=False)
    credits_value = db.Column(db.Integer, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    used_by_user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)  # 过期时间，可为空表示永不过期
    
    def is_expired(self):
        """检查是否过期"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """检查兑换码是否有效"""
        return not self.is_used and not self.is_expired()
    
    def redeem(self, user_id):
        """兑换积分"""
        if not self.is_valid():
            return False
        
        self.is_used = True
        self.used_by_user_id = user_id
        self.used_at = datetime.utcnow()
        return True
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'code_id': self.code_id,
            'code': self.code,
            'credits_value': self.credits_value,
            'is_used': self.is_used,
            'used_by_user_id': self.used_by_user_id,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

class UsageLog(db.Model):
    """使用记录表"""
    __tablename__ = 'usage_logs'
    
    log_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False)
    action_type = db.Column(db.String(20), nullable=False)  # 'chat' 或 'complete_essay'
    credits_consumed = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'log_id': self.log_id,
            'user_id': self.user_id,
            'action_type': self.action_type,
            'credits_consumed': self.credits_consumed,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

def init_db(app):
    """初始化数据库"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
        print("数据库表创建成功！")

def generate_redemption_code(credits_value, expires_days=None):
    """生成兑换码"""
    code = str(uuid.uuid4()).replace('-', '').upper()[:16]  # 16位兑换码
    expires_at = None
    if expires_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    redemption_code = RedemptionCode(
        code=code,
        credits_value=credits_value,
        expires_at=expires_at
    )
    
    return redemption_code
