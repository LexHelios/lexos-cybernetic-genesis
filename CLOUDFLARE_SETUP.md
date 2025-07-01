# Cloudflare Tunnel Setup for LexCommand.ai

Since TensorDock uses NAT and doesn't forward ports 80/443, we'll use Cloudflare Tunnel to make your app accessible.

## Quick Setup (Without Domain Transfer)

Run this command to create a quick tunnel:

```bash
./cloudflared tunnel --url https://localhost
```

This will give you a URL like `https://something.trycloudflare.com` that proxies to your app.

## Full Setup (With Your Domain)

1. **Login to Cloudflare**:
```bash
./cloudflared tunnel login
```

2. **Create a tunnel**:
```bash
./cloudflared tunnel create lexcommand
```

3. **Create config file** `/home/user/.cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL_ID_FROM_ABOVE>
credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: lexcommand.ai
    service: https://localhost
    originRequest:
      noTLSVerify: true
  - hostname: www.lexcommand.ai
    service: https://localhost
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

4. **Route your domain**:
```bash
./cloudflared tunnel route dns lexcommand lexcommand.ai
./cloudflared tunnel route dns lexcommand www.lexcommand.ai
```

5. **Run the tunnel**:
```bash
./cloudflared tunnel run lexcommand
```

## Alternative: Use ngrok

If you prefer ngrok:

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Run ngrok
ngrok http https://localhost
```

## Why This Works

- Cloudflare Tunnel creates an outbound connection from your server to Cloudflare
- No inbound ports needed - works behind NAT, firewalls, etc.
- Your domain points to Cloudflare, which proxies to your server
- Free SSL certificates included
- DDoS protection included