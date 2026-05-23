"""用户存储（JSON文件存储，后续可迁移到PostgreSQL）"""
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from app.core.config import settings
from app.core.logger import logger
from app.modules.auth.schemas import (
    UserCreate, UserUpdate, UserResponse, UserStatus, UserRole
)
from app.modules.auth.security import get_password_hash, verify_password


USERS_FILE = Path(settings.MODEL_DIR).parent / "data" / "users.json"


def _ensure_file():
    """确保数据文件存在"""
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, ensure_ascii=False, indent=2)


def _load_users() -> dict:
    """加载所有用户"""
    _ensure_file()
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"加载用户数据失败: {e}")
        return {}


def _save_users(users: dict):
    """保存用户数据"""
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"保存用户数据失败: {e}")


def get_user(username: str) -> Optional[dict]:
    """根据用户名获取用户"""
    users = _load_users()
    return users.get(username)


def get_user_by_id(user_id: str) -> Optional[dict]:
    """根据ID获取用户"""
    users = _load_users()
    for user in users.values():
        if user.get("id") == user_id:
            return user
    return None


def create_user(user_data: UserCreate) -> UserResponse:
    """创建新用户"""
    users = _load_users()

    if user_data.username in users:
        raise ValueError(f"用户名 {user_data.username} 已存在")

    user_id = f"user_{int(datetime.now().timestamp() * 1000)}"
    now = datetime.now().isoformat()

    user_dict = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": get_password_hash(user_data.password),
        "role": user_data.role.value,
        "department": user_data.department,
        "status": UserStatus.ACTIVE.value,
        "created_at": now,
        "last_login": None,
        "notification_settings": {  # 默认通知设置
            "email_enabled": True,
            "browser_enabled": True,
            "sound_enabled": False,
            "notify_case_assigned": True,
            "notify_case_rejected": True,
            "notify_case_approved": True,
            "notify_qa_pending": True,
            "notify_system_update": True,
            "quiet_hours_enabled": False,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "08:00",
        },
    }

    users[user_data.username] = user_dict
    _save_users(users)

    logger.info(f"创建用户成功: {user_data.username}, 角色: {user_data.role}")
    return UserResponse(
        id=user_id,
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        department=user_data.department,
        status=UserStatus.ACTIVE,
        created_at=datetime.fromisoformat(now),
    )


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """验证用户凭据"""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    if user.get("status") != UserStatus.ACTIVE.value:
        return None
    return user


def update_last_login(username: str):
    """更新最后登录时间"""
    users = _load_users()
    if username in users:
        users[username]["last_login"] = datetime.now().isoformat()
        _save_users(users)


def list_users() -> List[UserResponse]:
    """获取所有用户列表"""
    users = _load_users()
    return [
        UserResponse(
            id=u["id"],
            username=u["username"],
            email=u.get("email"),
            full_name=u.get("full_name"),
            role=UserRole(u.get("role", UserRole.CODER)),
            department=u.get("department"),
            status=UserStatus(u.get("status", UserStatus.INACTIVE)),
            created_at=datetime.fromisoformat(u.get("created_at", datetime.now().isoformat())),
            last_login=datetime.fromisoformat(u["last_login"]) if u.get("last_login") else None,
        )
        for u in users.values()
    ]


def update_user(username: str, update_data: UserUpdate) -> Optional[UserResponse]:
    """更新用户信息"""
    users = _load_users()
    if username not in users:
        return None

    user = users[username]

    if update_data.email is not None:
        user["email"] = update_data.email
    if update_data.full_name is not None:
        user["full_name"] = update_data.full_name
    if update_data.role is not None:
        user["role"] = update_data.role.value
    if update_data.department is not None:
        user["department"] = update_data.department
    if update_data.status is not None:
        user["status"] = update_data.status.value

    _save_users(users)
    logger.info(f"更新用户信息: {username}")

    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        full_name=user.get("full_name"),
        role=UserRole(user.get("role", UserRole.CODER)),
        department=user.get("department"),
        status=UserStatus(user.get("status", UserStatus.INACTIVE)),
        created_at=datetime.fromisoformat(user.get("created_at", datetime.now().isoformat())),
        last_login=datetime.fromisoformat(user["last_login"]) if user.get("last_login") else None,
    )


def delete_user(username: str) -> bool:
    """删除用户"""
    users = _load_users()
    if username not in users:
        return False

    del users[username]
    _save_users(users)
    logger.info(f"删除用户: {username}")
    return True


def update_notification_settings(username: str, settings: dict) -> Optional[dict]:
    """更新用户通知设置"""
    users = _load_users()
    if username not in users:
        return None

    users[username]["notification_settings"] = settings
    _save_users(users)
    logger.info(f"更新通知设置: {username}")
    return users[username]["notification_settings"]


def get_notification_settings(username: str) -> Optional[dict]:
    """获取用户通知设置"""
    user = get_user(username)
    if not user:
        return None
    return user.get("notification_settings", {
        "email_enabled": True,
        "browser_enabled": True,
        "sound_enabled": False,
        "notify_case_assigned": True,
        "notify_case_rejected": True,
        "notify_case_approved": True,
        "notify_qa_pending": True,
        "notify_system_update": True,
        "quiet_hours_enabled": False,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00",
    })


def init_default_users():
    """初始化默认用户（开发环境使用）"""
    users = _load_users()

    if not users:
        # 创建默认管理员
        admin = UserCreate(
            username="admin",
            password="admin123",
            email="admin@icd.com",
            full_name="系统管理员",
            role=UserRole.ADMIN,
            department="信息科",
        )
        create_user(admin)

        # 创建默认编码员
        coder = UserCreate(
            username="coder",
            password="coder123",
            email="coder@icd.com",
            full_name="病案编码员",
            role=UserRole.CODER,
            department="病案科",
        )
        create_user(coder)

        # 创建默认医生
        doctor = UserCreate(
            username="doctor",
            password="doctor123",
            email="doctor@icd.com",
            full_name="张医生",
            role=UserRole.DOCTOR,
            department="心内科",
        )
        create_user(doctor)

        logger.info("初始化默认用户完成: admin / coder / doctor")


# 初始化用户
init_default_users()
