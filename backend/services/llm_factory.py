import os
from typing import Optional, Any
from langchain_core.language_models.chat_models import BaseChatModel
from dotenv import load_dotenv

load_dotenv()

class LLMFactory:
    """
    Production Multi-Provider LLM Factory.
    Dynamically instantiates LLM instances based on workspace configuration or API key availability.
    """

    @staticmethod
    def get_llm(
        provider: str = "google",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        streaming: bool = True
    ) -> BaseChatModel:
        provider = provider.lower()

        if provider == "google":
            from langchain_google_genai import ChatGoogleGenerativeAI
            selected_model = model_name or os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
            key = api_key or os.getenv("GOOGLE_API_KEY")
            if not key:
                raise ValueError("Missing GOOGLE_API_KEY for Google Gemini provider.")
            return ChatGoogleGenerativeAI(
                model=selected_model,
                google_api_key=key,
                temperature=temperature,
                streaming=streaming
            )

        elif provider == "groq":
            from langchain_groq import ChatGroq
            selected_model = model_name or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            key = api_key or os.getenv("GROQ_API_KEY")
            if not key:
                raise ValueError("Missing GROQ_API_KEY for Groq provider.")
            return ChatGroq(
                model_name=selected_model,
                groq_api_key=key,
                temperature=temperature,
                streaming=streaming
            )

        elif provider == "openai":
            from langchain_openai import ChatOpenAI
            selected_model = model_name or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            key = api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise ValueError("Missing OPENAI_API_KEY for OpenAI provider.")
            return ChatOpenAI(
                model=selected_model,
                api_key=key,
                temperature=temperature,
                streaming=streaming
            )

        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic
            selected_model = model_name or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
            key = api_key or os.getenv("ANTHROPIC_API_KEY")
            if not key:
                raise ValueError("Missing ANTHROPIC_API_KEY for Anthropic provider.")
            return ChatAnthropic(
                model=selected_model,
                api_key=key,
                temperature=temperature,
                streaming=streaming
            )

        elif provider == "openrouter":
            from langchain_openai import ChatOpenAI
            selected_model = model_name or os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
            key = api_key or os.getenv("OPENROUTER_API_KEY")
            if not key:
                raise ValueError("Missing OPENROUTER_API_KEY for OpenRouter provider.")
            return ChatOpenAI(
                model=selected_model,
                api_key=key,
                base_url="https://openrouter.ai/api/v1",
                temperature=temperature,
                streaming=streaming
            )

        else:
            raise ValueError(f"Unsupported LLM provider: '{provider}'")