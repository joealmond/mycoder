FROM node:20-alpine

# Install git and other essentials
RUN apk add --no-cache \
    git \
    bash \
    curl \
    ca-certificates

# Install kodu and backlog.md globally
RUN npm install -g kodu backlog.md

# Set working directory
WORKDIR /workspace

# Create necessary directories
RUN mkdir -p /workspace/backlog/todo \
    /workspace/backlog/doing \
    /workspace/backlog/failed \
    /workspace/backlog/review \
    /workspace/backlog/completed \
    /workspace/repos \
    /workspace/logs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY scripts ./scripts

# Set git config defaults (will be overridden by environment)
RUN git config --global user.name "Ticket Processor" && \
    git config --global user.email "processor@localhost"

# Expose webhook port
EXPOSE 3001

# Default command (can be overridden)
CMD ["node", "scripts/watcher.js"]
