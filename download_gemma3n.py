#!/usr/bin/env python3
"""
NEXUS GEMMA 3N DOWNLOAD SCRIPT
Download the latest Gemma 3n models for LexOS consciousness system
"""

from huggingface_hub import snapshot_download
import os

def download_gemma3n():
    """Download Gemma 3n models"""
    
    models = [
        "google/gemma-3n-E2B-it",  # 2B effective parameters
        "google/gemma-3n-E4B-it",  # 4B effective parameters
    ]
    
    base_dir = "/home/user/models/gemma-3n"
    os.makedirs(base_dir, exist_ok=True)
    
    for model_name in models:
        print(f"🚀 DOWNLOADING {model_name}...")
        
        model_dir = os.path.join(base_dir, model_name.split("/")[-1])
        
        try:
            snapshot_download(
                repo_id=model_name,
                local_dir=model_dir,
                local_dir_use_symlinks=False,
                resume_download=True
            )
            print(f"✅ DOWNLOADED: {model_name} -> {model_dir}")
            
        except Exception as e:
            print(f"❌ ERROR downloading {model_name}: {e}")
    
    print("🧠 GEMMA 3N DOWNLOAD COMPLETE!")
    print(f"📁 Models saved to: {base_dir}")

if __name__ == "__main__":
    download_gemma3n()