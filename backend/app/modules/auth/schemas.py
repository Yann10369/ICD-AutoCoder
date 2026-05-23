"""认证相关数据模型"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"           # 系统管理员
    DOCTOR = "doctor"         # 主治医生
    CODER = "coder"           # 编码员
    AUDITOR = "auditor"       # 审核员
    VIEWER = "viewer"         # 只读用户


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    LOCKED = "locked"


class UserBase(BaseModel):
    """用户基础信息"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: Optional[str] = Field(None, description="邮箱")
    full_name: Optional[str] = Field(None, max_length=100, description="真实姓名")
    role: UserRole = Field(UserRole.CODER, description="用户角色")
    department: Optional[str] = Field(None, description="所属科室")


class UserCreate(UserBase):
    """创建用户请求"""
    password: str = Field(..., min_length=6, description="密码")


class UserUpdate(BaseModel):
    """更新用户请求"""
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    status: Optional[UserStatus] = None


class UserResponse(UserBase):
    """用户信息响应"""
    id: str
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    """登录Token响应"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    """Token解码数据"""
    username: Optional[str] = None
    role: Optional[UserRole] = None


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., description="旧密码")
    new_password: str = Field(..., min_length=6, description="新密码")


class Permission(BaseModel):
    """权限定义"""
    resource: str           # 资源名称
    action: str             # 操作类型: create, read, update, delete
    allowed: bool           # 是否允许


class RolePermissions(BaseModel):
    """角色权限列表"""
    role: UserRole
    permissions: List[Permission]


# 各角色默认权限配置
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        Permission(resource="*", action="*", allowed=True)
    ],
    UserRole.DOCTOR: [
        Permission(resource="cases", action="read", allowed=True),
        Permission(resource="cases", action="create", allowed=True),
        Permission(resource="predict", action="create", allowed=True),
        Permission(resource="graph", action="read", allowed=True),
    ],
    UserRole.CODER: [
        Permission(resource="cases", action="read", allowed=True),
        Permission(resource="cases", action="update", allowed=True),
        Permission(resource="predict", action="create", allowed=True),
        Permission(resource="predict", action="update", allowed=True),
        Permission(resource="graph", action="read", allowed=True),
    ],
    UserRole.AUDITOR: [
        Permission(resource="cases", action="read", allowed=True),
        Permission(resource="cases", action="update", allowed=True),
        Permission(resource="audit", action="read", allowed=True),
        Permission(resource="predict", action="read", allowed=True),
        Permission(resource="system", action="config", allowed=True),
    ],
    UserRole.VIEWER: [
        Permission(resource="cases", action="read", allowed=True),
        Permission(resource="predict", action="read", allowed=True),
        Permission(resource="graph", action="read", allowed=True),
    ]
}
