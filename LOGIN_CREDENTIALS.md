# LexOS Login Credentials

## Default Admin Account
- **Username**: admin
- **Password**: Admin123!

## Access URLs
- Frontend: http://147.185.40.39:20065
- Backend API: http://147.185.40.39:20061
- API Documentation: http://147.185.40.39:20061/api/docs

## Troubleshooting
If you still can't login:
1. Clear your browser cache and cookies
2. Try opening in an incognito/private window
3. Check browser console for errors (F12)
4. Ensure no browser extensions are blocking requests

## Testing the Backend
You can test the backend directly:
```bash
curl -X POST http://147.185.40.39:20061/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```