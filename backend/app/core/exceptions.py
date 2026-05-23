"""自定义异常类"""
from typing import Optional


class AppBaseException(Exception):
    """应用基础异常"""
    code: int = 500
    message: str = "Internal server error"

    def __init__(self, message: Optional[str] = None, code: Optional[int] = None):
        if message:
            self.message = message
        if code:
            self.code = code
        super().__init__(self.message)


class NotFoundException(AppBaseException):
    """资源未找到"""
    code = 404
    message = "Resource not found"


class BadRequestException(AppBaseException):
    """错误请求"""
    code = 400
    message = "Bad request"


class ConfigurationException(AppBaseException):
    """配置错误"""
    code = 500
    message = "Invalid configuration"


class DatabaseException(AppBaseException):
    """数据库操作错误"""
    code = 500
    message = "Database operation failed"
