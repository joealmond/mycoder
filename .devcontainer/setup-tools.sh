#!/bin/bash
set -e

echo "🔧 Setting up development tools..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Set default CHEZMOI_REPO if not provided
CHEZMOI_REPO=${CHEZMOI_REPO:-"https://github.com/your-user/dotfiles.git"}

# Install chezmoi for dotfile management
if ! command_exists chezmoi; then
    echo "📦 Installing chezmoi..."
    sh -c "$(curl -fsLS https://chezmoi.io/get)" -- -b /usr/local/bin
else
    echo "✅ chezmoi already installed"
fi

# Initialize chezmoi and apply dotfiles
echo "🔍 Applying dotfiles from $CHEZMOI_REPO..."
if [ -n "$CHEZMOI_REPO" ] && [ "$CHEZMOI_REPO" != "https://github.com/your-user/dotfiles.git" ]; then
    chezmoi init --apply "$CHEZMOI_REPO" || echo "⚠️  chezmoi init failed (repo may not exist yet)"
else
    echo "⚠️  CHEZMOI_REPO not configured, skipping dotfile sync"
fi

# Install Ollama CLI (client only, server runs on host)
if ! command_exists ollama; then
    echo "📦 Installing Ollama CLI..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama CLI already installed"
fi

# Install PM2 globally
if ! command_exists pm2; then
    echo "📦 Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# Install Backlog.md CLI
if ! command_exists backlog; then
    echo "📦 Installing Backlog.md CLI..."
    npm install -g backlog.md
else
    echo "✅ Backlog.md CLI already installed"
fi

# Install Kilo Code CLI (kodu)
if ! command_exists kodu; then
    echo "📦 Installing Kilo Code CLI..."
    npm install -g kodu
else
    echo "✅ Kilo Code CLI already installed"
fi

# Verify Ollama connection to host
echo "🔍 Checking Ollama connection..."
if curl -s "${OLLAMA_HOST:-http://host.docker.internal:11434}/api/tags" >/dev/null 2>&1; then
    echo "✅ Ollama host reachable at ${OLLAMA_HOST:-http://host.docker.internal:11434}"
else
    echo "⚠️  Warning: Cannot reach Ollama at ${OLLAMA_HOST:-http://host.docker.internal:11434}"
    echo "   Make sure Ollama is running on your host machine"
fi

# Install project dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

echo "✅ Tool setup complete!"
