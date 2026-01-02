#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Ticket Processor - Linux Setup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Detect package manager
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    UPDATE_CMD="sudo apt-get update"
    INSTALL_CMD="sudo apt-get install -y"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    UPDATE_CMD="sudo dnf check-update || true"
    INSTALL_CMD="sudo dnf install -y"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    UPDATE_CMD="sudo yum check-update || true"
    INSTALL_CMD="sudo yum install -y"
else
    echo -e "${RED}✗ Unsupported package manager. Please install manually.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Detected package manager: $PKG_MANAGER${NC}"
echo -e "${YELLOW}Updating package lists...${NC}"
$UPDATE_CMD

# Install Podman
if ! command -v podman &> /dev/null; then
    echo -e "${YELLOW}Installing Podman...${NC}"
    $INSTALL_CMD podman
    echo -e "${GREEN}✓ Podman installed${NC}"
else
    echo -e "${GREEN}✓ Podman already installed${NC}"
fi

# Install Podman Compose
if ! command -v podman-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Podman Compose...${NC}"
    if [ "$PKG_MANAGER" = "apt" ]; then
        $INSTALL_CMD python3-pip
        pip3 install podman-compose
    else
        $INSTALL_CMD podman-compose
    fi
    echo -e "${GREEN}✓ Podman Compose installed${NC}"
else
    echo -e "${GREEN}✓ Podman Compose already installed${NC}"
fi

# Configure Podman for rootless mode
if ! systemctl --user status podman.socket &> /dev/null; then
    echo -e "${YELLOW}Enabling Podman socket for rootless mode...${NC}"
    systemctl --user enable --now podman.socket
    loginctl enable-linger $USER
    echo -e "${GREEN}✓ Podman rootless mode configured${NC}"
else
    echo -e "${GREEN}✓ Podman rootless already configured${NC}"
fi

# Install Node.js 20+
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    if [ "$PKG_MANAGER" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        $INSTALL_CMD nodejs
    else
        $INSTALL_CMD nodejs npm
    fi
    echo -e "${GREEN}✓ Node.js installed${NC}"
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js already installed ($NODE_VERSION)${NC}"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 already installed${NC}"
fi

# Install inotify-tools (for file watching)
if ! command -v inotifywait &> /dev/null; then
    echo -e "${YELLOW}Installing inotify-tools...${NC}"
    $INSTALL_CMD inotify-tools
    echo -e "${GREEN}✓ inotify-tools installed${NC}"
else
    echo -e "${GREEN}✓ inotify-tools already installed${NC}"
fi

# Install Ollama
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Installing Ollama...${NC}"
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✓ Ollama installed${NC}"
else
    echo -e "${GREEN}✓ Ollama already installed${NC}"
fi

# Check for NVIDIA GPU
if lspci | grep -i nvidia &> /dev/null; then
    echo -e "\n${BLUE}NVIDIA GPU detected!${NC}"
    
    if ! command -v nvidia-smi &> /dev/null; then
        echo -e "${YELLOW}⚠ NVIDIA drivers not found${NC}"
        echo -e "${YELLOW}For GPU acceleration, install NVIDIA drivers:${NC}"
        echo -e "  Ubuntu/Debian: sudo apt install nvidia-driver-535"
        echo -e "  Fedora/RHEL: sudo dnf install akmod-nvidia"
        echo -e "\n${YELLOW}For container GPU support, also install:${NC}"
        echo -e "  sudo apt install nvidia-container-toolkit (Debian/Ubuntu)"
        echo -e "  sudo dnf install nvidia-container-toolkit (Fedora/RHEL)"
        echo -e "\n${YELLOW}Then run: sudo nvidia-ctk runtime configure --runtime=podman${NC}"
    else
        echo -e "${GREEN}✓ NVIDIA drivers installed${NC}"
        nvidia-smi --query-gpu=name --format=csv,noheader | head -1
        
        if ! command -v nvidia-ctk &> /dev/null; then
            echo -e "${YELLOW}⚠ nvidia-container-toolkit not found${NC}"
            echo -e "${YELLOW}Install for GPU support in containers:${NC}"
            echo -e "  $INSTALL_CMD nvidia-container-toolkit"
            echo -e "  sudo nvidia-ctk runtime configure --runtime=podman"
        else
            echo -e "${GREEN}✓ nvidia-container-toolkit installed${NC}"
        fi
    fi
else
    echo -e "${YELLOW}ℹ No NVIDIA GPU detected (CPU-only mode will be used)${NC}"
fi

# Start Ollama service
if ! systemctl --user is-active ollama &> /dev/null; then
    echo -e "${YELLOW}Starting Ollama service...${NC}"
    
    # Create systemd user service for Ollama
    mkdir -p ~/.config/systemd/user
    cat > ~/.config/systemd/user/ollama.service <<EOF
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
    
    systemctl --user daemon-reload
    systemctl --user enable --now ollama.service
    sleep 3
    echo -e "${GREEN}✓ Ollama service started${NC}"
else
    echo -e "${GREEN}✓ Ollama service running${NC}"
fi

# Install Backlog.md
if ! command -v backlog &> /dev/null; then
    echo -e "${YELLOW}Installing Backlog.md...${NC}"
    sudo npm install -g backlog.md
    echo -e "${GREEN}✓ Backlog.md installed${NC}"
else
    echo -e "${GREEN}✓ Backlog.md already installed${NC}"
fi

# Install Kilo Code CLI (kodu)
if ! command -v kodu &> /dev/null; then
    echo -e "${YELLOW}Installing Kilo Code CLI (kodu)...${NC}"
    sudo npm install -g kodu
    echo -e "${GREEN}✓ Kodu installed${NC}"
else
    echo -e "${GREEN}✓ Kodu already installed${NC}"
fi

# Pull Ollama models
echo -e "\n${BLUE}Ollama Models${NC}"
echo -e "${YELLOW}Checking for recommended models...${NC}"

if ! ollama list | grep -q "deepseek-coder"; then
    echo -e "${YELLOW}Pulling deepseek-coder model (this may take a while)...${NC}"
    ollama pull deepseek-coder
    echo -e "${GREEN}✓ deepseek-coder model ready${NC}"
else
    echo -e "${GREEN}✓ deepseek-coder model already available${NC}"
fi

if ! ollama list | grep -q "codellama"; then
    echo -e "${YELLOW}Do you want to pull codellama model as well? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        ollama pull codellama
        echo -e "${GREEN}✓ codellama model ready${NC}"
    fi
else
    echo -e "${GREEN}✓ codellama model already available${NC}"
fi

# Configure git if needed
if ! git config --global user.name &> /dev/null; then
    echo -e "\n${YELLOW}Git configuration needed${NC}"
    echo -e "Enter your git user name:"
    read -r git_name
    git config --global user.name "$git_name"
    
    echo -e "Enter your git email:"
    read -r git_email
    git config --global user.email "$git_email"
    
    echo -e "${GREEN}✓ Git configured${NC}"
else
    GIT_NAME=$(git config --global user.name)
    GIT_EMAIL=$(git config --global user.email)
    echo -e "${GREEN}✓ Git already configured ($GIT_NAME <$GIT_EMAIL>)${NC}"
fi

# Increase inotify limits for file watching
echo -e "\n${YELLOW}Configuring inotify limits...${NC}"
if ! grep -q "fs.inotify.max_user_watches" /etc/sysctl.conf; then
    echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    echo -e "${GREEN}✓ inotify limits increased${NC}"
else
    echo -e "${GREEN}✓ inotify limits already configured${NC}"
fi

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Review and edit ${YELLOW}.env${NC} file with your configuration"
echo -e "2. Review ${YELLOW}config.json${NC} for model and processing settings"
echo -e "3. Run ${YELLOW}npm install${NC} to install Node.js dependencies"
echo -e "4. Run ${YELLOW}node scripts/start.js${NC} to start the system"
echo -e "   Or install as systemd service: ${YELLOW}bash scripts/install-service.sh${NC}"
echo -e "\n${BLUE}Documentation:${NC}"
echo -e "- Installation guide: ${YELLOW}INSTALLATION.md${NC}"
echo -e "- Deployment guide: ${YELLOW}DEPLOYMENT.md${NC}"
echo -e "- Configuration: ${YELLOW}CONFIG.md${NC}"
echo -e "- Usage: ${YELLOW}USAGE.md${NC}"
echo -e "- Troubleshooting: ${YELLOW}TROUBLESHOOTING.md${NC}\n"
