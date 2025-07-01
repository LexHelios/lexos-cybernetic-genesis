import os
import shutil
from datetime import datetime

BACKUP_DIR = 'backups/'

os.makedirs(BACKUP_DIR, exist_ok=True)

def backup_data(src_dirs):
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(BACKUP_DIR, f'backup_{timestamp}')
    os.makedirs(backup_path, exist_ok=True)
    for src in src_dirs:
        if os.path.exists(src):
            shutil.copytree(src, os.path.join(backup_path, os.path.basename(src)), dirs_exist_ok=True)
    return backup_path

def restore_data(backup_path, dest_dirs):
    for dest in dest_dirs:
        src = os.path.join(backup_path, os.path.basename(dest))
        if os.path.exists(src):
            shutil.copytree(src, dest, dirs_exist_ok=True) 