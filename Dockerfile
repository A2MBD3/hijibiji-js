# ============================================================
# Dockerfile — JavaScript Obfuscator Telegram Bot
# Credit: abdullah al mamun (@A2MBD3)
# ============================================================

FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker layer cache.
# Dependencies are only reinstalled when package.json changes.
COPY package*.json ./

# FIX: Use --omit=dev to install only production dependencies in a single
# step. The original two-step (npm install + npm prune --production) was
# wasteful and could leave devDeps behind if prune failed silently.
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY . .

# FIX: Run as a non-root user for container security. The original image
# ran everything as root, which is a security risk.
# Create the originals directory here so the non-root user can write to it.
RUN addgroup -S botgroup && adduser -S botuser -G botgroup \
    && mkdir -p /app/originals \
    && chown -R botuser:botgroup /app \
    && chmod +x start.sh

USER botuser

# Expose health check port (used by the built-in HTTP health server)
EXPOSE 10000

# Start the bot via entrypoint script
CMD ["sh", "start.sh"]
