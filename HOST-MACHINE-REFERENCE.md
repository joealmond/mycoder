# 🖥️ Host Machine Reference

**Machine:** LLM Development Server  
**Last Updated:** January 24, 2026  
**Purpose:** Run Kilo Code with local LLMs via Ollama + DevContainer

---

## System Specifications

| Component | Details |
|-----------|---------|
| **OS** | Linux Mint 22.3 (Zena) |
| **Kernel** | 6.8.0-90-generic |
| **CPU Architecture** | x86_64 (amd64) |
| **RAM** | 32 GB DDR |
| **GPU** | NVIDIA GeForce RTX 3090 (24 GB VRAM) |
| **GPU Driver** | 570.211.01 |
| **Local IP** | 192.168.0.10 |

---

## Storage Configuration

### Disk Layout

| Device | Size | Type | Mount | Purpose |
|--------|------|------|-------|---------|
| `nvme0n1p7` | 80 GB | NVMe SSD | `/` (root) | OS + Applications |
| `nvme0n1p2` | 200 MB | NVMe SSD | `/boot/efi` | EFI Boot |
| `sda1` | 465 GB | SATA SSD | *(unmounted)* | Available for data |
| `sdb3` | 3.6 TB | HDD (NTFS) | `/mnt/hdd` | ✅ LLM data storage |

### LLM Data Storage ✅

The 4TB HDD is mounted and configured for LLM workloads:

| Path | Purpose |
|------|---------|
| `/mnt/hdd` | Mount point for 4TB HDD (ADAT4TB) |
| `/mnt/hdd/llm-data/ollama` | Ollama model storage |
| `/mnt/hdd/llm-data/podman` | Podman container images |

**Auto-mount configured in `/etc/fstab`:**
```
UUID=06D22FBBD22FAE3D /mnt/hdd ntfs-3g defaults,remove_hiberfile,nofail 0 0
```

### System Optimizations Applied ✅

#### 1. Swap File (8 GB) - Memory Safety Buffer
- **Location:** `/swapfile` on NVMe SSD
- **Purpose:** Prevents OOM Killer crashes during peak VRAM-to-RAM offloading
- **Status:** ✅ Active

#### 2. ZRAM - RAM Compression
- **Package:** `zram-config`
- **Purpose:** Compressed swap in RAM, reduces reliance on slower disk storage
- **Benefit:** More efficient use of 32GB RAM for LLM workloads
- **Status:** ✅ Installed and configured

#### 3. Storage Path Redirection ✅
- **Ollama models:** `/mnt/hdd/llm-data/ollama`
- **Podman images:** `/mnt/hdd/llm-data/podman/storage`
- **Status:** ✅ Configured and active

```bash
# Verify storage locations
ollama info  # Shows OLLAMA_MODELS path
podman info --format '{{.Store.GraphRoot}}'  # Shows /mnt/hdd/llm-data/podman/storage
```

---

## Installed Software

### Container Runtime

| Software | Version | Status |
|----------|---------|--------|
| **Podman** | 4.9.3 | ✅ Installed |
| **nvidia-container-toolkit** | Latest | ✅ Installed |

```bash
# Verify GPU in containers
podman run --rm --device nvidia.com/gpu=all \
  nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

### LLM Infrastructure

| Software | Version | Status |
|----------|---------|--------|
| **Ollama** | Latest | ✅ Installed & Running |
| **Ollama Service** | systemd | ✅ Enabled |

```bash
# Service status
sudo systemctl status ollama

# API check
curl http://localhost:11434/api/tags
```

#### Ollama Models Installed

| Model | Size | Purpose |
|-------|------|---------|
| *(none yet)* | - | Pull models with `ollama pull <model>` |

**Recommended models to pull:**
```bash
ollama pull qwen2.5-coder:32b   # Best for coding, fits in 24GB VRAM
ollama pull deepseek-coder:33b  # Alternative coding model
ollama pull codellama:34b       # Meta's code model
```

### Development Tools

| Software | Version | Status |
|----------|---------|--------|
| **Node.js** | v24.13.0 | ✅ Installed |
| **npm** | 11.6.2 | ✅ Installed |
| **PM2** | 6.0.14 | ✅ Installed |
| **kodu** (Kilo Code CLI) | Latest | ✅ Installed at `/usr/bin/kodu` |
| **backlog.md** | Latest | ✅ Installed at `/usr/bin/backlog` |
| **Git** | (system) | ✅ Installed |
| **cloudflared** | Latest | ✅ Installed at `/usr/local/bin/cloudflared` |
| **code-server** | - | ❌ Not installed (optional) |

---

## Network Configuration

### Current State

| Port | Service | Binding | Status |
|------|---------|---------|--------|
| 11434 | Ollama API | `0.0.0.0` | ✅ Listening on all interfaces |
| 3000 | Gitea | - | Not running yet |
| 3001 | Webhook Server | - | Not running yet |
| 8080 | code-server | - | Not installed |

### Ollama Network Configuration ✅

Ollama is configured to listen on all interfaces for container and remote access:

```bash
# Override file location
/etc/systemd/system/ollama.service.d/override.conf

# Content
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

### Firewall Status

UFW is **inactive** - no firewall rules blocking local network access.

---

## Remote Access

### Local Network Access

From any machine on `192.168.0.x` network:

| Service | URL |
|---------|-----|
| Ollama API | `http://192.168.0.10:11434` |
| Gitea | `http://192.168.0.10:3000` |
| Webhook | `http://192.168.0.10:3001/health` |
| code-server | `http://192.168.0.10:8080` |

### Cloudflare Tunnel (Internet Access)

**Status:** Using existing tunnel on Synology NAS

| Component | Details |
|-----------|---------|
| **Tunnel Host** | Synology NAS |
| **NAS IP** | 192.168.0.5 |
| **cloudflared on server** | Installed (backup/alternative) |

The Cloudflare tunnel runs on the Synology NAS, which can proxy traffic to this dev server (192.168.0.10). This is a cleaner setup as the NAS is always on.

See [HOST-SETUP-PLAN.md](HOST-SETUP-PLAN.md) Phase 4 for configuring tunnel routes.

---

## Service Management Quick Reference

```bash
# Ollama
sudo systemctl status ollama
sudo systemctl restart ollama
ollama list                    # List models
ollama pull <model>            # Download model
ollama run <model>             # Test model

# Podman
podman ps                      # List running containers
podman images                  # List images
podman system prune -a         # Clean up

# Cloudflare Tunnel (once configured)
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
cloudflared tunnel list

# Node.js apps
pm2 list                       # List processes
pm2 logs                       # View logs
pm2 restart all                # Restart all
```

---

## Known Issues & Notes

1. **Root partition space:** Only 13GB free on 80GB SSD. Must redirect Podman/Ollama storage to HDD before pulling large models.

2. **HDD not mounted:** The 4TB HDD (`sdb3`) is NTFS formatted and not mounted. Need to:
   - Create mount point
   - Add to `/etc/fstab`
   - Create directories for Ollama/Podman

3. **Ollama localhost only:** Default Ollama config only listens on 127.0.0.1. Must configure for 0.0.0.0 for container/remote access.

4. **ZRAM vs Swap priority:** Current swap file has priority -2. ZRAM should have higher priority for better performance.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-24 | Initial document creation |
| 2026-01-24 | Ollama installed and configured for network access (0.0.0.0:11434) |
| 2026-01-24 | Node.js 24.13.0 installed |
| 2026-01-24 | Global npm packages installed: pm2, kodu, backlog.md |
| 2026-01-24 | Project dependencies installed |
| 2026-01-24 | Added Synology NAS (192.168.0.5) as Cloudflare tunnel host |
| 2026-01-24 | Mounted 4TB HDD at /mnt/hdd (NTFS) |
| 2026-01-24 | Configured Ollama models storage: /mnt/hdd/llm-data/ollama |
| 2026-01-24 | Configured Podman storage: /mnt/hdd/llm-data/podman/storage |
| 2026-01-24 | Updated devcontainer for Podman compatibility |
| 2026-01-24 | Tested container → Ollama connectivity ✅ |
