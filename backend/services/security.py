import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("ENCRYPTION_KEY") # 32-byte Fernet Key
fernet = Fernet(SECRET_KEY.encode())

def encrypt_api_key(plain_key: str) -> str:
    """Encrypts raw API keys before saving to Supabase PostgreSQL."""
    return fernet.encrypt(plain_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypts API keys dynamically inside LLM Factory at runtime."""
    return fernet.decrypt(encrypted_key.encode()).decode()