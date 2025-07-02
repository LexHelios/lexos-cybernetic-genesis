# LexOS Genesis Access Instructions

## Current Status
- ✅ Backend running on port 3001 (2 instances)
- ✅ Frontend running on port 8080  
- ✅ Nginx configured and running on port 80
- ✅ All 16 AI agents online with LLM models
- ⚠️ External access blocked by cloud provider firewall

## Access Methods

### Method 1: SSH Port Forwarding (Recommended)
From your local machine, run:
```bash
ssh -L 8888:localhost:80 user@147.185.40.39
```
Then access LexOS at: http://localhost:8888

### Method 2: Direct Internal Access
If you're on the same network:
- http://192.168.122.27

### Method 3: Direct Service Ports
- Frontend: http://192.168.122.27:8080
- Backend API: http://192.168.122.27:3001

## System Components

### Available LLM Models (11 total)
- deepseek-r1:latest
- r1-unrestricted:latest
- gemma3n-unrestricted:latest
- gemma3n:latest
- qwen2.5-coder:7b
- phi3:mini
- llama3.3:70b
- mistral:7b
- mixtral:8x7b-instruct-v0.1-q4_0
- mistral:7b-instruct
- llama3:latest

### Enhanced AI Agents (16 total)
1. **Orchestrator Agent** - Task routing (mistral:7b-instruct)
2. **Reasoning Agent** - Deep analysis (deepseek-r1:latest)
3. **Code Agent** - Programming (qwen2.5-coder:7b)
4. **Chat Agent** - Conversations (mistral:7b)
5. **Creative Writing Agent** - Stories/Poetry (llama3.3:70b)
6. **OCR/CV Agent** - Image processing (external:yolov8n)
7. **Speech-to-Text Agent** - Audio transcription (external:whisper-large-v3)
8. **Text-to-Speech Agent** - Voice synthesis (external:dia-1.6b)
9. **Audio Processing Agent** - Sound analysis (external:speechbrain)
10. **Adult Content Agent** - Unrestricted (r1-unrestricted:latest)
11. **Web-Design Agent** - UI/UX (qwen2.5-coder:7b)
12. **Web-Scraper Agent** - Data extraction (deepseek-r1:latest)
13. **Network Opt Agent** - Network config (llama3:latest)
14. **Agent-Creator Agent** - Agent generation (mistral:7b)
15. **Orchestration Agent** - System management (phi3:mini)
16. **Full-Stack Builder Agent** - App development (qwen2.5-coder:7b)

## API Endpoints
- Health: `/health`
- Chat: `/api/chat/completions`
- Models: `/api/chat/models`
- Agents Status: `/api/enhanced-agents/status`
- Route Task: `/api/enhanced-agents/route`
- System Status: `/api/system/status`

## Management Commands
```bash
# View logs
pm2 logs

# Check status
pm2 status

# Restart services
pm2 restart lexos-backend-prod
pm2 restart lexos-frontend-prod

# Check nginx
sudo systemctl status nginx
```

## Test Page
Access the test page at: http://localhost:8888/test-system.html (after SSH forwarding)

## Troubleshooting Cloud Access
The external IP (147.185.40.39) appears to be blocked by cloud provider firewall rules. To enable external access:

1. Check your cloud provider's security groups/firewall rules
2. Ensure port 80 and 443 are allowed for inbound traffic
3. Verify no additional cloud-level ACLs are blocking access

For H100 systems, this is often controlled at the provider level (AWS, GCP, Azure, etc.)