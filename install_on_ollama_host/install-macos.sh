#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Ticket Processor - macOS Setup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}✗ Homebrew not found${NC}"
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✓ Homebrew installed${NC}"
fi

# Install Podman
if ! command -v podman &> /dev/null; then
    echo -e "${YELLOW}Installing Podman...${NC}"
    brew install podman
    echo -e "${GREEN}✓ Podman installed${NC}"
else
    echo -e "${GREEN}✓ Podman already installed${NC}"
fi

# Install Podman Compose
if ! command -v podman-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Podman Compose...${NC}"
    brew install podman-compose
    echo -e "${GREEN}✓ Podman Compose installed${NC}"
else
    echo -e "${GREEN}✓ Podman Compose already installed${NC}"
fi

# Initialize Podman machine if needed
if ! podman machine list 2>/dev/null | grep -q "running"; then
    echo -e "${YELLOW}Initializing Podman machine...${NC}"
    podman machine init --cpus 4 --memory 8192 --disk-size 50 || true
    podman machine start
    echo -e "${GREEN}✓ Podman machine started${NC}"
else
    echo -e "${GREEN}✓ Podman machine running${NC}"
fi

# Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    brew install node@20
    brew link node@20
    echo -e "${GREEN}✓ Node.js installed${NC}"
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js already installed ($NODE_VERSION)${NC}"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 already installed${NC}"
fi

# Install Ollama
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Installing Ollama...${NC}"
    brew install ollama
    echo -e "${GREEN}✓ Ollama installed${NC}"
else
    echo -e "${GREEN}✓ Ollama already installed${NC}"
fi

# Start Ollama service
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}Starting Ollama service...${NC}"
    brew services start ollama
    sleep 3
    echo -e "${GREEN}✓ Ollama service started${NC}"
else
    echo -e "${GREEN}✓ Ollama service running${NC}"
fi

# Install Backlog.md
if ! command -v backlog &> /dev/null; then
    echo -e "${YELLOW}Installing Backlog.md...${NC}"
    npm install -g backlog.md
    echo -e "${GREEN}✓ Backlog.md installed${NC}"
else
    echo -e "${GREEN}✓ Backlog.md already installed${NC}"
fi

# Install Kilo Code CLI (kodu)
if ! command -v kodu &> /dev/null; then
    echo -e "${YELLOW}Installing Kilo Code CLI (kodu)...${NC}"
    npm install -g kodu
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

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Review and edit ${YELLOW}.env${NC} file with your configuration"
echo -e "2. Review ${YELLOW}config.json${NC} for model and processing settings"
echo -e "3. Run ${YELLOW}npm install${NC} to install Node.js dependencies"
echo -e "4. Run ${YELLOW}node scripts/start.js${NC} to start the system"
echo -e "\n${BLUE}Documentation:${NC}"
echo -e "- Installation guide: ${YELLOW}INSTALLATION.md${NC}"
echo -e "- Configuration: ${YELLOW}CONFIG.md${NC}"
echo -e "- Usage: ${YELLOW}USAGE.md${NC}"
echo -e "- Troubleshooting: ${YELLOW}TROUBLESHOOTING.md${NC}\n"
