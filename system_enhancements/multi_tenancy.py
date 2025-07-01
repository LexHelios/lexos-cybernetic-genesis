import os
from typing import Dict

TENANT_WORKSPACES: Dict[str, str] = {}
TENANT_POLICIES: Dict[str, dict] = {}

def create_workspace(tenant_id):
    path = f'workspaces/{tenant_id}'
    os.makedirs(path, exist_ok=True)
    TENANT_WORKSPACES[tenant_id] = path
    return path

def get_workspace(tenant_id):
    return TENANT_WORKSPACES.get(tenant_id)

def set_tenant_policy(tenant_id, policy):
    TENANT_POLICIES[tenant_id] = policy

def get_tenant_policy(tenant_id):
    return TENANT_POLICIES.get(tenant_id, {}) 