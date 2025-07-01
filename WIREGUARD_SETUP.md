# WireGuard VPN Setup Complete

WireGuard VPN server is now running on your H100 server!

## Server Details
- **VPN Network**: 10.0.0.0/24
- **Server IP**: 10.0.0.1
- **Listen Port**: 51820 (UDP)
- **Public IP**: 147.185.40.39

## Client Configuration

The client configuration file is saved at: `/home/user/client.conf`

### To connect from your device:

1. **Install WireGuard client** on your device:
   - Windows: https://www.wireguard.com/install/
   - macOS: https://www.wireguard.com/install/
   - Linux: `sudo apt install wireguard`
   - iOS/Android: Download from App Store/Play Store

2. **Import the configuration**:
   - Copy the contents of `/home/user/client.conf`
   - Import it into your WireGuard client

3. **Activate the connection**

## Client Config Contents:
```
[Interface]
PrivateKey = ELfrZme+2rHXA0TP10sukEwXw5MYtBM6R58VAJHJDFc=
Address = 10.0.0.2/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = +l8KdxvglWoluPWGYEB7TnWZ82Lv/AhGA0Zunbx6U2s=
Endpoint = 147.185.40.39:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

## Important Notes:

1. **Port 51820**: Must be open in TensorDock's firewall (UDP)
2. **All Traffic**: This config routes ALL your internet traffic through the VPN
3. **Client IP**: Your client will have IP 10.0.0.2

## To add more clients:

1. Generate new client keys:
   ```bash
   wg genkey | tee client2_private.key | wg pubkey | tee client2_public.key
   ```

2. Add peer to server config:
   ```bash
   sudo wg set wg0 peer <CLIENT_PUBLIC_KEY> allowed-ips 10.0.0.3/32
   sudo wg-quick save wg0
   ```

3. Create client config with new keys and IP (10.0.0.3, 10.0.0.4, etc.)

## Management Commands:

- Check status: `sudo wg show`
- Stop VPN: `sudo systemctl stop wg-quick@wg0`
- Start VPN: `sudo systemctl start wg-quick@wg0`
- View logs: `sudo journalctl -u wg-quick@wg0`