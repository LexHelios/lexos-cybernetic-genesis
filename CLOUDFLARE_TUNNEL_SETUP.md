# Cloudflare Tunnel Setup for LexCommand.ai

## Current Status
✅ Cloudflared installed
✅ Logged into Cloudflare
✅ Tunnel created: `lexcommand` (ID: ce1402ae-1a8e-4d90-8c91-0cf6ff3ce6df)
✅ Configuration file created

## Next Steps

### 1. Update DNS Records in Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select your domain (lexcommand.ai)
3. Go to DNS settings
4. **Delete** existing A records for:
   - `lexcommand.ai` (pointing to 147.185.40.39)
   - `www.lexcommand.ai` (if exists)

### 2. Route Domain Through Tunnel

After deleting the A records, run:

```bash
# Route root domain
cloudflared tunnel route dns lexcommand lexcommand.ai

# Route www subdomain
cloudflared tunnel route dns lexcommand www.lexcommand.ai
```

### 3. Run the Tunnel

```bash
# Test run (foreground)
cloudflared tunnel run lexcommand

# Or run as a service (background)
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## How It Works

1. Cloudflare Tunnel creates an outbound connection from your server to Cloudflare
2. No inbound ports needed - bypasses TensorDock's NAT completely
3. Your domain points to Cloudflare, which proxies to your tunnel
4. The tunnel forwards to your local NGINX (which serves your app)

## Benefits

- ✅ No port forwarding needed
- ✅ Works behind NAT/firewall
- ✅ Free SSL certificates from Cloudflare
- ✅ DDoS protection included
- ✅ Cloudflare CDN and caching

## Quick Test

Once running, your site will be accessible at:
- https://lexcommand.ai
- https://www.lexcommand.ai

## Monitoring

View tunnel status:
```bash
cloudflared tunnel list
cloudflared tunnel info lexcommand
```

View logs:
```bash
sudo journalctl -u cloudflared -f
```