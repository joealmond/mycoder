#!/bin/bash
set -e

echo "🔧 Setting up development tools..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

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
OLLAMA_URL="${OLLAMA_HOST:-http://host.containers.internal:11434}"
if curl -s "${OLLAMA_URL}/api/tags" >/dev/null 2>&1; then
    echo "✅ Ollama host reachable at ${OLLAMA_URL}"
    echo "   Available models:"
    curl -s "${OLLAMA_URL}/api/tags" | jq -r '.models[].name' 2>/dev/null || echo "   (none yet - run 'ollama pull <model>' on host)"
else
    echo "⚠️  Warning: Cannot reach Ollama at ${OLLAMA_URL}"
    echo "   Make sure Ollama is running on your host machine"
    echo "   Host should have: OLLAMA_HOST=0.0.0.0:11434"
fi

# Install project dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

echo ""
echo "✅ Tool setup complete!"
echo ""
echo "📋 Quick start:"
echo "   - Run watcher:     npm start"
echo "   - Create task:     npm run create-task"
echo "   - Test kodu:       kodu --help"
echo ""
