"""Shared utilities for GriefSync backend."""

import os
import sys
import time

from google import genai

# Single shared Gemini client for all agents
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.5-flash"


def call_gemini_with_retry(prompt: str, max_retries=3, config=None):
    """Call Gemini with exponential backoff on transient errors."""
    for attempt in range(max_retries):
        try:
            kwargs = {"model": MODEL, "contents": prompt}
            if config:
                kwargs["config"] = config
            return gemini_client.models.generate_content(**kwargs)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait = 2 ** attempt  # 1s, 2s, 4s
            print(f"[gemini_retry] attempt {attempt+1} failed: {e}. Retrying in {wait}s...", file=sys.stderr)
            time.sleep(wait)


def call_gemini_with_search(prompt: str, max_retries=3):
    """Call Gemini with Google Search grounding enabled."""
    return call_gemini_with_retry(
        prompt,
        max_retries=max_retries,
        config={"tools": [{"google_search": {}}]}
    )


def call_gemini_json(prompt: str, max_retries=3):
    """Call Gemini with JSON response format."""
    return call_gemini_with_retry(
        prompt,
        max_retries=max_retries,
        config={"response_mime_type": "application/json"}
    )
