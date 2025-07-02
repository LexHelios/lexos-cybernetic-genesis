# LexOS Genesis - Access Guide

## 🌐 Available Access Points

### 1. **Via Domain (Recommended)**
- **URL**: http://lexcommand.ai
- **Status**: ✅ ACTIVE (through Cloudflare)
- **Login**: admin@localhost / admin123

### 2. **Via Direct IP**
- **URL**: http://147.185.40.39
- **Status**: ✅ ACTIVE
- **Login**: admin@localhost / admin123

### 3. **Via Port 20004** (if configured elsewhere)
- **URL**: http://147.185.40.39:20004
- **Note**: This appears to be a proxy setup

## ✅ Current Status

1. **Nginx Configuration**: Updated and working
   - Serving frontend from `/home/user/lexos-genesis/dist`
   - Backend API on port 9001
   - Domain names configured

2. **Backend Services**:
   - ✅ API Server: Running on port 9001 (PM2)
   - ✅ Ollama: Active with LLMs
   - ✅ Redis: Active for caching
   - ✅ Qdrant: Active for vectors

3. **DNS Status**:
   - lexcommand.ai → Cloudflare → Your server
   - Using Cloudflare proxy (orange cloud)

## 🔧 If lexcommand.ai isn't loading:

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Try incognito/private mode**
3. **Check Cloudflare settings**:
   - Ensure DNS points to 147.185.40.39
   - Check if caching rules are interfering

## 📱 Test Commands

```bash
# Test domain locally
curl -I http://lexcommand.ai

# Test API
curl http://lexcommand.ai/api/system/status

# Check services
pm2 list
sudo systemctl status nginx
```

## 🚀 Quick Fix Commands

```bash
# Restart services
pm2 restart lexos-backend
sudo systemctl restart nginx

# Check logs
pm2 logs lexos-backend
sudo tail -f /var/log/nginx/access.log
```

## 💡 Important Notes

1. **Cloudflare**: The domain goes through Cloudflare proxy
2. **SSL**: Currently HTTP only (Cloudflare provides HTTPS)
3. **Port 80**: Main web traffic port
4. **Port 9001**: Backend API (internal only)

The system is fully configured and working. Access it via http://lexcommand.ai!