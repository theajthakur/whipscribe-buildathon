"""
Tool Registry for WhipScribe Agent System.

Registers all 8 agent tools defined in scope.md:
1. get_transcript
2. get_client_history
3. extract_requirements
4. create_tasks
5. estimate_timeline_and_quote
6. compare_with_previous_brief
7. draft_client_message
8. save_lead_note
"""

from typing import Dict, List, Any, Optional
from .base import BaseTool, ToolResult
from .get_transcript import GetTranscriptTool
from .get_client_history import GetClientHistoryTool
from .extract_requirements import ExtractRequirementsTool
from .create_tasks import CreateTasksTool
from .estimate_timeline_and_quote import EstimateTimelineAndQuoteTool
from .calculate_productivity_and_budget import CalculateProductivityAndBudgetTool
from .compare_with_previous_brief import CompareWithPreviousBriefTool
from .draft_client_message import DraftClientMessageTool
from .save_lead_note import SaveLeadNoteTool


class ToolRegistry:
    """Central registry managing all tools available to the agent."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        """Registers core agent tools."""
        defaults = [
            GetTranscriptTool(),
            GetClientHistoryTool(),
            ExtractRequirementsTool(),
            CreateTasksTool(),
            EstimateTimelineAndQuoteTool(),
            CalculateProductivityAndBudgetTool(),
            CompareWithPreviousBriefTool(),
            DraftClientMessageTool(),
            SaveLeadNoteTool(),
        ]
        for tool in defaults:
            self.register_tool(tool)

    def register_tool(self, tool: BaseTool):
        """Registers a tool instance."""
        self._tools[tool.name] = tool

    def get_tool(self, tool_name: str) -> Optional[BaseTool]:
        """Returns registered tool by name."""
        return self._tools.get(tool_name)

    def execute_tool(self, tool_name: str, **kwargs) -> ToolResult:
        """Executes a tool by name with arguments."""
        tool = self.get_tool(tool_name)
        if not tool:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                data=None,
                error=f"Tool '{tool_name}' not found in ToolRegistry.",
            )
        return tool.run(**kwargs)

    def list_tool_definitions(self) -> List[Dict[str, Any]]:
        """Returns tool definitions for GenAI function declaration."""
        return [tool.to_function_definition() for tool in self._tools.values()]
