
# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production && \
    cd backend && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    bash \
    tini \
    && addgroup -g 1001 -S lexos \
    && adduser -S lexos -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=lexos:lexos /app/backend ./backend
COPY --from=builder --chown=lexos:lexos /app/dist ./dist
COPY --from=builder --chown=lexos:lexos /app/package*.json ./
COPY --from=builder --chown=lexos:lexos /app/scripts ./scripts

# Create necessary directories
RUN mkdir -p /app/backend/data /app/logs /app/backups && \
    chown -R lexos:lexos /app

# Copy health check script
COPY --chown=lexos:lexos scripts/docker-healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-healthcheck.sh

# Switch to non-root user
USER lexos

# Expose ports
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /usr/local/bin/docker-healthcheck.sh

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "backend/src/index.js"]
