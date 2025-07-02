# TensorRT Installation Guide for LexOS Genesis

TensorRT is NVIDIA's high-performance deep learning inference library that will accelerate AI model performance on your GPU.

## Prerequisites

1. **NVIDIA GPU** with CUDA Compute Capability 6.0 or higher
2. **CUDA Toolkit** (11.8 or 12.x recommended)
3. **cuDNN** compatible with your CUDA version
4. **Python 3.8-3.11**

## Step 1: Verify GPU and CUDA

```bash
# Check NVIDIA GPU
nvidia-smi

# Check CUDA version
nvcc --version

# If CUDA is not installed, install it first:
# For Ubuntu/Debian:
wget https://developer.download.nvidia.com/compute/cuda/12.3.0/local_installers/cuda_12.3.0_545.23.06_linux.run
sudo sh cuda_12.3.0_545.23.06_linux.run
```

## Step 2: Install TensorRT

### Option A: Using pip (Recommended for Python development)

```bash
# Install TensorRT for Python
pip install tensorrt

# Install additional TensorRT components
pip install tensorrt-libs
pip install tensorrt-bindings

# For ONNX support
pip install onnx-tensorrt
```

### Option B: Using NVIDIA's official packages

```bash
# Download TensorRT from NVIDIA (requires free developer account)
# https://developer.nvidia.com/tensorrt

# For Ubuntu 20.04/22.04:
# 1. Download the .deb package
# 2. Install:
sudo dpkg -i nv-tensorrt-local-repo-ubuntu2004-8.6.1-cuda-12.0_1.0-1_amd64.deb
sudo apt-key add /var/nv-tensorrt-local-repo-*/7fa2af80.pub
sudo apt-get update
sudo apt-get install tensorrt

# Install Python bindings
sudo apt-get install python3-libnvinfer-dev
pip install pycuda
```

### Option C: Using Conda

```bash
# Install from conda-forge
conda install -c conda-forge tensorrt

# Or from NVIDIA channel
conda install -c nvidia tensorrt
```

## Step 3: Install Additional Dependencies

```bash
# For optimal performance with PyTorch models
pip install torch-tensorrt

# For TensorFlow models
pip install tensorflow-gpu
pip install tensorrt-tensorflow

# For ONNX models
pip install onnx onnxruntime-gpu

# For model optimization
pip install nvidia-pyindex
pip install nvidia-tensorrt
```

## Step 4: Verify Installation

Create a test script `test_tensorrt.py`:

```python
import tensorrt as trt
import pycuda.driver as cuda
import pycuda.autoinit
import numpy as np

def test_tensorrt():
    print(f"TensorRT version: {trt.__version__}")
    print(f"CUDA driver version: {cuda.get_version()}")
    
    # Test TensorRT logger
    logger = trt.Logger(trt.Logger.WARNING)
    print("TensorRT logger created successfully")
    
    # Test builder
    builder = trt.Builder(logger)
    print("TensorRT builder created successfully")
    
    print("✅ TensorRT installation verified!")

if __name__ == "__main__":
    test_tensorrt()
```

Run the test:
```bash
python test_tensorrt.py
```

## Step 5: Configure for LexOS Genesis

Add TensorRT configuration to your `.env` file:

```bash
# TensorRT Configuration
TENSORRT_ENABLED=true
TENSORRT_WORKSPACE_SIZE=1073741824  # 1GB workspace
TENSORRT_MAX_BATCH_SIZE=8
TENSORRT_PRECISION=fp16  # Options: fp32, fp16, int8
TENSORRT_CACHE_DIR=/tmp/tensorrt_cache

# GPU Configuration
CUDA_VISIBLE_DEVICES=0  # Use first GPU
NVIDIA_DRIVER_CAPABILITIES=compute,utility
```

## Step 6: Integration with Video Generation

Update the video generation service to use TensorRT acceleration:

```bash
# Install additional packages for video processing with TensorRT
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install diffusers accelerate transformers
pip install xformers  # For memory efficiency
```

## Step 7: Performance Optimization

### For VideoCrafter1 and Diffusion Models:

```python
# Add to your videoGenerationService.js equivalent Python script
import torch
import tensorrt as trt

# Enable TensorRT optimization
torch.backends.cudnn.benchmark = True
torch.backends.cuda.matmul.allow_tf32 = True

# Configure TensorRT settings
TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
```

## Troubleshooting

### Common Issues:

1. **"No module named 'tensorrt'"**
   ```bash
   # Make sure you're in the correct Python environment
   which python
   pip list | grep tensorrt
   ```

2. **CUDA version mismatch**
   ```bash
   # Check CUDA version compatibility
   python -c "import torch; print(torch.version.cuda)"
   nvcc --version
   ```

3. **Memory issues**
   ```bash
   # Reduce batch size and workspace size in config
   export TENSORRT_WORKSPACE_SIZE=536870912  # 512MB
   ```

4. **Permission errors**
   ```bash
   # Fix NVIDIA device permissions
   sudo chmod 666 /dev/nvidia*
   sudo chmod 666 /dev/nvidiactl
   ```

## Performance Monitoring

Add monitoring to track TensorRT performance:

```bash
# Install NVIDIA monitoring tools
pip install nvidia-ml-py3
pip install pynvml

# Monitor GPU usage
nvidia-smi -l 1  # Update every second
```

## Expected Performance Gains

With TensorRT optimization, you should see:

- **2-5x faster inference** for video generation models
- **50-70% memory reduction** during inference
- **Lower latency** for real-time applications
- **Higher throughput** for batch processing

## Next Steps

1. Test TensorRT with a simple model first
2. Gradually integrate with video generation pipeline
3. Benchmark performance before and after TensorRT
4. Fine-tune workspace size and precision based on your models
5. Monitor GPU memory usage and optimize accordingly

## Documentation

- [TensorRT Developer Guide](https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/)
- [TensorRT Python API](https://docs.nvidia.com/deeplearning/tensorrt/api/python_api/)
- [TensorRT Best Practices](https://docs.nvidia.com/deeplearning/tensorrt/best-practices/)

---

**Note**: TensorRT installation can be complex depending on your system configuration. If you encounter issues, refer to NVIDIA's official documentation or contact support with your specific GPU and CUDA setup details.