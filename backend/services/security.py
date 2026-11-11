import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Development fallback
    _DEV_KEY = Fernet.generate_key().decode()
    ENCRYPTION_KEY = _DEV_KEY

fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_api_key(plain_key: str) -> str:
    """Encrypts plain text API keys prior to DB insertion."""
    if not plain_key:
        return ""
    return fernet.encrypt(plain_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypts API keys for dynamic runtime model initialization."""
    if not encrypted_key:
        return ""
    return fernet.decrypt(encrypted_key.encode()).decode()