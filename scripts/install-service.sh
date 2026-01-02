#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Installing Ticket Processor as systemd service...${NC}\n"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}✗ This script only works on Linux${NC}"
    echo -e "${YELLOW}For macOS, use PM2 instead:${NC}"
    echo -e "  npm install -g pm2"
    echo -e "  pm2 start ecosystem.config.js"
    echo -e "  pm2 save"
    echo -e "  pm2 startup"
    exit 1
fi

# Get project directory (parent of scripts directory)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_FILE="$PROJECT_DIR/systemd/ticket-processor.service"

if [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${RED}✗ Service file not found: $SERVICE_FILE${NC}"
    exit 1
fi

# Create user systemd directory
mkdir -p ~/.config/systemd/user

# Copy service file and replace %i with current user
USER_SERVICE_FILE="$HOME/.config/systemd/user/ticket-processor.service"
sed "s|%i|$USER|g; s|/home/%i/ticket-processor|$PROJECT_DIR|g" "$SERVICE_FILE" > "$USER_SERVICE_FILE"

echo -e "${GREEN}✓ Service file created: $USER_SERVICE_FILE${NC}"

# Reload systemd daemon
systemctl --user daemon-reload
echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"

# Enable service
systemctl --user enable ticket-processor.service
echo -e "${GREEN}✓ Service enabled (will start on boot)${NC}"

# Enable linger (keeps services running after logout)
loginctl enable-linger $USER
echo -e "${GREEN}✓ User linger enabled${NC}"

echo -e "\n${BLUE}Service installed successfully!${NC}\n"
echo -e "${YELLOW}Available commands:${NC}"
echo -e "  Start:   ${GREEN}systemctl --user start ticket-processor${NC}"
echo -e "  Stop:    ${GREEN}systemctl --user stop ticket-processor${NC}"
echo -e "  Restart: ${GREEN}systemctl --user restart ticket-processor${NC}"
echo -e "  Status:  ${GREEN}systemctl --user status ticket-processor${NC}"
echo -e "  Logs:    ${GREEN}journalctl --user -u ticket-processor -f${NC}"
echo -e "\n${YELLOW}Start the service now? (y/N):${NC} "
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    systemctl --user start ticket-processor
    sleep 2
    systemctl --user status ticket-processor --no-pager
fi
