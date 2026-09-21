"""
Base Tool Interface for WhipScribe Agent Tools.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ToolResult(BaseModel):
    tool_name: str
    success: bool
    data: Any
    error: Optional[str] = None


class BaseTool(ABC):
    """Abstract Base Class for all WhipScribe Agent Tools."""

    name: str
    description: str

    @abstractmethod
    def run(self, **kwargs) -> ToolResult:
        """Executes the tool logic with given arguments."""
        pass

    def to_function_definition(self) -> Dict[str, Any]:
        """Returns metadata definition for GenAI tool declaration."""
        return {
            "name": self.name,
            "description": self.description,
        }
