# DNS Configuration for H100 Server

## Server Information
- **Public IP**: 147.185.40.39
- **Ports**: 80 (HTTP), 443 (HTTPS)

## Required DNS Records

Add these records at your domain registrar or DNS provider:

### 1. Root Domain (example.com)
- **Type**: A
- **Name**: @ (or blank)
- **Value**: 147.185.40.39
- **TTL**: 3600

### 2. WWW Subdomain (www.example.com)
- **Type**: A
- **Name**: www
- **Value**: 147.185.40.39
- **TTL**: 3600

### 3. Optional: Wildcard (*.example.com)
- **Type**: A
- **Name**: *
- **Value**: 147.185.40.39
- **TTL**: 3600

## After DNS Configuration

1. **Wait for DNS Propagation**: Usually 5-30 minutes, but can take up to 48 hours

2. **Update NGINX Configuration**:
   Edit `/home/user/nginx.conf` and replace `server_name _;` with your actual domain:
   ```nginx
   server_name example.com www.example.com;
   ```

3. **Get Let's Encrypt Certificate** (for production):
   ```bash
   # Stop nginx
   docker-compose stop nginx
   
   # Get certificate
   sudo certbot certonly --standalone -d example.com -d www.example.com
   
   # Copy certificates
   sudo cp /etc/letsencrypt/live/example.com/fullchain.pem ./ssl/
   sudo cp /etc/letsencrypt/live/example.com/privkey.pem ./ssl/
   
   # Restart nginx
   docker-compose start nginx
   ```

## Testing DNS

After configuration, test with:
```bash
# Check DNS resolution
nslookup example.com
dig example.com

# Test HTTP/HTTPS
curl -I http://example.com
curl -I https://example.com
```

## Firewall Ports

Ensure these ports are open on the H100:
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 22 (SSH - if needed for remote access)