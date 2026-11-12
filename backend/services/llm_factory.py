import os
from typing import Optional
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from backend.services.security import decrypt_api_key

load_dotenv(override=True)


def _resolve_api_key(encrypted_user_key: Optional[str], env_var_name: str) -> Optional[str]:
    """Resolves workspace encrypted key or falls back to sanitized .env key."""
    raw_key = decrypt_api_key(encrypted_user_key) if encrypted_user_key else os.getenv(env_var_name)
    if not raw_key:
        return None
    return raw_key.strip().strip('"').strip("'")


def get_llm_instance(
    provider: str,
    model_name: str,
    encrypted_user_key: Optional[str] = None,
    temperature: float = 0.7,
):
    """
    Dynamically instantiates LangChain LLM instances based on workspace configuration.
    Supports Google Gemini, Groq, OpenAI, Anthropic, and OpenRouter.
    """
    provider_clean = provider.lower().strip()

    if provider_clean in ["google", "gemini"]:
        key = _resolve_api_key(encrypted_user_key, "GOOGLE_API_KEY")
        if not key:
            raise ValueError("Google API Key is missing.")
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=key,
            temperature=temperature,
        )

    elif provider_clean == "groq":
        key = _resolve_api_key(encrypted_user_key, "GROQ_API_KEY")
        if not key:
            raise ValueError("Groq API Key is missing.")
        return ChatGroq(
            model_name=model_name,
            groq_api_key=key,
            temperature=temperature,
        )

    elif provider_clean == "openai":
        key = _resolve_api_key(encrypted_user_key, "OPENAI_API_KEY")
        if not key:
            raise ValueError("OpenAI API Key is missing.")
        return ChatOpenAI(
            model=model_name,
            api_key=key,
            temperature=temperature,
        )

    elif provider_clean == "anthropic":
        key = _resolve_api_key(encrypted_user_key, "ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("Anthropic API Key is missing.")
        return ChatAnthropic(
            model=model_name,
            api_key=key,
            temperature=temperature,
        )

    elif provider_clean == "openrouter":
        key = _resolve_api_key(encrypted_user_key, "OPENROUTER_API_KEY")
        if not key:
            raise ValueError("OpenRouter API Key is missing.")
        return ChatOpenAI(
            model=model_name,
            api_key=key,
            base_url="https://openrouter.ai/api/v1",
            temperature=temperature,
        )

    else:
        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. Valid options: google, groq, openai, anthropic, openrouter."
        )