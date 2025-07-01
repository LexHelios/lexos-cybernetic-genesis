import secrets
from typing import Dict

API_KEYS: Dict[str, str] = {}

def generate_api_key(user_id):
    key = secrets.token_hex(32)
    API_KEYS[user_id] = key
    return key

def revoke_api_key(user_id):
    if user_id in API_KEYS:
        del API_KEYS[user_id]
        return True
    return False

def get_api_key(user_id):
    return API_KEYS.get(user_id)

# TODO: Add monitoring and expiration logic 