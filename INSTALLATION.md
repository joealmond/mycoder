# Installation Guide

This guide covers installation on both **macOS** (development) and **Linux** (production with NVIDIA GPU support).

## Prerequisites

### Common Requirements

- **Git** - Version control
- **Node.js 20+** - JavaScript runtime
- **Podman** - Container runtime (Docker alternative)
- **Ollama** - Local LLM serving
- **Kilo Code CLI (kodu)** - AI coding assistant
- **Backlog.md CLI** - Task management

### Platform-Specific

**macOS:**
- Homebrew package manager
- 8GB+ RAM recommended
- 20GB+ free disk space

**Linux:**
- Ubuntu 22.04+, Fedora 38+, or equivalent
- 16GB+ RAM recommended (32GB for GPU workloads)
- 50GB+ free disk space
- Optional: NVIDIA GPU with drivers for acceleration

---

## macOS Installation

### Automated Installation

Run the installation script:

```bash
bash install/install-macos.sh
```

This script will:
1. ✅ Install Homebrew (if not present)
2. ✅ Install Podman and Podman Compose
3. ✅ Initialize Podman machine
4. ✅ Install Node.js 20
5. ✅ Install PM2 process manager
6. ✅ Install Ollama
7. ✅ Start Ollama service
8. ✅ Install Backlog.md CLI
9. ✅ Install Kilo Code CLI (kodu)
10. ✅ Pull recommended Ollama models
11. ✅ Configure git (if needed)

### Manual Installation

If you prefer manual installation:

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Podman
brew install podman podman-compose

# Initialize Podman machine
podman machine init --cpus 4 --memory 8192 --disk-size 50
podman machine start

# Install Node.js
brew install node@20
brew link node@20

# Install PM2
npm install -g pm2

# Install Ollama
brew install ollama
brew services start ollama

# Install CLIs
npm install -g backlog.md kodu

# Pull models
ollama pull deepseek-coder
ollama pull codellama  # Optional

# Configure git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Post-Installation

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** (optional, defaults work for local development)

3. **Install Node dependencies:**
   ```bash
   npm install
   ```

4. **Start the system:**
   ```bash
   node scripts/start.js
   ```

---

## Linux Installation

### Automated Installation

Run the installation script:

```bash
bash install/install-linux.sh
```

This script will:
1. ✅ Detect package manager (apt/dnf/yum)
2. ✅ Install Podman and Podman Compose
3. ✅ Configure Podman rootless mode
4. ✅ Install Node.js 20
5. ✅ Install PM2 process manager
6. ✅ Install inotify-tools for file watching
7. ✅ Install Ollama
8. ✅ Detect NVIDIA GPU and provide driver instructions
9. ✅ Install Backlog.md CLI
10. ✅ Install Kilo Code CLI (kodu)
11. ✅ Pull recommended Ollama models
12. ✅ Configure inotify limits
13. ✅ Configure git (if needed)

### Manual Installation (Ubuntu/Debian)

```bash
# Update package lists
sudo apt-get update

# Install Podman
sudo apt-get install -y podman

# Install Podman Compose
sudo apt-get install -y python3-pip
pip3 install podman-compose

# Configure rootless Podman
systemctl --user enable --now podman.socket
loginctl enable-linger $USER

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install inotify-tools
sudo apt-get install -y inotify-tools

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Create Ollama service
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/ollama.service <<'EOF'
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

# Start Ollama
systemctl --user daemon-reload
systemctl --user enable --now ollama.service

# Install CLIs
sudo npm install -g backlog.md kodu

# Pull models
ollama pull deepseek-coder
ollama pull codellama  # Optional

# Increase inotify limits
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### NVIDIA GPU Support (Optional)

For GPU-accelerated Ollama on Linux with NVIDIA GPU:

1. **Install NVIDIA drivers:**
   ```bash
   # Ubuntu/Debian
   sudo apt install nvidia-driver-535
   
   # Fedora/RHEL
   sudo dnf install akmod-nvidia
   ```

2. **Install nvidia-container-toolkit:**
   ```bash
   # Ubuntu/Debian
   sudo apt install nvidia-container-toolkit
   
   # Fedora/RHEL
   sudo dnf install nvidia-container-toolkit
   ```

3. **Configure Podman for NVIDIA:**
   ```bash
   sudo nvidia-ctk runtime configure --runtime=podman
   ```

4. **Verify GPU access:**
   ```bash
   nvidia-smi
   ```

5. **Ollama will automatically use GPU when available**

### Post-Installation

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** if needed:
   ```bash
   nano .env
   ```

3. **Install Node dependencies:**
   ```bash
   npm install
   ```

4. **Choose deployment method:**

   **Option A: Run directly**
   ```bash
   node scripts/start.js
   ```

   **Option B: Install as systemd service** (recommended)
   ```bash
   bash scripts/install-service.sh
   ```

---

## Verification

### Check Installations

```bash
# Check Node.js
node --version  # Should be v20.x.x

# Check npm
npm --version

# Check Podman
podman --version

# Check Ollama
ollama list  # Should show pulled models

# Check kodu
kodu --version

# Check backlog
backlog --version

# Check git config
git config --global user.name
git config --global user.email
```

### Test Ollama Connection

```bash
# macOS
curl http://localhost:11434/api/tags

# Linux (if using systemd)
systemctl --user status ollama
curl http://localhost:11434/api/tags
```

### Test Kodu

```bash
kodu --message "console.log('Hello World')" --model ollama/deepseek-coder
```

---

## Pulling Additional Models

To use different models, pull them first:

```bash
# List available models
ollama list

# Pull specific models
ollama pull deepseek-coder     # Best for code (default)
ollama pull codellama          # Alternative code model
ollama pull mistral            # General purpose
ollama pull llama2             # General purpose

# Remove models you don't need
ollama rm model-name
```

### Model Recommendations by Use Case

| Use Case | Recommended Model | Size | Notes |
|----------|------------------|------|-------|
| Code generation | deepseek-coder | ~7GB | Best code quality |
| Fast prototyping | codellama | ~4GB | Faster, good quality |
| General tasks | mistral | ~4GB | Versatile |
| Mixed workload | llama2 | ~4GB | Reliable all-rounder |

---

## Troubleshooting Installation

### Podman Machine Not Starting (macOS)

```bash
# Stop and remove existing machine
podman machine stop
podman machine rm

# Recreate with more resources
podman machine init --cpus 4 --memory 8192 --disk-size 50
podman machine start
```

### Ollama Not Accessible

```bash
# macOS
brew services restart ollama
sleep 5
curl http://localhost:11434/api/tags

# Linux
systemctl --user restart ollama
sleep 5
curl http://localhost:11434/api/tags
```

### Permission Issues (Linux)

```bash
# Ensure user has proper permissions
sudo usermod -aG podman $USER
newgrp podman

# Reset Podman socket
systemctl --user restart podman.socket
```

### Node.js Version Issues

```bash
# Check version
node --version

# If wrong version, reinstall:
# macOS
brew uninstall node
brew install node@20
brew link --force node@20

# Linux
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### inotify Limit Errors (Linux)

```bash
# Check current limit
cat /proc/sys/fs/inotify/max_user_watches

# Increase temporarily
sudo sysctl fs.inotify.max_user_watches=524288

# Make permanent
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Next Steps

After successful installation:

1. ✅ Read [CONFIG.md](CONFIG.md) for configuration options
2. ✅ Read [USAGE.md](USAGE.md) for usage examples
3. ✅ Create your first task
4. ✅ For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md)

## Uninstallation

### macOS

```bash
# Stop services
pm2 delete ticket-processor
brew services stop ollama

# Remove installed packages (optional)
brew uninstall podman podman-compose ollama
npm uninstall -g backlog.md kodu pm2

# Remove Podman machine
podman machine stop
podman machine rm
```

### Linux

```bash
# Stop and disable service
systemctl --user stop ticket-processor
systemctl --user disable ticket-processor
rm ~/.config/systemd/user/ticket-processor.service
systemctl --user daemon-reload

# Stop Ollama
systemctl --user stop ollama
systemctl --user disable ollama

# Remove packages (optional)
sudo apt remove podman nodejs
sudo npm uninstall -g backlog.md kodu pm2
```
