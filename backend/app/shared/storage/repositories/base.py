"""Repository 基础接口"""
from abc import ABC, abstractmethod
from typing import List, Generic, TypeVar, Optional

T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """Repository 基类接口"""

    @abstractmethod
    def list_all(self) -> List[T]:
        """列出所有实体"""
        pass

    @abstractmethod
    def get_by_id(self, entity_id: str) -> Optional[T]:
        """根据ID获取实体"""
        pass

    @abstractmethod
    def save(self, entity: T) -> T:
        """保存实体"""
        pass

    @abstractmethod
    def delete(self, entity_id: str) -> bool:
        """删除实体"""
        pass
