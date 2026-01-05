# Devcontainer Guide

## Quick Start
- VS Code: Command Palette → "Reopen in Container".
- CLI: `devcontainer up --workspace-folder .` then `devcontainer exec --workspace-folder . bash`.
- Host requirements: Docker/Podman socket at `/var/run/docker.sock`; Ollama available on host at `http://host.docker.internal:11434`; ports 3000/3001 exposed if needed.

## Dotfiles with chezmoi
This devcontainer uses **chezmoi** for dotfile management, which supports encrypted sensitive data (SSH keys, configs, etc.).

### Setup chezmoi Repo
1. Create a private dotfiles repo on Gitea (your NAS) or GitHub:
   ```bash
   chezmoi init
   chezmoi add ~/.gitconfig ~/.bash_aliases
   cd ~/.local/share/chezmoi
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Include `.gitconfig` so git commits work automatically in containers
3. Add `.ssh/config` if needed (use templates for IPs)

### Configure devcontainer
- Update `devcontainer.json` variable `CHEZMOI_REPO` with your repo URL (Gitea or GitHub)
- On container creation, `setup-tools.sh` will:
  1. Install chezmoi
  2. Clone your dotfiles repo
  3. Apply configs (git user, SSH, aliases)
  4. Install project dependencies

### Update Dotfiles Later
```bash
# On host, add new config
chezmoi add ~/.gitconfig
cd ~/.local/share/chezmoi && git push

# In container, pull updates
chezmoi update
```

### Encryption (Private Repos)
If using a private Gitea repo, ensure:
- SSH key access configured or use HTTPS with PAT
- chezmoi auto-decrypts on apply if keys are configured

See [chezmoi docs](https://www.chezmoi.io/) for advanced encryption and templating.

## Reuse / Template
- To move this devcontainer to another project: copy `.devcontainer/` into that repo.
- To publish as a template image: build and push the Dockerfile, then replace `"dockerFile"` with `"image": "ghcr.io/you/ticket-processor-dev:latest"` in `devcontainer.json`.
- Add a minimal README in the target project describing host expectations and how to start (`devcontainer up` or VS Code).

## Compose Option (if you add services)
- Create a `docker-compose.dev.yml` with your services.
- In `devcontainer.json`, set `"dockerComposeFile": "docker-compose.dev.yml"` and `"service": "dev"` (or the service name).
- The devcontainer CLI/VS Code will start the compose stack and attach to the chosen service.

## Typical Commands
- Start/build: `devcontainer up --workspace-folder .`
- Open shell: `devcontainer exec --workspace-folder . bash`
- Rebuild after edits: `devcontainer build --workspace-folder .`

## Tool Auto-Installation
- `setup-tools.sh` checks and installs required tools on container creation:
  - Ollama CLI (client for host server)
  - PM2 (process manager)
  - Backlog.md CLI
  - Kilo Code CLI (kodu)
  - Project npm dependencies
- Runs via `postCreateCommand`; idempotent (safe to run multiple times).
- To add more tools, edit `.devcontainer/setup-tools.sh`.

## Notes
- `postCreateCommand` runs inside the container after build; keep it idempotent.
- NPM cache is persisted via the named volume `ticket-processor-npm-cache`.
- Host Docker/Podman socket is mounted; ensure your user can access it on the host.
