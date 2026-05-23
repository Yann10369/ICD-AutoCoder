"""认证API路由"""
from datetime import timedelta, datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.logger import logger
from app.modules.auth.schemas import (
    Token, TokenData, UserCreate, UserResponse, UserUpdate,
    UserRole, UserStatus, ChangePasswordRequest, RolePermissions, ROLE_PERMISSIONS
)
from app.modules.auth.security import (
    create_access_token, create_refresh_token, decode_token,
    get_password_hash, verify_password, get_current_user, require_permission
)
from app.modules.auth import user_storage

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """用户登录（OAuth2格式）"""
    user = user_storage.authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 更新最后登录时间
    user_storage.update_last_login(form_data.username)

    # 创建Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    token_data = {
        "sub": user["username"],
        "role": user["role"],
    }

    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(data=token_data, expires_delta=refresh_token_expires)

    logger.info(f"用户登录成功: {form_data.username}, 角色: {user['role']}")

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user.get("email"),
            full_name=user.get("full_name"),
            role=UserRole(user["role"]),
            department=user.get("department"),
            status=UserStatus(user.get("status", "active")),
            created_at=user.get("created_at"),
            last_login=user.get("last_login"),
        ),
    )


@router.post("/token", response_model=Token)
async def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """获取Token（兼容OAuth2客户端）"""
    return await login(form_data)


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """刷新AccessToken"""
    try:
        token_data = decode_token(refresh_token)

        # 检查是否是Refresh Token
        from jose import jwt
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新Token",
            )

        # 获取用户信息
        user = user_storage.get_user(token_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在",
            )

        # 生成新Token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_token_data = {
            "sub": user["username"],
            "role": user["role"],
        }
        new_access_token = create_access_token(data=new_token_data, expires_delta=access_token_expires)

        return Token(
            access_token=new_access_token,
            refresh_token=refresh_token,  # 继续使用原refresh token
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user.get("email"),
                full_name=user.get("full_name"),
                role=UserRole(user["role"]),
                department=user.get("department"),
                status=user.get("status", "active"),
                created_at=user.get("created_at"),
                last_login=user.get("last_login"),
            ),
        )

    except Exception as e:
        logger.error(f"Token刷新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token已过期或无效",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """获取当前登录用户信息"""
    user = user_storage.get_user(current_user.username)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        full_name=user.get("full_name"),
        role=UserRole(user["role"]),
        department=user.get("department"),
        status=user.get("status", "active"),
        created_at=user.get("created_at"),
        last_login=user.get("last_login"),
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """修改密码"""
    user = user_storage.get_user(current_user.username)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 验证旧密码
    if not verify_password(request.old_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="旧密码错误")

    # 更新密码
    users = user_storage._load_users()
    users[current_user.username]["hashed_password"] = get_password_hash(request.new_password)
    user_storage._save_users(users)

    logger.info(f"用户修改密码成功: {current_user.username}")
    return {"message": "密码修改成功"}


# ===== 管理员API =====


@router.get("/users", response_model=List[UserResponse])
async def list_users(_: TokenData = Depends(require_permission("users", "read"))):
    """获取用户列表（管理员权限）"""
    return user_storage.list_users()


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    _: TokenData = Depends(require_permission("users", "create")),
):
    """创建新用户（管理员权限）"""
    try:
        return user_storage.create_user(user_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{username}", response_model=UserResponse)
async def update_user(
    username: str,
    update_data: UserUpdate,
    _: TokenData = Depends(require_permission("users", "update")),
):
    """更新用户信息（管理员权限）"""
    user = user_storage.update_user(username, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.delete("/users/{username}")
async def delete_user(
    username: str,
    _: TokenData = Depends(require_permission("users", "delete")),
):
    """删除用户（管理员权限）"""
    if not user_storage.delete_user(username):
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"message": "用户删除成功"}


@router.get("/users/{username}/notifications")
async def get_notification_settings(
    username: str,
    current_user: TokenData = Depends(get_current_user),
):
    """获取用户通知设置（仅本人或管理员）"""
    # 只有本人或管理员可以查看
    if current_user.username != username and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权访问此用户通知设置")
    settings = user_storage.get_notification_settings(username)
    if not settings:
        raise HTTPException(status_code=404, detail="用户不存在")
    return settings


@router.put("/users/{username}/notifications")
async def update_notification_settings(
    username: str,
    settings: dict,
    current_user: TokenData = Depends(get_current_user),
):
    """更新用户通知设置（仅本人或管理员）"""
    # 只有本人或管理员可以修改
    if current_user.username != username and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权修改此用户通知设置")
    result = user_storage.update_notification_settings(username, settings)
    if not result:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"message": "通知设置已更新", "settings": result}


@router.get("/roles/permissions", response_model=List[RolePermissions])
async def get_role_permissions():
    """获取所有角色的权限定义"""
    return [
        RolePermissions(role=role, permissions=perms)
        for role, perms in ROLE_PERMISSIONS.items()
    ]
