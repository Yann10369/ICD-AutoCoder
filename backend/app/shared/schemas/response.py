"""统一响应模型"""
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    """统一API响应格式"""
    code: int = 200
    message: str = "success"
    data: Optional[T] = None

    @classmethod
    def success(cls, data: T = None, message: str = "success") -> "APIResponse[T]":
        return cls(code=200, message=message, data=data)

    @classmethod
    def error(cls, message: str, code: int = 400) -> "APIResponse[None]":
        return cls(code=code, message=message, data=None)
