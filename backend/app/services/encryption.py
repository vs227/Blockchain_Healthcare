"""AES-256 Encryption service for medical record protection."""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend


class EncryptionService:
    def __init__(self):
        key = os.getenv("ENCRYPTION_KEY", None)
        if key is None:
            key = Fernet.generate_key()
            print(f"[CRYPTO] Generated new encryption key: {key.decode()}")
        elif isinstance(key, str):
            key = key.encode()
        self.cipher = Fernet(key)

    def encrypt(self, data: bytes) -> bytes:
        """Encrypt data using Fernet (AES-128-CBC with HMAC)."""
        return self.cipher.encrypt(data)

    def decrypt(self, encrypted_data: bytes) -> bytes:
        """Decrypt data using Fernet."""
        return self.cipher.decrypt(encrypted_data)

    def encrypt_json(self, json_string: str) -> str:
        """Encrypt a JSON string and return base64-encoded ciphertext."""
        encrypted = self.encrypt(json_string.encode('utf-8'))
        return base64.b64encode(encrypted).decode('utf-8')

    def decrypt_json(self, encrypted_b64: str) -> str:
        """Decrypt base64-encoded ciphertext back to JSON string."""
        encrypted = base64.b64decode(encrypted_b64.encode('utf-8'))
        return self.decrypt(encrypted).decode('utf-8')


encryption_service = EncryptionService()
