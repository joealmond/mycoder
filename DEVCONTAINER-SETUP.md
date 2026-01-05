# Multi-Machine Setup Checklist

## Overview
- **Mac Host** (OrbStack): Manages devcontainers and runs Ollama server
- **Mac Devcontainer**: Development environment for this project
- **Linux Mint**: Backup Ollama host for running the system standalone

---

## 1. Mac Host Setup

### Install Once
- [ ] **OrbStack** (already done)
- [ ] **devcontainer CLI**: `npm install -g @devcontainers/cli`
- [ ] **chezmoi**: `brew install chezmoi`
- [ ] **Ollama server**: `brew install ollama && brew services start ollama`

### Create Repos
- [ ] **Dotfiles Repo** (private, on Gitea NAS):
  - Purpose: Store SSH config, git config, shell aliases needed in containers
  - Example structure:
    ```
    dotfiles/
    ├── dot_gitconfig          # Git user/email config
    ├── dot_bash_aliases       # Shell aliases
    ├── .ssh/
    │   └── config.template    # SSH hosts (keep real IPs private)
    └── dot_bashrc             # Shell customizations
    ```
  - Push to: `your-nas.local/gitea/dotfiles.git`

### Dotfiles Focus
Only include **project-relevant configs**:
- ✅ `~/.gitconfig` (user/email for commits)
- ✅ `~/.ssh/config` (SSH hosts like your Mint machine)
- ✅ `~/.bash_aliases` (project-related aliases)
- ❌ Skip: `.vscode/`, `.npm/`, other editor bloat

### Create & Push Dotfiles Repo
```bash
# Initialize chezmoi
cd ~
chezmoi init

# Add configs
chezmoi add ~/.gitconfig
chezmoi add ~/.bash_aliases

# For SSH config (sensitive), add as template
mkdir -p ~/.local/share/chezmoi/dot_ssh
cp ~/.ssh/config ~/.local/share/chezmoi/dot_ssh/config
chezmoi edit ~/.ssh/config  # Replace IPs with placeholders if public repo

# Push to Gitea
cd ~/.local/share/chezmoi
git remote add origin ssh://git.example.com:2222/your-user/dotfiles.git
git add .
git commit -m "Initial dotfiles"
git push -u origin main
```

### Test Locally
```bash
chezmoi init --apply ssh://git.example.com:2222/your-user/dotfiles.git
git config --global user.name  # Should show your name
chezmoi edit ~/.ssh/config     # Verify it shows your config
```

---

## 2. Mac Devcontainer (Running in OrbStack)

### Automatic on "Reopen in Container"
These run automatically via `setup-tools.sh`:
- [ ] Install chezmoi
- [ ] Clone your dotfiles repo from Gitea
- [ ] Apply configs (SSH, git, aliases)
- [ ] Install Ollama CLI, PM2, kodu, backlog.md
- [ ] `npm install`

### Verify on First Startup
```bash
# Inside container after "Reopen in Container"
chezmoi status           # Shows synced configs
cat ~/.gitconfig         # Check git is configured
ssh -T git@github.com    # Test SSH via mounted ~/.ssh
curl http://host.docker.internal:11434/api/tags  # Test Ollama host
```

### No Manual Setup Needed
Everything is automated. Just update `devcontainer.json`:
```jsonc
"remoteEnv": {
  "CHEZMOI_REPO": "ssh://your-nas.local:2222/git/dotfiles.git"
  // Or: "https://your-nas.local/gitea/dotfiles.git"
}
```

---

## 3. Linux Mint (Ollama Host + Optional Standalone)

### Install Once
```bash
bash install/install-linux.sh
```
Installs:
- [ ] Podman + Compose
- [ ] Node.js 20+
- [ ] Ollama server (systemd service)
- [ ] chezmoi
- [ ] PM2, kodu, backlog.md

### Optional: Sync Dotfiles
```bash
chezmoi init --apply ssh://your-nas.local:2222/git/dotfiles.git
```

### Verify Ollama
```bash
systemctl --user status ollama
curl http://localhost:11434/api/tags
```

### Verify Connection from Mac Container
```bash
# From Mac devcontainer
curl http://host.docker.internal:11434/api/tags  # Works (OrbStack)

# From Mint (if running Linux container later)
curl http://localhost:11434/api/tags  # Works locally
```

---

## Repos to Create

### 1. Dotfiles (Private, on Gitea NAS)
```bash
# Initialize chezmoi and add configs
cd ~
chezmoi init
chezmoi add ~/.gitconfig
chezmoi add ~/.bash_aliases

# Add SSH config (handle sensitive data carefully)
mkdir -p ~/.local/share/chezmoi/dot_ssh
cp ~/.ssh/config ~/.local/share/chezmoi/dot_ssh/config
chezmoi edit ~/.ssh/config  # Replace real IPs with placeholders if needed

# Push to Gitea
cd ~/.local/share/chezmoi
git remote add origin ssh://git.example.com:2222/your-user/dotfiles.git
git add . && git commit -m "Initial dotfiles"
git push -u origin main
```

**What's included:**
- `.gitconfig` → enables commits in containers without manual setup
- `.bash_aliases` → project shortcuts
- `.ssh/config` → SSH hosts (use templates for sensitive data)

### 2. This Repo (mycoder)
Already exists. Update `devcontainer.json`:
```jsonc
{
  "name": "ticket-processor",
  "remoteEnv": {
    "CHEZMOI_REPO": "ssh://your-nas.local:2222/git/dotfiles.git"
  }
  // ... rest of config
}
```

---

## Quick Decision Tree

**Q: Where does Ollama server run?**
- A: Mac host (via `ollama serve` in background) or Linux Mint

**Q: Where does the project code run?**
- A: Mac devcontainer (OrbStack) or Linux devcontainer/native

**Q: Where do SSH/git configs come from?**
- A: Chezmoi repo on Gitea NAS (auto-pulled into containers)

**Q: Do I need dotfiles in the devcontainer?**
- A: Yes—SSH to clone repos, git config for commits, bash aliases for dev work

**Q: What about sensitive data (real SSH IPs, keys)?**
- A: 
  - Never commit to public repos
  - Use chezmoi templates + encryption for private repos
  - Or use `.ssh/config.template` + manual copy on first setup

---

## Example Workflow

### Day 1: Mac Host Setup
```bash
# 1. Install tools
brew install orbstack devcontainer chezmoi ollama
brew services start ollama

# 2. Create dotfiles repo
mkdir -p ~/code/dotfiles && cd ~/code/dotfiles
chezmoi init . 
chezmoi add ~/.gitconfig ~/.bash_aliases
mkdir -p ~/.local/share/chezmoi/dot_ssh
cp ~/.ssh/config ~/.local/share/chezmoi/dot_ssh/config
# Edit and push to Gitea
cd ~/.local/share/chezmoi
git remote add origin ssh://git.example.com:2222/your-user/dotfiles.git
git push -u origin main

# 3. Update mycoder devcontainer.json
cd ~/code/mycoder
# Edit .devcontainer/devcontainer.json, set CHEZMOI_REPO

# 4. Open in devcontainer
# VS Code: Cmd+Shift+P → "Reopen in Container"
# Wait for setup-tools.sh to complete (30-60s)
```

### Day 2: Verify Everything
```bash
# Inside Mac devcontainer
chezmoi status
git config --global user.name
ssh -T git@github.com

# Back on Mac host
curl http://localhost:11434/api/tags  # Ollama working
```

### Bonus: Linux Mint
```bash
# On Mint
bash install/install-linux.sh
# Optional: chezmoi init --apply <repo>
# Ollama runs as systemd service
```

---

## Summary Table

| Item | Mac Host | Mac Container | Linux Mint |
|------|----------|---------------|-----------|
| **OrbStack/Docker** | ✅ Install | (auto) | N/A |
| **Ollama Server** | ✅ Install | N/A | ✅ Install |
| **Ollama CLI** | N/A | ✅ Auto | ✅ Auto |
| **chezmoi** | ✅ Install | ✅ Auto | ✅ Auto |
| **Dotfiles Repo** | ✅ Create | ✅ Auto-pull | ✅ Auto-pull |
| **Node.js/PM2/kodu** | N/A | ✅ Auto | ✅ Auto |
| **devcontainer CLI** | ✅ Install | N/A | ✅ Optional |

---

## Gitea on NAS (Synology + Cloudflare)

Source: https://gist.github.com/adamlwgriffiths/3d7c1f101d0b21757c162d01f1a1f251

**Containers (final working setup)**
- Postgres: `sameersbn/postgresql:latest` (bridge network)
  - Env: `DB_NAME=gitea`, `DB_USER=gitea_user`, `DB_PASS=<pass>`
  - Volume: `/docker/gitea/postgresql` → `/var/lib/postgresql`
  - Tip to avoid owner fix: use official `postgres:16-alpine` with `POSTGRES_DB/USER/PASSWORD` set to gitea values
- Gitea: `gitea/gitea:latest` (bridge network)
  - Ports (host→container): `3000:3000` (HTTP), `2222:22` (SSH)
  - Volume: `/docker/gitea/gitea` → `/data`
  - Env: `DB_TYPE=postgres`, `DB_HOST=db:5432`, `DB_NAME=gitea`, `DB_USER=gitea_user`, `DB_PASSWD=<pass>`, `HTTP_PORT=3000`, `SSH_PORT=22`, `LFS_START_SERVER` optional
  - Link: postgres container aliased as `db`

**Gotcha (fixed):** Gitea DB owned by `postgres` → migrations failed (`permission denied for schema public`). Fix run in Containermanager Postgres container new terminal:
```
psql -U postgres
ALTER DATABASE gitea OWNER TO gitea_user;
\q
```
Then restart Gitea container.

**Cloudflare Tunnel / DNS**
- DNS CNAMEs (proxied): `git.example.com`, `ssh.example.com`, etc. → tunnel UUID target
- Tunnel routes:
  - `git.example.com` → `http://192.168.x.x:3000` (origin is HTTP; using https here caused 502)
  - `ssh.example.com` → `ssh://192.168.x.x:2299` (your SSH service)
- Keep catch-all `http_status:404` as default route

**Initial Gitea form values**
- DB: type `PostgreSQL`, host `db:5432`, user `gitea_user`, db `gitea`, SSL disabled
- HTTP port `3000`, SSH port `22`, root URL set to `https://git.example.com/` (or LAN URL during first run)
- Leave LFS on defaults; can disable if unused

**Email (Gmail)**
- Generate Gmail app password (2FA required), then:
  - SMTP server `smtp.gmail.com`, port `587`
  - Username/From: your Gmail address
  - Password: the app password

**Clean re-create recipe (no manual ALTER):**
1) Use `postgres:16-alpine` with `POSTGRES_USER=gitea_user`, `POSTGRES_PASSWORD=<pass>`, `POSTGRES_DB=gitea` and an empty data volume
2) Start Gitea container with env/ports above and link `db`
3) No ownership fix needed; complete web wizard

## Files to Update/Create

### On Mac
1. Create private dotfiles repo → push to Gitea
2. Update `/workspaces/coder/.devcontainer/devcontainer.json` with CHEZMOI_REPO

### Already Done
- ✅ devcontainer Dockerfile
- ✅ devcontainer.json (mostly)
- ✅ setup-tools.sh
- ✅ install-linux.sh & install-macos.sh
- ✅ .devcontainer/README.md
