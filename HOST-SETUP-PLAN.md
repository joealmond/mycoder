# 🚀 Complete Setup Plan: MyCoder DevContainer with Remote Access

**Created:** January 24, 2026  
**Updated:** January 24, 2026  
**Goal:** Set up the ticket-processor devcontainer on Linux with Podman + Ollama, accessible locally and remotely via Cloudflare Tunnel.

**Host Machine Reference:** See [HOST-MACHINE-REFERENCE.md](HOST-MACHINE-REFERENCE.md) for system specs and current state.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🧑 **[Jocó]** | Task for you (requires physical/manual action) |
| 🤖 **[LLM]** | Task for Claude (code/config changes, running commands) |
| ✅ | Completed |
| ⬜ | To do |

---

## System Optimizations Applied ✅

These optimizations were previously configured on this machine:

| Optimization | Description | Status |
|--------------|-------------|--------|
| **8GB Swap File** | Memory safety buffer on NVMe SSD to prevent OOM crashes during VRAM-to-RAM offloading | ✅ Active |
| **ZRAM Compression** | RAM compression for more efficient memory use, reduces disk swap reliance | ✅ Active |
| **Storage Redirection** | Podman/Ollama configured to use 4TB HDD for model storage instead of 80GB root SSD | ⬜ Pending |

---

## Phase 1: Linux PC Configuration

### 1.1 Prerequisites Check

- [x] ✅ Podman installed: **v4.9.3**
- [x] ✅ NVIDIA drivers working: **RTX 3090 (24GB VRAM)**, Driver **570.211.01**
- [x] ✅ nvidia-container-toolkit installed
- [x] ✅ Ollama installed and running as systemd service
- [x] ✅ Node.js installed: **v24.13.0**
- [x] ✅ npm installed: **v11.6.2**
- [x] ✅ cloudflared installed: `/usr/local/bin/cloudflared`

### 1.2 Remaining Setup Tasks

- [x] ✅ 🤖 **[LLM]** Configure Ollama to listen on all interfaces (0.0.0.0:11434)

- [x] ✅ 🤖 **[LLM]** Install global npm packages (pm2 6.0.14, kodu, backlog.md)

- [x] ✅ 🤖 **[LLM]** Install project dependencies (npm install)

- [ ] 🧑 **[Jocó]** Pull Ollama models (requires choosing which models you want)
  ```bash
  # Recommended for RTX 3090 (24GB VRAM):
  ollama pull qwen2.5-coder:32b    # ~20GB, excellent for coding
  ollama pull deepseek-coder:6.7b  # ~4GB, fast for simple tasks
  ```

### 1.3 Firewall Status

- [x] ✅ 🤖 **[LLM]** Checked UFW status - **INACTIVE** (no firewall blocking)

### 1.4 Storage Redirection ✅

- [x] ✅ 🤖 **[LLM]** Mounted 4TB HDD at `/mnt/hdd` (NTFS, preserving data)
- [x] ✅ 🤖 **[LLM]** Added to `/etc/fstab` for auto-mount on boot
- [x] ✅ 🤖 **[LLM]** Created `/mnt/hdd/llm-data/ollama` for model storage
- [x] ✅ 🤖 **[LLM]** Created `/mnt/hdd/llm-data/podman` for container images
- [x] ✅ 🤖 **[LLM]** Configured Ollama: `OLLAMA_MODELS=/mnt/hdd/llm-data/ollama`
- [x] ✅ 🤖 **[LLM]** Configured Podman: `graphroot=/mnt/hdd/llm-data/podman/storage`

---

## Phase 2: DevContainer Configuration ✅

### 2.1 DevContainer Files Updated

- [x] ✅ 🤖 **[LLM]** Updated `.devcontainer/devcontainer.json`:
  - Podman compatibility (`--userns=keep-id`, `--security-opt=label=disable`)
  - Uses `host.containers.internal` for Ollama access
  - Added useful VS Code extensions
  
- [x] ✅ 🤖 **[LLM]** Updated `.devcontainer/Dockerfile`:
  - Node.js 24 base image
  - Added jq, vim for debugging
  
- [x] ✅ 🤖 **[LLM]** Updated `.devcontainer/setup-tools.sh`:
  - Installs pm2, kodu, backlog.md
  - Tests Ollama connectivity
  - Shows quick start commands

- [ ] 🤖 **[LLM]** Update `containers/Dockerfile` to include:
  - GPU-enabled base image option
  - Kilo Code CLI configuration
  - Development tools

- [ ] 🤖 **[LLM]** Update `containers/podman-compose.yml` for:
  - GPU passthrough to containers
  - Proper network configuration for external access
  - Volume mounts for persistence

### 2.2 Environment Configuration

- [x] ✅ 🤖 **[LLM]** `.env.example` already exists with all required variables

- [ ] 🧑 **[Jocó]** Create `.env` file and configure (when ready to start containers)
  ```bash
  cd ~/dev/mycoder
  cp .env.example .env
  nano .env   # Edit with your values
  ```

### 2.3 Test DevContainer

- [ ] 🤖 **[LLM]** Build and test devcontainer
- [ ] 🧑 **[Jocó]** Open in VS Code and "Reopen in Container"

### 2.4 Start Full Stack (Optional - for Gitea integration)

- [ ] 🧑 **[Jocó]** Start containers with Podman Compose (when ready)
  ```bash
  cd ~/dev/mycoder/containers
  podman-compose up -d
  podman ps   # Should show: gitea, postgres, ticket-processor-app
  ```

---

## Phase 3: Local Network Access (From Laptop)

### 3.1 Find Your Server's IP

- [ ] 🧑 **[Jocó]** Get the Linux PC's local IP address
  ```bash
  ip addr show | grep "inet " | grep -v 127.0.0.1
  # Note the IP, e.g., 192.168.1.100
  ```

### 3.2 Test Local Access

From your laptop on the same network:

- [ ] 🧑 **[Jocó]** Test Ollama access
  ```bash
  curl http://<SERVER-IP>:11434/api/tags
  ```

- [ ] 🧑 **[Jocó]** Test Gitea access
  - Open browser: `http://<SERVER-IP>:3000`

- [ ] 🧑 **[Jocó]** Test webhook server
  ```bash
  curl http://<SERVER-IP>:3001/health
  ```

### 3.3 VS Code Remote Development Options

**Option A: SSH Remote (Recommended)**

- [ ] 🧑 **[Jocó]** Enable SSH on the Linux PC
  ```bash
  sudo apt install openssh-server
  sudo systemctl enable ssh
  sudo systemctl start ssh
  ```

- [ ] 🧑 **[Jocó]** From laptop VS Code:
  1. Install "Remote - SSH" extension
  2. Connect to `ssh user@<SERVER-IP>`
  3. Open folder `/home/mandulaj/dev/mycoder`
  4. Reopen in Container (uses Podman)

**Option B: code-server (Web-based VS Code)**

- [ ] 🧑 **[Jocó]** Install code-server
  ```bash
  curl -fsSL https://code-server.dev/install.sh | sh
  ```

- [ ] 🧑 **[Jocó]** Configure code-server
  ```bash
  mkdir -p ~/.config/code-server
  cat > ~/.config/code-server/config.yaml << EOF
  bind-addr: 0.0.0.0:8080
  auth: password
  password: <your-secure-password>
  cert: false
  EOF
  ```

- [ ] 🧑 **[Jocó]** Start code-server
  ```bash
  sudo systemctl enable --now code-server@$USER
  ```

- [ ] 🧑 **[Jocó]** Access from laptop browser: `http://<SERVER-IP>:8080`

---

## Phase 4: Remote Access via Cloudflare Tunnel

### 4.1 Current Setup

You already have **cloudflared running on your Synology NAS** (192.168.0.5), which is the recommended approach:

✅ **Advantages of NAS-hosted tunnel:**
- NAS is always on (unlike dev PC which may sleep/shutdown)
- Centralized tunnel management for all home services
- Dev server doesn't need to run cloudflared
- Can add/remove services via NAS configuration

### 4.2 Network Topology

```
Internet → Cloudflare → Synology NAS (192.168.0.5) → Dev Server (192.168.0.10)
                         cloudflared tunnel              :11434 Ollama
                                                         :3000 Gitea
                                                         :3001 Webhook
                                                         :8080 code-server
```

### 4.3 Configure Tunnel Routes on Synology NAS

- [ ] 🧑 **[Jocó]** Add routes to your existing Cloudflare tunnel on the NAS

  In the Synology Cloudflare tunnel config (or Cloudflare Zero Trust dashboard), add these public hostnames pointing to the dev server:

  | Public Hostname | Service URL | Description |
  |-----------------|-------------|-------------|
  | `code.yourdomain.com` | `http://192.168.0.10:8080` | VS Code Server |
  | `git.yourdomain.com` | `http://192.168.0.10:3000` | Gitea |
  | `ollama.yourdomain.com` | `http://192.168.0.10:11434` | Ollama API |
  | `webhook.yourdomain.com` | `http://192.168.0.10:3001` | Webhook endpoint |

  **Via Cloudflare Dashboard:**
  1. Go to: Zero Trust → Networks → Tunnels
  2. Select your existing tunnel
  3. Add Public Hostname for each service
  4. Set Service to the dev server IP:port

### 4.4 Security Considerations

- [ ] 🧑 **[Jocó]** Add Cloudflare Access policies (recommended for Ollama)
  - Go to: Cloudflare Dashboard → Zero Trust → Access → Applications
  - Create policies requiring authentication for sensitive endpoints
  - **Especially important for Ollama** - don't expose LLM API publicly without auth!
  - Options: Email OTP, GitHub, Google auth

### 4.5 Alternative: Run Tunnel on Dev Server (Backup)

If you prefer to run the tunnel directly on the dev server (cloudflared is already installed):

```bash
# Authenticate (one-time)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create mycoder-dev

# Configure and run as service
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

---

## Phase 5: Final Verification Checklist

### Local (on Linux PC)

- [ ] 🧑 **[Jocó]** `ollama list` shows your models
- [ ] 🧑 **[Jocó]** `podman ps` shows all containers running
- [ ] 🧑 **[Jocó]** `curl http://localhost:3000` returns Gitea page
- [ ] 🧑 **[Jocó]** `curl http://localhost:3001/health` returns OK
- [ ] 🧑 **[Jocó]** `curl http://localhost:11434/api/tags` returns models

### Local Network (from laptop)

- [ ] 🧑 **[Jocó]** Can access `http://<SERVER-IP>:8080` (code-server) OR connect via SSH
- [ ] 🧑 **[Jocó]** Can access `http://<SERVER-IP>:3000` (Gitea)
- [ ] 🧑 **[Jocó]** Can run Kilo Code with Ollama from devcontainer

### Remote (via Cloudflare)

- [ ] 🧑 **[Jocó]** Can access `https://code.yourdomain.com`
- [ ] 🧑 **[Jocó]** Can access `https://git.yourdomain.com`
- [ ] 🧑 **[Jocó]** Cloudflare Access policies work (if configured)

### Test Full Workflow

- [ ] 🧑 **[Jocó]** Create a test task
  ```bash
  node scripts/create-task.js
  ```
- [ ] 🧑 **[Jocó]** Watch it process
  ```bash
  podman-compose logs -f ticket-processor-app
  ```
- [ ] 🧑 **[Jocó]** Verify PR created in Gitea

---

## Quick Reference: Service Management

```bash
# Ollama
sudo systemctl status ollama
sudo systemctl restart ollama

# Podman containers
cd ~/dev/mycoder/containers
podman-compose ps
podman-compose up -d
podman-compose down
podman-compose logs -f

# Cloudflare Tunnel
sudo systemctl status cloudflared
sudo systemctl restart cloudflared

# code-server
sudo systemctl status code-server@$USER
sudo systemctl restart code-server@$USER
```

---

## Next Steps After Setup

1. 🧑 **[Jocó]** Start with Phase 1, tick off each item
2. 🤖 **[LLM]** I'll update the devcontainer configs when you're ready for Phase 2
3. 🧑 **[Jocó]** Test local network access (Phase 3)
4. 🧑 **[Jocó]** Set up Cloudflare (Phase 4) when you need remote access

---

**Let me know when you're ready to proceed with any phase, and I'll help with the LLM tasks!**
