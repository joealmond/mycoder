#!/usr/bin/env node

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();
const config = require('../config.json');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${RESET}`);
}

async function checkCommand(command, name) {
  return new Promise((resolve) => {
    const proc = spawn('command', ['-v', command], { shell: true });
    proc.on('close', (code) => {
      if (code === 0) {
        log(GREEN, '✓', `${name} is installed`);
        resolve(true);
      } else {
        log(RED, '✗', `${name} is not installed`);
        resolve(false);
      }
    });
  });
}

async function checkOllama() {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  try {
    await axios.get(`${ollamaHost}/api/tags`, { timeout: 5000 });
    log(GREEN, '✓', `Ollama is running at ${ollamaHost}`);
    return true;
  } catch (error) {
    log(RED, '✗', `Ollama is not accessible at ${ollamaHost}`);
    log(YELLOW, 'ℹ', 'Make sure Ollama is running: brew services start ollama (macOS) or systemctl --user start ollama (Linux)');
    return false;
  }
}

async function checkGitea() {
  const giteaUrl = process.env.GITEA_URL || 'http://localhost:3000';
  try {
    await axios.get(`${giteaUrl}/api/v1/version`, { timeout: 5000 });
    log(GREEN, '✓', `Gitea is running at ${giteaUrl}`);
    return true;
  } catch (error) {
    log(YELLOW, '⚠', `Gitea is not accessible at ${giteaUrl}`);
    log(YELLOW, 'ℹ', 'Gitea will be started via podman-compose');
    return false;
  }
}

async function setupGitea() {
  log(BLUE, '→', 'Setting up Gitea...');
  
  const giteaUrl = process.env.GITEA_URL || 'http://localhost:3000';
  const adminUser = process.env.GITEA_ADMIN_USER || 'admin';
  const adminPassword = process.env.GITEA_ADMIN_PASSWORD || 'admin123';
  const adminEmail = process.env.GITEA_ADMIN_EMAIL || 'admin@localhost';
  const giteaOrg = process.env.GITEA_ORG || 'ticket-processor';
  
  try {
    // Wait for Gitea to be ready
    log(BLUE, '→', 'Waiting for Gitea to be ready...');
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        await axios.get(`${giteaUrl}/api/v1/version`, { timeout: 2000 });
        ready = true;
        break;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!ready) {
      log(RED, '✗', 'Gitea did not become ready in time');
      return false;
    }
    
    log(GREEN, '✓', 'Gitea is ready');
    
    // Check if admin user exists
    let token = process.env.GITEA_TOKEN;
    
    if (!token) {
      log(BLUE, '→', 'Creating admin user and generating token...');
      
      // Try to create admin user via API
      try {
        const createUserResponse = await axios.post(`${giteaUrl}/api/v1/admin/users`, {
          username: adminUser,
          email: adminEmail,
          password: adminPassword,
          must_change_password: false,
          send_notify: false
        }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true
        });
        
        if (createUserResponse.status === 201) {
          log(GREEN, '✓', `Created admin user: ${adminUser}`);
        } else if (createUserResponse.status === 422) {
          log(YELLOW, 'ℹ', 'Admin user already exists');
        }
      } catch (error) {
        log(YELLOW, '⚠', 'Could not create admin user via API (might need manual setup)');
      }
      
      // Generate access token
      try {
        // First, try to login and get a token
        const tokenResponse = await axios.post(`${giteaUrl}/api/v1/users/${adminUser}/tokens`, {
          name: 'ticket-processor-' + Date.now()
        }, {
          auth: {
            username: adminUser,
            password: adminPassword
          }
        });
        
        token = tokenResponse.data.sha1;
        log(GREEN, '✓', 'Generated access token');
        log(YELLOW, 'ℹ', `Add this to your .env file: GITEA_TOKEN=${token}`);
        
        // Update .env file
        try {
          const envPath = path.join(__dirname, '..', '.env');
          let envContent = '';
          
          try {
            envContent = await fs.readFile(envPath, 'utf-8');
          } catch (e) {
            // .env doesn't exist, create from example
            try {
              envContent = await fs.readFile(path.join(__dirname, '..', '.env.example'), 'utf-8');
            } catch (e2) {
              envContent = '';
            }
          }
          
          // Update or add GITEA_TOKEN
          if (envContent.includes('GITEA_TOKEN=')) {
            envContent = envContent.replace(/GITEA_TOKEN=.*/, `GITEA_TOKEN=${token}`);
          } else {
            envContent += `\nGITEA_TOKEN=${token}\n`;
          }
          
          await fs.writeFile(envPath, envContent);
          log(GREEN, '✓', 'Updated .env file with token');
          
          // Reload environment
          process.env.GITEA_TOKEN = token;
          
        } catch (error) {
          log(YELLOW, '⚠', 'Could not update .env file automatically');
        }
        
      } catch (error) {
        log(YELLOW, '⚠', 'Could not generate token automatically');
        log(YELLOW, 'ℹ', `Please log in to Gitea at ${giteaUrl} and create a token manually`);
        log(YELLOW, 'ℹ', `Username: ${adminUser}, Password: ${adminPassword}`);
        return false;
      }
    }
    
    // Create organization if it doesn't exist
    try {
      await axios.get(`${giteaUrl}/api/v1/orgs/${giteaOrg}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      log(GREEN, '✓', `Organization ${giteaOrg} exists`);
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          await axios.post(`${giteaUrl}/api/v1/orgs`, {
            username: giteaOrg,
            full_name: 'Ticket Processor',
            description: 'Automated ticket processing organization'
          }, {
            headers: {
              'Authorization': `token ${token}`,
              'Content-Type': 'application/json'
            }
          });
          log(GREEN, '✓', `Created organization: ${giteaOrg}`);
        } catch (createError) {
          log(RED, '✗', `Failed to create organization: ${createError.message}`);
        }
      }
    }
    
    // Create webhook
    if (config.webhook.enabled) {
      log(BLUE, '→', 'Webhook will be configured per-repository when tasks are processed');
    }
    
    return true;
    
  } catch (error) {
    log(RED, '✗', `Gitea setup failed: ${error.message}`);
    return false;
  }
}

async function startContainers() {
  log(BLUE, '→', 'Starting containers with podman-compose...');
  
  return new Promise((resolve) => {
    const proc = spawn('podman-compose', ['-f', 'containers/podman-compose.yml', 'up', '-d'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        log(GREEN, '✓', 'Containers started successfully');
        resolve(true);
      } else {
        log(RED, '✗', 'Failed to start containers');
        resolve(false);
      }
    });
  });
}

async function installDependencies() {
  log(BLUE, '→', 'Installing Node.js dependencies...');
  
  return new Promise((resolve) => {
    const proc = spawn('npm', ['install'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        log(GREEN, '✓', 'Dependencies installed');
        resolve(true);
      } else {
        log(RED, '✗', 'Failed to install dependencies');
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log(`${BLUE}========================================${RESET}`);
  console.log(`${BLUE}Ticket Processor - Startup Script${RESET}`);
  console.log(`${BLUE}========================================${RESET}\n`);
  
  // Check prerequisites
  log(BLUE, '→', 'Checking prerequisites...\n');
  
  const checks = await Promise.all([
    checkCommand('node', 'Node.js'),
    checkCommand('npm', 'npm'),
    checkCommand('git', 'git'),
    checkCommand('podman', 'Podman'),
    checkCommand('podman-compose', 'Podman Compose'),
    checkCommand('kodu', 'Kilo Code CLI (kodu)'),
    checkCommand('backlog', 'Backlog.md CLI'),
    checkOllama()
  ]);
  
  const allChecksPassed = checks.every(check => check);
  
  if (!allChecksPassed) {
    log(RED, '✗', '\nSome prerequisites are missing!');
    log(YELLOW, 'ℹ', 'Run the installation script for your platform:');
    log(YELLOW, 'ℹ', '  macOS: bash install/install-macos.sh');
    log(YELLOW, 'ℹ', '  Linux: bash install/install-linux.sh');
    process.exit(1);
  }
  
  console.log('');
  
  // Install dependencies
  if (!await installDependencies()) {
    process.exit(1);
  }
  
  console.log('');
  
  // Check if containers should be started
  const giteaRunning = await checkGitea();
  
  if (!giteaRunning) {
    if (!await startContainers()) {
      process.exit(1);
    }
    
    console.log('');
  }
  
  // Setup Gitea
  if (!await setupGitea()) {
    log(YELLOW, '⚠', 'Gitea setup incomplete, some features may not work');
    log(YELLOW, 'ℹ', 'You can complete the setup manually or restart this script');
  }
  
  console.log('');
  
  // Start watcher
  log(BLUE, '→', 'Starting ticket watcher...\n');
  log(GREEN, '✓', 'All systems ready!');
  log(BLUE, 'ℹ', `Watch folder: ${config.folders.todo}`);
  log(BLUE, 'ℹ', `Webhook server: http://localhost:${config.webhook.port}${config.webhook.path}`);
  log(BLUE, 'ℹ', `Default model: ${config.ollama.defaultModel}`);
  log(BLUE, 'ℹ', `Available models: ${config.ollama.availableModels.join(', ')}`);
  
  console.log(`\n${YELLOW}Press Ctrl+C to stop the watcher${RESET}\n`);
  
  // Start the watcher
  const watcher = spawn('node', ['scripts/watcher.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  watcher.on('close', (code) => {
    if (code !== 0) {
      log(RED, '✗', `Watcher exited with code ${code}`);
      process.exit(code);
    }
  });
}

main().catch(error => {
  log(RED, '✗', `Startup failed: ${error.message}`);
  process.exit(1);
});
