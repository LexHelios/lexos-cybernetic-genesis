import pickle
import os

CHECKPOINT_DIR = 'checkpoints/'
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

def save_checkpoint(agent_id, state):
    path = os.path.join(CHECKPOINT_DIR, f'{agent_id}.pkl')
    with open(path, 'wb') as f:
        pickle.dump(state, f)
    return path

def load_checkpoint(agent_id):
    path = os.path.join(CHECKPOINT_DIR, f'{agent_id}.pkl')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return pickle.load(f)
    return None 