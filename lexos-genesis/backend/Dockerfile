# Multi-stage build for Node.js backend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Install system dependencies and create user
RUN apk add --no-cache \
    curl \
    tini \
    && addgroup -g 1001 -S lexos \
    && adduser -S lexos -u 1001

WORKDIR /app

# Copy dependencies and source
COPY --from=builder --chown=lexos:lexos /app/node_modules ./node_modules
COPY --chown=lexos:lexos package*.json ./
COPY --chown=lexos:lexos src/ ./src/

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R lexos:lexos /app

# Switch to non-root user
USER lexos

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
