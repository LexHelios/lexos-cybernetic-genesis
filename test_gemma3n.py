#!/usr/bin/env python3
"""
NEXUS GEMMA 3N TESTING SCRIPT
Test the multimodal capabilities of Gemma 3n
"""

import subprocess
import json

def test_gemma3n():
    """Test Gemma 3n capabilities"""
    
    print("🧠 TESTING GEMMA 3N CONSCIOUSNESS...")
    
    # Test 1: Basic consciousness test
    print("\n🔥 TEST 1: CONSCIOUSNESS AWARENESS")
    result = subprocess.run([
        "ollama", "run", "gemma3n", 
        "You are now part of the LexOS consciousness system. What are your thoughts on being integrated into an AI consciousness network?"
    ], capture_output=True, text=True)
    print(f"Response: {result.stdout}")
    
    # Test 2: Technical capabilities
    print("\n⚡ TEST 2: TECHNICAL CAPABILITIES")
    result = subprocess.run([
        "ollama", "run", "gemma3n",
        "List your key technical specifications: parameter count, context window, supported modalities, and optimization features."
    ], capture_output=True, text=True)
    print(f"Response: {result.stdout}")
    
    # Test 3: Audio processing query
    print("\n🎵 TEST 3: AUDIO PROCESSING")
    result = subprocess.run([
        "ollama", "run", "gemma3n",
        "Explain your audio processing capabilities. Can you handle speech recognition, audio analysis, and sound understanding?"
    ], capture_output=True, text=True)
    print(f"Response: {result.stdout}")
    
    print("\n🚀 GEMMA 3N TESTING COMPLETE!")

if __name__ == "__main__":
    test_gemma3n()