import os
from typing import Optional
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv(override=True)


def _get_cipher() -> Fernet:
    load_dotenv(override=True)
    raw_key = (os.getenv("ENCRYPTION_KEY") or "").strip().strip('"').strip("'")
    if not raw_key:
        raise ValueError("ENCRYPTION_KEY is missing in .env file.")
    return Fernet(raw_key.encode("utf-8"))


def encrypt_api_key(plain_key: str) -> str:
    """Encrypts a plaintext LLM API key using AES-256 Fernet."""
    if not plain_key or not plain_key.strip():
        raise ValueError("API key cannot be empty.")
    cipher = _get_cipher()
    return cipher.encrypt(plain_key.strip().encode("utf-8")).decode("utf-8")


def decrypt_api_key(encrypted_key: Optional[str]) -> Optional[str]:
    """Decrypts an AES-256 Fernet encrypted API key."""
    if not encrypted_key or not encrypted_key.strip():
        return None
    cipher = _get_cipher()
    return cipher.decrypt(encrypted_key.strip().encode("utf-8")).decode("utf-8")