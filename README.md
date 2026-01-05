# Ticket Processor

Automated ticket processing system that uses **Kilo Code CLI (kodu)** with **Ollama** to process tasks from **Backlog.md** format, commits changes to **Gitea**, and manages workflow states through a file-based system.

## Features

- 🤖 **Automated Task Processing** - Drop markdown task files and let AI implement them
- 📝 **Backlog.md Integration** - Full support for Backlog.md task format with front matter
- 🔄 **Workflow Management** - Track tasks through todo → doing → review → completed states
- 🐙 **Gitea Integration** - Auto-create repositories, commits, and pull requests
- 🔗 **Bidirectional Webhooks** - Gitea PR merges trigger task completion
- 🎯 **Multiple Model Support** - Choose different Ollama models per task
- 📦 **Container-based** - Uses Podman for easy deployment
- 🔧 **Process Management** - PM2 (macOS) and systemd (Linux) support

## Architecture

```
┌─────────────┐
│   Backlog   │
│  todo/*.md  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   Watcher   │────▶│   Kilo Code  │
│  (Node.js)  │     │  (kodu CLI)  │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │   Ollama    │
       │            │   Models    │
       │            └─────────────┘
       ▼
┌─────────────┐     ┌──────────────┐
│    Gitea    │◀───▶│   Webhooks   │
│ (Git Repos) │     │   (Express)  │
└─────────────┘     └──────────────┘
```

## Quick Start

### Prerequisites

- **macOS**: Homebrew, Podman, Node.js 20+, Ollama
- **Linux**: apt/dnf, Podman, Node.js 20+, Ollama

### Installation

**macOS:**

```bash
bash install/install-macos.sh
```

**Linux:**

```bash
bash install/install-linux.sh
```

### Setup

1. Copy environment configuration:

  ```bash
  cp .env.example .env
  ```

2. Edit `.env` with your settings (optional, defaults work for local dev)

3. Review `config.json` and adjust models/settings as needed

4. Start the system:

  ```bash
  node scripts/start.js
  ```

Or use PM2 (recommended for development):

```bash
pm2 start ecosystem.config.js
pm2 logs
```

Or install as systemd service (Linux production):

```bash
bash scripts/install-service.sh
```

### Remote Dev Containers (VS Code)

- **Mac:** Use OrbStack (Docker API compatible). Open the repo in VS Code and **Reopen in Container**.
- **Linux:** Use Podman with `podman-docker` to provide `/var/run/docker.sock`, then reopen the folder in a dev container.
- **Windows:** Use Rancher Desktop (or Podman in WSL2) with the Docker socket enabled, then reopen in a dev container.

The dev container mounts the Docker socket and reaches Ollama on the host via `http://host.docker.internal:11434`.

## Usage

### Creating Tasks

**Option 1: Interactive CLI**

```bash
node scripts/create-task.js
```

**Option 2: From Template**

```bash
bash scripts/create-from-template.sh
```

**Option 3: Bulk Import**

```bash
node scripts/bulk-create.js tasks.json
```

**Option 4: Backlog.md CLI**

```bash
backlog task create "Task Title" -d "Description" --priority high
```

**Option 5: Manual File Creation**

Create a markdown file in `backlog/todo/` following the template format:

```markdown
---
title: Your Task Title
status: To Do
priority: high
model: ollama/deepseek-coder
description: |
  Task description here
acceptanceCriteria:
  - Criterion 1
  - Criterion 2
---

# Additional Details

Any additional context or notes...
```

### Workflow States

1. **todo/** - New tasks waiting to be processed
2. **doing/** - Currently being processed by kodu
3. **review/** - Successfully processed, PR created in Gitea
4. **failed/** - Processing failed (with error log)
5. **completed/** - PR merged, task finished

### Model Selection

Specify model in task front matter:

```yaml
model: ollama/deepseek-coder  # Default
# or
model: ollama/codellama
# or
model: ollama/mistral
```

Available models configured in `config.json`:
- `ollama/deepseek-coder` (default, best for code)
- `ollama/codellama` (alternative code model)
- `ollama/mistral` (general purpose)
- `ollama/llama2` (general purpose)

### Service Management

**macOS (PM2):**

```bash
pm2 start ecosystem.config.js      # Start
pm2 stop ticket-processor          # Stop
pm2 restart ticket-processor       # Restart
pm2 logs ticket-processor          # View logs
pm2 monit                          # Monitor
```

**Linux (systemd):**

```bash
systemctl --user start ticket-processor      # Start
systemctl --user stop ticket-processor       # Stop
systemctl --user restart ticket-processor    # Restart
systemctl --user status ticket-processor     # Status
journalctl --user -u ticket-processor -f     # Follow logs
```

**Cross-platform helper scripts:**

```bash
bash scripts/service-start.sh
bash scripts/service-stop.sh
bash scripts/service-restart.sh
bash scripts/service-status.sh
```

## Configuration

### config.json

Key configuration options:

```json
{
  "ollama": {
    "defaultModel": "ollama/deepseek-coder",
    "availableModels": [...],
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
  }
}
```

See `CONFIG.md` for full documentation.

### Environment Variables

See `.env.example` for all available options. Key variables:

- `OLLAMA_HOST` - Ollama API endpoint
- `GITEA_URL` - Gitea web URL
- `GITEA_TOKEN` - Authentication token (auto-generated)
- `GITEA_ORG` - Organization for repositories

## Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Detailed installation guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[CONFIG.md](CONFIG.md)** - Configuration reference
- **[USAGE.md](USAGE.md)** - Usage guide and examples
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

## Project Structure

```
.
├── backlog/                 # Task files
│   ├── todo/               # New tasks
│   ├── doing/              # Processing
│   ├── failed/             # Failed tasks
│   ├── review/             # Awaiting review
│   └── completed/          # Finished tasks
├── containers/             # Podman configuration
│   ├── Dockerfile
│   └── podman-compose.yml
├── install/                # Installation scripts
│   ├── install-macos.sh
│   └── install-linux.sh
├── repos/                  # Git repositories (per task)
├── scripts/                # Automation scripts
│   ├── watcher.js         # Main file watcher
│   ├── process-ticket.js  # Kodu integration
│   ├── git-manager.js     # Gitea operations
│   ├── start.js           # Startup orchestration
│   ├── create-task.js     # Interactive task creation
│   └── service-*.sh       # Service management
├── systemd/                # Systemd service files
├── config.json             # Main configuration
├── .env                    # Environment variables
└── ecosystem.config.js     # PM2 configuration
```

## Development

### Requirements

- Node.js 20+
- Podman / Podman Compose
- Ollama with models pulled
- Backlog.md CLI (`npm install -g backlog.md`)
- Kilo Code CLI (`npm install -g kodu`)

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
node scripts/start.js
```

Or use PM2 with auto-restart:

```bash
pm2 start ecosystem.config.js --watch
```

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md (if exists) for guidelines.

## Support

For issues and questions:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review logs in `logs/` directory
- Check service status with `bash scripts/service-status.sh`
