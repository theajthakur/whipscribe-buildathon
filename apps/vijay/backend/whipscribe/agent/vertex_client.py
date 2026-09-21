"""
Vertex AI & Google GenAI SDK Client Factory for WhipScribe Agent.

Supports Google Cloud Application Default Credentials (gcloud ADC) via Vertex AI,
auto-discovering project via google.auth, direct API Key fallback, and robust error handling.
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

try:
    import google.auth
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False


class VertexClientFactory:
    """Factory for instantiating Google GenAI / Vertex AI clients with gcloud ADC support."""

    def __init__(
        self,
        project: Optional[str] = None,
        location: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        discovered_project = (
            project
            or os.getenv("VERTEX_PROJECT")
            or os.getenv("GCP_PROJECT")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
        )

        if not discovered_project and HAS_GOOGLE_AUTH:
            try:
                _, default_proj = google.auth.default()
                if default_proj:
                    discovered_project = default_proj
                    logger.info(f"Auto-discovered GCP Project from gcloud credentials: '{discovered_project}'")
            except Exception as e:
                logger.debug(f"google.auth.default() discovery note: {e}")

        self.project = discovered_project
        self.location = location or os.getenv("VERTEX_LOCATION") or os.getenv("GCP_LOCATION") or "us-central1"
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_name = model_name or os.getenv("VERTEX_MODEL") or "gemini-2.5-flash"
        self._client = None

    def get_client(self) -> Any:
        """Returns initialized GenAI client instance forcing Vertex AI with gcloud ADC."""
        if not HAS_GENAI:
            raise ImportError(
                "google-genai package is not installed. Run `pip install google-genai` to use Vertex AI Agent."
            )

        if self._client is not None:
            return self._client

        # 1. Direct API key if provided
        if self.api_key:
            logger.info("Initializing GenAI client using provided API key")
            self._client = genai.Client(api_key=self.api_key)
        # 2. Vertex AI mode using gcloud ADC
        else:
            logger.info(f"Initializing Vertex AI client (vertexai=True) for project '{self.project or 'default'}' in location '{self.location}'")
            kwargs: Dict[str, Any] = {
                "vertexai": True,
                "location": self.location,
            }
            if self.project:
                kwargs["project"] = self.project

            try:
                self._client = genai.Client(**kwargs)
            except Exception as err:
                logger.warning(f"Vertex AI initialization with project failed: {err}. Retrying with default ADC...")
                self._client = genai.Client(vertexai=True)

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

        models_to_try = [self.model_name, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        last_exception = None
        response = None

        for m_name in models_to_try:
            try:
                logger.info(f"Attempting Vertex AI generation with model '{m_name}'...")
                response = client.models.generate_content(
                    model=m_name,
                    contents=prompt,
                    config=config,
                )
                if response:
                    break
            except Exception as e:
                logger.warning(f"Model '{m_name}' generation attempt failed: {e}")
                last_exception = e

        if response is None:
            if last_exception:
                raise last_exception
            raise RuntimeError("Failed to generate response from Vertex AI models.")

        # Parse structured response into target Pydantic model
        if hasattr(response, "parsed") and response.parsed is not None:
            return response.parsed

        # Raw text fallback parsing
        return response_schema.model_validate_json(response.text)
