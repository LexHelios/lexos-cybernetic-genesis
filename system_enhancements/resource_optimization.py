import psutil
from typing import Dict

RESOURCE_USAGE: Dict[str, dict] = {}

def allocate_resources(agent_id, cpu=None, gpu=None, ram=None):
    # TODO: Actually allocate resources (requires integration with system/hardware)
    RESOURCE_USAGE[agent_id] = {"cpu": cpu, "gpu": gpu, "ram": ram}
    return RESOURCE_USAGE[agent_id]

def track_usage(agent_id):
    # TODO: Track actual usage (CPU, RAM, GPU, etc.)
    usage = {
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        # "gpu": ... # Integrate with nvidia-smi or similar
    }
    RESOURCE_USAGE[agent_id] = usage
    return usage

def get_usage(agent_id):
    return RESOURCE_USAGE.get(agent_id, {}) 