# Configuration Reference

Complete reference for all configuration options in the Ticket Processor system.

## Configuration Files

- **`config.json`** - Main application configuration
- **`.env`** - Environment variables (secrets, URLs)
- **`ecosystem.config.js`** - PM2 process manager configuration
- **`systemd/ticket-processor.service`** - Linux systemd service configuration

---

## config.json

Main configuration file for the application.

### Ollama Configuration

```json
{
  "ollama": {
    "defaultModel": "ollama/deepseek-coder",
    "availableModels": [
      "ollama/deepseek-coder",
      "ollama/codellama",
      "ollama/mistral",
      "ollama/llama2"
    ],
    "timeout": 300000,
    "retryAttempts": 3,
    "retryDelay": 5000
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultModel` | string | `ollama/deepseek-coder` | Default model when not specified in task |
| `availableModels` | array | [...] | List of models available for selection |
| `timeout` | number | 300000 | Maximum time (ms) for kodu processing |
| `retryAttempts` | number | 3 | Number of retries on connection failures |
| `retryDelay` | number | 5000 | Delay (ms) between retry attempts |

**Model Selection:**
- Per-task override via `model` field in task front matter
- Falls back to `defaultModel` if not specified
- Must be installed in Ollama (`ollama pull <model>`)

### Processing Configuration

```json
{
  "processing": {
    "concurrency": 1,
    "watchDebounce": 1000,
    "moveDelay": 500
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | number | 1 | Number of tasks to process simultaneously |
| `watchDebounce` | number | 1000 | Wait time (ms) for file system stability |
| `moveDelay` | number | 500 | Delay (ms) before moving file after detection |

**Notes:**
- `concurrency: 1` recommended to avoid resource conflicts
- Increase `watchDebounce` for slow file systems
- `moveDelay` prevents processing incomplete files

### Folder Configuration

```json
{
  "folders": {
    "todo": "backlog/todo",
    "doing": "backlog/doing",
    "failed": "backlog/failed",
    "review": "backlog/review",
    "completed": "backlog/completed",
    "repos": "repos"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `todo` | string | `backlog/todo` | New tasks awaiting processing |
| `doing` | string | `backlog/doing` | Currently processing |
| `failed` | string | `backlog/failed` | Failed tasks with error logs |
| `review` | string | `backlog/review` | Processed, awaiting PR merge |
| `completed` | string | `backlog/completed` | Finished tasks |
| `repos` | string | `repos` | Git repositories root directory |

**Path Resolution:**
- Relative to project root
- Automatically created on startup
- Can be absolute paths if needed

### Webhook Configuration

```json
{
  "webhook": {
    "enabled": true,
    "port": 3001,
    "path": "/webhook",
    "autoMergePR": true
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable webhook server |
| `port` | number | 3001 | HTTP port for webhook server |
| `path` | string | `/webhook` | Webhook endpoint path |
| `autoMergePR` | boolean | true | Auto-merge successful PRs |

**Webhook Flow:**
1. Gitea sends webhook on PR events
2. Server validates signature (GITEA_WEBHOOK_SECRET)
3. On PR merge → moves task from review to completed
4. Auto-merge only if no CI errors

**Security:**
- Set `GITEA_WEBHOOK_SECRET` in `.env`
- Webhook validates HMAC signature
- Only accepts events from configured Gitea instance

### Git Configuration

```json
{
  "git": {
    "commitMessageFormat": "feat(task-{id}): {title}",
    "branchNameFormat": "task-{id}",
    "createPR": true,
    "prTitle": "[Task {id}] {title}",
    "prBody": "{description}\n\n## Acceptance Criteria\n{acceptanceCriteria}\n\n---\nProcessed by Kilo Code CLI with model: {model}",
    "pushRetries": 3,
    "pushRetryDelay": 2000
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `commitMessageFormat` | string | `feat(task-{id}): {title}` | Commit message template |
| `branchNameFormat` | string | `task-{id}` | Branch name template |
| `createPR` | boolean | true | Auto-create pull requests |
| `prTitle` | string | `[Task {id}] {title}` | PR title template |
| `prBody` | string | ... | PR description template |
| `pushRetries` | number | 3 | Number of push retry attempts |
| `pushRetryDelay` | number | 2000 | Delay (ms) between retries |

**Template Variables:**
- `{id}` - Task ID number
- `{title}` - Task title
- `{description}` - Task description
- `{acceptanceCriteria}` - Formatted AC list
- `{model}` - Model used for processing

**Commit Message Formats:**
- `feat(task-{id}): {title}` - Conventional commits
- `Task-{id}: {title}` - Simple format
- `[{id}] {title}` - Bracket format

### Logging Configuration

```json
{
  "logging": {
    "level": "info",
    "includeTimestamp": true,
    "colorize": true
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | string | `info` | Minimum log level (debug/info/warning/error) |
| `includeTimestamp` | boolean | true | Include ISO timestamp in logs |
| `colorize` | boolean | true | Colorize console output |

**Log Levels:**
- `debug` - Verbose debugging information
- `info` - General informational messages
- `warning` - Warning messages
- `error` - Error messages only

### Task ID Format

```json
{
  "taskIdFormat": {
    "pattern": "task-{id}",
    "extractRegex": "task-(\\d+)"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pattern` | string | `task-{id}` | Task ID formatting pattern |
| `extractRegex` | string | `task-(\\d+)` | Regex to extract ID from filename |

**Notes:**
- Must match Backlog.md naming convention
- Regex should capture ID in first group
- Pattern used for repo/branch names

---

## Environment Variables (.env)

Sensitive configuration stored in `.env` file (never commit this!).

### Ollama Configuration

```bash
# Ollama API endpoint
OLLAMA_HOST=http://host.containers.internal:11434
```

**Platform-specific defaults:**
- **macOS**: `http://host.containers.internal:11434`
- **Linux**: `http://172.17.0.1:11434` or `http://host.containers.internal:11434`

### Gitea Configuration

```bash
# Gitea URL
GITEA_URL=http://localhost:3000

# Authentication token (auto-generated by start.js)
GITEA_TOKEN=

# Webhook secret for signature validation
GITEA_WEBHOOK_SECRET=webhook-secret-change-me

# Secret key for Gitea installation
GITEA_SECRET_KEY=changeme-secret-key-please

# Admin user credentials (first-time setup)
GITEA_ADMIN_USER=admin
GITEA_ADMIN_PASSWORD=admin123
GITEA_ADMIN_EMAIL=admin@localhost

# Organization for repositories
GITEA_ORG=ticket-processor
```

**Security Best Practices:**
- Change `GITEA_WEBHOOK_SECRET` to random string
- Change `GITEA_SECRET_KEY` to random string (min 32 chars)
- Change `GITEA_ADMIN_PASSWORD` immediately after setup
- Keep `GITEA_TOKEN` secure (regenerate if exposed)

### Git Configuration

```bash
# Git user for commits
GIT_USER_NAME=Ticket Processor
GIT_USER_EMAIL=processor@localhost
```

**Notes:**
- Used for automated commits
- Can be overridden per-repository
- Should match git global config

### Node Environment

```bash
# Environment mode
NODE_ENV=production
```

**Options:**
- `development` - Development mode (verbose logging)
- `production` - Production mode (optimized)
- `test` - Testing mode

---

## PM2 Configuration (ecosystem.config.js)

Process manager configuration for macOS development.

```javascript
module.exports = {
  apps: [{
    name: 'ticket-processor',
    script: './scripts/watcher.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    kill_timeout: 5000
  }]
};
```

**Key Options:**
- `instances: 1` - Single instance (no clustering)
- `autorestart: true` - Auto-restart on crashes
- `watch: false` - Don't watch files (manual restart only)
- `max_memory_restart` - Restart if memory exceeds limit

**PM2 Commands:**
```bash
pm2 start ecosystem.config.js
pm2 stop ticket-processor
pm2 restart ticket-processor
pm2 logs ticket-processor
pm2 monit
```

---

## Systemd Configuration

Service configuration for Linux production.

**File:** `systemd/ticket-processor.service`

```ini
[Unit]
Description=Ticket Processor
After=network-online.target

[Service]
Type=simple
User=%i
WorkingDirectory=/home/%i/ticket-processor
EnvironmentFile=/home/%i/ticket-processor/.env
ExecStart=/usr/bin/node /home/%i/ticket-processor/scripts/watcher.js
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

**Key Options:**
- `Type=simple` - Foreground process
- `Restart=always` - Auto-restart on failures
- `RestartSec=10` - Wait 10s before restart
- `EnvironmentFile` - Load `.env` variables

**Installation:**
```bash
bash scripts/install-service.sh
```

**Management:**
```bash
systemctl --user start ticket-processor
systemctl --user stop ticket-processor
systemctl --user restart ticket-processor
systemctl --user status ticket-processor
journalctl --user -u ticket-processor -f
```

---

## Advanced Configuration

### Custom Model Configuration

Add custom Ollama models:

1. **Pull the model:**
   ```bash
   ollama pull your-custom-model
   ```

2. **Add to `config.json`:**
   ```json
   {
     "ollama": {
       "availableModels": [
         "ollama/deepseek-coder",
         "ollama/your-custom-model"
       ]
     }
   }
   ```

3. **Use in task:**
   ```yaml
   model: ollama/your-custom-model
   ```

### Multiple Ollama Instances

To use multiple Ollama instances:

1. **Set per-task host** (requires code modification):
   ```yaml
   ollamaHost: http://another-server:11434
   ```

2. **Or use load balancer** pointing to multiple Ollama instances

### Health Check Documentation

**Note:** Health check endpoint is documented for future implementation. Currently not required but can be added for monitoring.

**Proposed endpoint:** `GET http://localhost:3001/health`

**Response:**
```json
{
  "status": "ok",
  "queueSize": 0,
  "queuePending": 1,
  "processing": ["task-5.md"]
}
```

### Log Rotation

**PM2 (macOS):**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Systemd (Linux):**
Handled automatically by journald. Configure retention:
```bash
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=100M
```

**Manual logrotate** (alternative):
```bash
/var/log/ticket-processor/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## Configuration Examples

### High-Throughput Setup

```json
{
  "processing": {
    "concurrency": 3,
    "watchDebounce": 500
  },
  "ollama": {
    "timeout": 600000
  }
}
```

### Minimal Resource Setup

```json
{
  "processing": {
    "concurrency": 1,
    "watchDebounce": 2000
  },
  "ollama": {
    "timeout": 180000,
    "defaultModel": "ollama/mistral"
  }
}
```

### Secure Production Setup

```bash
# .env
GITEA_WEBHOOK_SECRET=$(openssl rand -hex 32)
GITEA_SECRET_KEY=$(openssl rand -hex 32)
GITEA_ADMIN_PASSWORD=$(openssl rand -base64 16)
```

---

## Troubleshooting Configuration

### Invalid JSON

```bash
# Validate config.json
node -e "console.log(JSON.parse(require('fs').readFileSync('config.json')))"
```

### Missing Environment Variables

```bash
# Check loaded environment
node -e "require('dotenv').config(); console.log(process.env)"
```

### Port Conflicts

```bash
# Check if port 3001 is in use
lsof -i :3001

# Change webhook port in config.json
"webhook": { "port": 3002 }
```

---

## See Also

- [INSTALLATION.md](INSTALLATION.md) - Installation guide
- [USAGE.md](USAGE.md) - Usage examples
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
