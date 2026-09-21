"""
Vertex AI & Google GenAI SDK Client Factory for WhipScribe Agent.

Supports Google Cloud Application Default Credentials (gcloud ADC) via Vertex AI,
as well as direct API Key fallback.
"""

import os
import logging
from typing import Optional, Any, Dict
from pydantic import BaseModel

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    genai = None
    types = None


class VertexClientFactory:
    """Factory for instantiating Google GenAI / Vertex AI clients."""

    def __init__(
        self,
        project: Optional[str] = None,
        location: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: str = "gemini-2.5-flash",
    ):
        self.project = (
            project
            or os.getenv("VERTEX_PROJECT")
            or os.getenv("GCP_PROJECT")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
        )
        self.location = location or os.getenv("VERTEX_LOCATION") or os.getenv("GCP_LOCATION") or "us-central1"
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_name = model_name
        self._client = None

    def get_client(self) -> Any:
        """Returns initialized GenAI client instance."""
        if not HAS_GENAI:
            raise ImportError(
                "google-genai package is not installed. Run `pip install google-genai` to use Vertex AI Agent."
            )

        if self._client is not None:
            return self._client

        # Initialize via Vertex AI (gcloud ADC / Cloud project)
        if self.project:
            logger.info(f"Initializing Vertex AI client for project '{self.project}' in location '{self.location}'")
            self._client = genai.Client(
                vertexai=True,
                project=self.project,
                location=self.location,
            )
        # Fallback to direct API key if project not explicitly set
        elif self.api_key:
            logger.info("Initializing GenAI client using API key")
            self._client = genai.Client(api_key=self.api_key)
        else:
            # Try default Vertex AI initialization (gcloud ADC)
            logger.info("Initializing GenAI client using default Application Credentials")
            self._client = genai.Client()

        return self._client

    def generate_structured(
        self,
        prompt: str,
        response_schema: type[BaseModel],
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
    ) -> BaseModel:
        """Generates structured JSON response conforming to a Pydantic model schema."""
        client = self.get_client()

        config_args: Dict[str, Any] = {
            "temperature": temperature,
            "response_mime_type": "application/json",
            "response_schema": response_schema,
        }

        if system_instruction:
            config_args["system_instruction"] = system_instruction

        config = types.GenerateContentConfig(**config_args)

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        # Parse structured response into target Pydantic model
        if hasattr(response, "parsed") and response.parsed is not None:
            return response.parsed

        # Raw text fallback parsing
        return response_schema.model_validate_json(response.text)
