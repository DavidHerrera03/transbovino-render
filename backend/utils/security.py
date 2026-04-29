import base64
import hashlib
import hmac
import os

ITERATIONS = 120000
PREFIX = 'pbkdf2_sha256'


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS)
    return f"{PREFIX}${ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(derived).decode()}"


def verify_password(password: str, stored_password: str) -> bool:
    if not stored_password or '$' not in stored_password:
        return hmac.compare_digest(stored_password or '', password)
    try:
        prefix, iterations, salt_b64, hash_b64 = stored_password.split('$', 3)
        if prefix != PREFIX:
            return False
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(hash_b64.encode())
        derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, int(iterations))
        return hmac.compare_digest(derived, expected)
    except Exception:
        return False


def needs_rehash(stored_password: str) -> bool:
    return not stored_password or not stored_password.startswith(f'{PREFIX}$')
