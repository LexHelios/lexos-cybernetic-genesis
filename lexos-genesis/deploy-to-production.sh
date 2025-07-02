#\!/bin/bash
# LexOS Production Deployment Script

echo "🚀 Deploying LexOS to production..."

# Create deployment package excluding sensitive files
echo "📦 Creating deployment package..."
cd /home/user/lexos-genesis

# Create temp directory
DEPLOY_DIR="/tmp/lexos-deploy-$(date +%s)"
mkdir -p $DEPLOY_DIR

# Copy files excluding sensitive ones
rsync -av --exclude='.git' \
          --exclude='*.env' \
          --exclude='*.env.*' \
          --exclude='node_modules' \
          --exclude='*.log' \
          --exclude='dist' \
          --exclude='build' \
          --exclude='.DS_Store' \
          . $DEPLOY_DIR/

# Create a safe .env file for production
cat > $DEPLOY_DIR/backend/.env.production <<'ENVEOF'
# Production environment - actual keys should be set on server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://lexcommand.ai

# These should be set via environment variables on the server
# or loaded from a secure secrets manager
ENVEOF

echo "📤 Package created at: $DEPLOY_DIR"
echo ""
echo "⚠️  IMPORTANT: Production deployment requires:"
echo "1. SSH access to production server"
echo "2. Restore API keys from secure backup on server"
echo "3. Run: sudo systemctl restart lexos-backend-production"
echo ""
echo "📋 Files ready for deployment:"
ls -la $DEPLOY_DIR/backend/src/services/  < /dev/null |  grep -E "(automation|scraping|browser)" || true
ls -la $DEPLOY_DIR/backend/src/routes/ | grep -E "(automation|scraping)" || true

echo ""
echo "✅ Deployment package ready!"
echo ""
echo "To deploy manually:"
echo "1. Copy files to production: scp -P 20063 -r $DEPLOY_DIR/* user@147.185.40.39:/home/user/lexos-production/"
echo "2. SSH to server: ssh -p 20063 user@147.185.40.39"
echo "3. Restore .env from backup: cp /home/user/lexos-production/backend/.env.backup /home/user/lexos-production/backend/.env"
echo "4. Install dependencies: cd /home/user/lexos-production/backend && npm install"
echo "5. Restart service: sudo systemctl restart lexos-backend-production"
