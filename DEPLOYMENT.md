# Deployment Guide

Production deployment guide for the Ticket Processor system, focusing on Linux servers with optional NVIDIA GPU acceleration.

## Overview

This guide covers:
- Production Linux deployment
- Systemd service configuration
- Podman rootless vs rootful setup
- NVIDIA GPU passthrough for Ollama
- Security hardening
- Monitoring and maintenance

---

## Prerequisites

- Linux server (Ubuntu 22.04+, Fedora 38+, or equivalent)
- 16GB+ RAM (32GB recommended for GPU workloads)
- 50GB+ free disk space
- Optional: NVIDIA GPU with drivers installed
- SSH access to the server
- Non-root user with sudo privileges

---

## Deployment Options

### Option 1: Rootless Podman (Recommended)

**Pros:**
- Better security (no root required)
- User isolation
- Safer for multi-user systems

**Cons:**
- Cannot bind to privileged ports (<1024) without extra config
- Some container features may be limited

### Option 2: Rootful Podman

**Pros:**
- Full container capabilities
- Can bind to any port
- Better compatibility

**Cons:**
- Requires root/sudo
- Larger security footprint

**This guide focuses on rootless deployment.**

---

## Installation

### 1. Run Installation Script

SSH into your server and run:

```bash
# Clone repository
git clone <your-repo-url> ~/ticket-processor
cd ~/ticket-processor

# Run installation
bash install/install-linux.sh
```

This will install all prerequisites including:
- Podman and Podman Compose
- Node.js 20+
- PM2
- Ollama
- Backlog.md and Kodu CLIs
- inotify-tools
- Detect NVIDIA GPU (if present)

### 2. NVIDIA GPU Setup (Optional)

If you have an NVIDIA GPU for accelerated model inference:

#### Install NVIDIA Drivers

**Ubuntu/Debian:**
```bash
sudo apt install nvidia-driver-535
sudo reboot
```

**Fedora/RHEL:**
```bash
sudo dnf install akmod-nvidia
sudo reboot
```

**Verify installation:**
```bash
nvidia-smi
```

#### Install nvidia-container-toolkit

**Ubuntu/Debian:**
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
```

**Fedora/RHEL:**
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.repo | \
  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo

sudo dnf install -y nvidia-container-toolkit
```

#### Configure Podman for NVIDIA

```bash
sudo nvidia-ctk runtime configure --runtime=podman
systemctl --user restart podman.socket
```

**Test GPU access:**
```bash
podman run --rm --security-opt=label=disable \
  --device nvidia.com/gpu=all \
  nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

---

## Configuration

### 1. Environment Setup

Copy and configure environment file:

```bash
cd ~/ticket-processor
cp .env.example .env
nano .env
```

**Production `.env` configuration:**

```bash
# Ollama (use host.containers.internal for rootless Podman)
OLLAMA_HOST=http://host.containers.internal:11434

# Gitea
GITEA_URL=http://localhost:3000
GITEA_WEBHOOK_SECRET=$(openssl rand -hex 32)
GITEA_SECRET_KEY=$(openssl rand -hex 32)
GITEA_ADMIN_USER=admin
GITEA_ADMIN_PASSWORD=$(openssl rand -base64 16)
GITEA_ADMIN_EMAIL=admin@yourdomain.com
GITEA_ORG=ticket-processor

# Git
GIT_USER_NAME=Ticket Processor Bot
GIT_USER_EMAIL=bot@yourdomain.com

# Environment
NODE_ENV=production
```

**Security Notes:**
- Use strong random secrets (shown above with `openssl`)
- Store admin password securely
- Change defaults immediately after setup

### 2. Application Configuration

Review `config.json`:

```bash
nano config.json
```

**Production recommendations:**

```json
{
  "ollama": {
    "defaultModel": "ollama/deepseek-coder",
    "timeout": 300000
  },
  "processing": {
    "concurrency": 1,
    "watchDebounce": 1000
  },
  "webhook": {
    "enabled": true,
    "port": 3001,
    "autoMergePR": true
  },
  "git": {
    "createPR": true,
    "pushRetries": 3
  },
  "logging": {
    "level": "info",
    "includeTimestamp": true
  }
}
```

### 3. Pull Ollama Models

```bash
ollama pull deepseek-coder
ollama pull codellama  # Optional backup model
```

**For GPU acceleration:**
- Ollama automatically detects and uses NVIDIA GPU
- Verify with: `ollama run deepseek-coder "test"`

---

## Service Installation

### Install as Systemd Service

```bash
cd ~/ticket-processor
bash scripts/install-service.sh
```

This will:
1. Create systemd user service
2. Enable service to start on boot
3. Enable user linger (keeps services running after logout)

### Start the Service

```bash
systemctl --user start ticket-processor
```

### Verify Service Status

```bash
systemctl --user status ticket-processor
```

Expected output:
```
● ticket-processor.service - Ticket Processor
     Loaded: loaded (/home/user/.config/systemd/user/ticket-processor.service; enabled)
     Active: active (running) since...
```

### View Logs

```bash
# Follow logs in real-time
journalctl --user -u ticket-processor -f

# View last 100 lines
journalctl --user -u ticket-processor -n 100

# View logs since today
journalctl --user -u ticket-processor --since today
```

---

## Podman Rootless Configuration

### Enable Socket Activation

```bash
systemctl --user enable --now podman.socket
```

### Configure Subuid/Subgid

Ensure your user has subuid/subgid ranges:

```bash
cat /etc/subuid | grep $USER
cat /etc/subgid | grep $USER
```

If empty, add ranges:
```bash
echo "$USER:100000:65536" | sudo tee -a /etc/subuid
echo "$USER:100000:65536" | sudo tee -a /etc/subgid
podman system migrate
```

### Configure User Linger

Allow services to run when user is logged out:

```bash
loginctl enable-linger $USER
```

### Increase Resource Limits

```bash
# Increase inotify watches
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Increase file descriptors
echo "$USER soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "$USER hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

Log out and back in for limits to take effect.

---

## Starting Containers

### Start Gitea and PostgreSQL

```bash
cd ~/ticket-processor
podman-compose -f containers/podman-compose.yml up -d
```

**Verify containers:**
```bash
podman ps
```

Expected output:
```
CONTAINER ID  IMAGE                    STATUS      PORTS
xxx           gitea/gitea:latest       Up          0.0.0.0:3000->3000/tcp
yyy           postgres:15-alpine       Up
```

### Configure Auto-start

Enable containers to start on boot:

```bash
cd ~/ticket-processor/containers

# Generate systemd service files
podman generate systemd --new --files --name ticket-processor-gitea
podman generate systemd --new --files --name ticket-processor-postgres

# Move to systemd directory
mkdir -p ~/.config/systemd/user
mv container-*.service ~/.config/systemd/user/

# Enable services
systemctl --user enable container-ticket-processor-gitea.service
systemctl --user enable container-ticket-processor-postgres.service
```

---

## Network Configuration

### Expose Services (Optional)

To access Gitea from outside:

**Option 1: Nginx reverse proxy** (recommended)

```nginx
server {
    listen 80;
    server_name git.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Option 2: Direct port binding** (requires rootful or port forwarding)

```bash
# Forward privileged port
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
```

### Firewall Configuration

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 3000/tcp  # Gitea
sudo ufw allow 3001/tcp  # Webhook (if external)

# Fedora/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

---

## Security Hardening

### 1. Restrict File Permissions

```bash
cd ~/ticket-processor
chmod 600 .env
chmod -R 750 scripts/
```

### 2. Enable SELinux (if available)

```bash
# Check SELinux status
getenforce

# Set to enforcing
sudo setenforce 1
sudo sed -i 's/SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
```

### 3. Configure Gitea Security

After first start, access Gitea at `http://your-server:3000` and:

1. Complete installation wizard
2. Change admin password
3. Disable public registration
4. Enable 2FA for admin account
5. Configure webhook signing secret

### 4. Limit Resource Usage

Edit systemd service to add limits:

```bash
nano ~/.config/systemd/user/ticket-processor.service
```

Add under `[Service]`:
```ini
# CPU limit (50%)
CPUQuota=50%

# Memory limit
MemoryLimit=2G
MemoryMax=3G

# Task limit
TasksMax=512
```

Reload and restart:
```bash
systemctl --user daemon-reload
systemctl --user restart ticket-processor
```

---

## Monitoring

### Service Health Checks

```bash
# Check service status
bash scripts/service-status.sh

# Or directly:
systemctl --user status ticket-processor
```

### Log Monitoring

```bash
# Follow logs
journalctl --user -u ticket-processor -f

# Check for errors
journalctl --user -u ticket-processor -p err --since today
```

### Resource Usage

```bash
# Check CPU/Memory
systemctl --user status ticket-processor | grep -A 5 "Memory:"

# Or use htop
htop -u $USER
```

### Container Monitoring

```bash
# Container stats
podman stats

# Container logs
podman logs -f ticket-processor-gitea
podman logs -f ticket-processor-postgres
```

### Disk Usage

```bash
# Check disk usage
du -sh ~/ticket-processor/{backlog,repos,logs}

# Podman images
podman images

# Clean unused images
podman image prune -a
```

---

## Maintenance

### Backup

**Backup directories:**
```bash
# Create backup directory
mkdir -p ~/backups

# Backup ticket data
tar -czf ~/backups/tickets-$(date +%Y%m%d).tar.gz \
  ~/ticket-processor/backlog \
  ~/ticket-processor/repos \
  ~/ticket-processor/config.json \
  ~/ticket-processor/.env

# Backup Gitea data (if using volumes)
podman volume export gitea-data > ~/backups/gitea-data-$(date +%Y%m%d).tar
```

**Automated backup script:**
```bash
cat > ~/backup-tickets.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d)
tar -czf $BACKUP_DIR/tickets-$DATE.tar.gz ~/ticket-processor/{backlog,repos,config.json,.env}
find $BACKUP_DIR -name "tickets-*.tar.gz" -mtime +7 -delete
EOF

chmod +x ~/backup-tickets.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * ~/backup-tickets.sh
```

### Updates

**Update system packages:**
```bash
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
sudo dnf update -y  # Fedora/RHEL
```

**Update Node.js packages:**
```bash
cd ~/ticket-processor
npm update
```

**Update Ollama:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
systemctl --user restart ollama
```

**Update models:**
```bash
ollama pull deepseek-coder
ollama pull codellama
```

**Update containers:**
```bash
cd ~/ticket-processor/containers
podman-compose pull
podman-compose up -d
```

### Log Rotation

**Configure journald:**
```bash
sudo nano /etc/systemd/journald.conf
```

Set:
```ini
[Journal]
SystemMaxUse=500M
SystemMaxFileSize=100M
MaxRetentionSec=7day
```

Restart journald:
```bash
sudo systemctl restart systemd-journald
```

**Manual cleanup:**
```bash
journalctl --vacuum-time=7d
journalctl --vacuum-size=100M
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
journalctl --user -u ticket-processor -n 50

# Check service file
systemctl --user cat ticket-processor

# Validate syntax
systemd-analyze verify ~/.config/systemd/user/ticket-processor.service
```

### Ollama Connection Issues

```bash
# Check Ollama service
systemctl --user status ollama

# Test connection
curl http://localhost:11434/api/tags

# Restart Ollama
systemctl --user restart ollama
```

### Container Issues

```bash
# Check container logs
podman logs ticket-processor-gitea
podman logs ticket-processor-postgres

# Restart containers
podman-compose -f containers/podman-compose.yml restart

# Reset containers
podman-compose -f containers/podman-compose.yml down
podman-compose -f containers/podman-compose.yml up -d
```

### GPU Not Detected

```bash
# Verify NVIDIA drivers
nvidia-smi

# Check Podman GPU support
podman run --rm --device nvidia.com/gpu=all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi

# Check Ollama GPU usage
ollama run deepseek-coder "test" --verbose
```

---

## Performance Tuning

### For GPU Systems

```json
{
  "processing": {
    "concurrency": 2
  },
  "ollama": {
    "timeout": 600000
  }
}
```

### For CPU-Only Systems

```json
{
  "processing": {
    "concurrency": 1
  },
  "ollama": {
    "defaultModel": "ollama/mistral",
    "timeout": 180000
  }
}
```

### High-Volume Workloads

- Increase `max_memory_restart` in systemd service
- Use faster models (mistral vs deepseek-coder)
- Increase concurrent processing (if resources allow)
- Monitor with `htop` and `podman stats`

---

## Disaster Recovery

### Restore from Backup

```bash
# Stop services
systemctl --user stop ticket-processor
podman-compose -f containers/podman-compose.yml down

# Extract backup
tar -xzf ~/backups/tickets-YYYYMMDD.tar.gz -C /

# Restore Gitea data
podman volume import gitea-data < ~/backups/gitea-data-YYYYMMDD.tar

# Start services
podman-compose -f containers/podman-compose.yml up -d
systemctl --user start ticket-processor
```

---

## See Also

- [INSTALLATION.md](INSTALLATION.md) - Installation guide
- [CONFIG.md](CONFIG.md) - Configuration reference
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
