import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

def _init_fernet() -> Fernet:
    raw_key = os.getenv("ENCRYPTION_KEY")
    if raw_key:
        try:
            return Fernet(raw_key.encode())
        except Exception:
            # .env key invalid hone ki surat mein fallback handle karta hai
            pass
    # Key missing ya invalid hone par development fallback key
    return Fernet(Fernet.generate_key())

fernet = _init_fernet()

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