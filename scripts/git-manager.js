#!/usr/bin/env node

const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Load configuration
const config = require('../config.json');
require('dotenv').config();

/**
 * Process git repository for a task
 * @param {string} taskId - Task ID
 * @param {object} frontMatter - Task metadata
 * @param {object} result - Processing result from kodu
 */
async function processTaskRepo(taskId, frontMatter, result) {
  const repoPath = path.join(config.folders.repos, `task-${taskId}`);
  
  try {
    console.log(`[INFO] Setting up git repository for task-${taskId}`);
    
    // Create repo directory if it doesn't exist
    await fs.mkdir(repoPath, { recursive: true });
    
    // Initialize git repo
    const git = simpleGit(repoPath);
    
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      console.log(`[INFO] Initialized git repository at ${repoPath}`);
    }
    
    // Configure git user (from env or defaults)
    await git.addConfig('user.name', process.env.GIT_USER_NAME || 'Ticket Processor');
    await git.addConfig('user.email', process.env.GIT_USER_EMAIL || 'processor@localhost');
    
    // Create a work log file
    const workLogPath = path.join(repoPath, 'WORK_LOG.md');
    const workLog = `# Task ${taskId}: ${frontMatter.title}\n\n` +
      `## Processing Details\n` +
      `- **Model**: ${result.model}\n` +
      `- **Processed**: ${new Date().toISOString()}\n` +
      `- **Status**: ${result.success ? 'Success' : 'Failed'}\n\n` +
      `## Description\n${frontMatter.description || 'N/A'}\n\n` +
      `## Acceptance Criteria\n` +
      (frontMatter.acceptanceCriteria ? frontMatter.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'N/A') +
      `\n\n## Output\n\`\`\`\n${result.stdout || 'No output'}\n\`\`\`\n`;
    
    await fs.writeFile(workLogPath, workLog);
    
    // Stage all changes
    await git.add('.');
    
    // Create commit message
    const commitMessage = config.git.commitMessageFormat
      .replace('{id}', taskId)
      .replace('{title}', frontMatter.title || 'Untitled Task');
    
    await git.commit(commitMessage);
    console.log(`[INFO] Created commit: ${commitMessage}`);
    
    // Setup remote if not exists
    const giteaUrl = process.env.GITEA_URL || 'http://localhost:3000';
    const giteaToken = process.env.GITEA_TOKEN;
    const giteaOrg = process.env.GITEA_ORG || 'ticket-processor';
    
    if (!giteaToken) {
      console.warn('[WARN] GITEA_TOKEN not set, skipping push to remote');
      return;
    }
    
    // Create repository in Gitea if it doesn't exist
    const repoName = `task-${taskId}`;
    await createGiteaRepo(repoName, frontMatter.title);
    
    // Add remote
    const remotes = await git.getRemotes();
    const remoteUrl = `${giteaUrl}/${giteaOrg}/${repoName}.git`;
    
    if (!remotes.find(r => r.name === 'origin')) {
      // Inject token into URL for authentication
      const authenticatedUrl = remoteUrl.replace('://', `://${giteaToken}@`);
      await git.addRemote('origin', authenticatedUrl);
      console.log(`[INFO] Added remote: ${remoteUrl}`);
    }
    
    // Push to remote with retry
    const branchName = config.git.branchNameFormat.replace('{id}', taskId);
    await pushWithRetry(git, branchName);
    
    // Create pull request if configured
    if (config.git.createPR) {
      await createPullRequest(repoName, branchName, taskId, frontMatter, result);
    }
    
  } catch (error) {
    console.error(`[ERROR] Git operations failed for task-${taskId}:`, error.message);
    throw error;
  }
}

/**
 * Create a repository in Gitea
 * @param {string} repoName - Repository name
 * @param {string} description - Repository description
 */
async function createGiteaRepo(repoName, description) {
  const giteaUrl = process.env.GITEA_URL || 'http://localhost:3000';
  const giteaToken = process.env.GITEA_TOKEN;
  const giteaOrg = process.env.GITEA_ORG || 'ticket-processor';
  
  if (!giteaToken) {
    console.warn('[WARN] Cannot create repo: GITEA_TOKEN not set');
    return;
  }
  
  try {
    // Check if repo exists
    const checkUrl = `${giteaUrl}/api/v1/repos/${giteaOrg}/${repoName}`;
    try {
      await axios.get(checkUrl, {
        headers: { 'Authorization': `token ${giteaToken}` }
      });
      console.log(`[INFO] Repository ${repoName} already exists`);
      return;
    } catch (err) {
      if (err.response?.status !== 404) {
        throw err;
      }
      // Repo doesn't exist, create it
    }
    
    // Create repository
    const createUrl = `${giteaUrl}/api/v1/orgs/${giteaOrg}/repos`;
    await axios.post(createUrl, {
      name: repoName,
      description: description || `Task: ${repoName}`,
      private: false,
      auto_init: false
    }, {
      headers: { 
        'Authorization': `token ${giteaToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[INFO] Created repository: ${repoName}`);
    
  } catch (error) {
    console.error(`[ERROR] Failed to create Gitea repository:`, error.message);
    if (error.response) {
      console.error('[ERROR] Response:', error.response.data);
    }
  }
}

/**
 * Push to remote with exponential backoff retry
 * @param {object} git - simple-git instance
 * @param {string} branch - Branch name
 */
async function pushWithRetry(git, branch) {
  const maxRetries = config.git.pushRetries || 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      await git.push('origin', branch, ['--set-upstream']);
      console.log(`[INFO] Pushed to origin/${branch}`);
      return;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(`Failed to push after ${maxRetries} attempts: ${error.message}`);
      }
      
      const delay = config.git.pushRetryDelay * Math.pow(2, attempt - 1);
      console.warn(`[WARN] Push failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Create a pull request in Gitea
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} taskId - Task ID
 * @param {object} frontMatter - Task metadata
 * @param {object} result - Processing result
 */
async function createPullRequest(repoName, branch, taskId, frontMatter, result) {
  const giteaUrl = process.env.GITEA_URL || 'http://localhost:3000';
  const giteaToken = process.env.GITEA_TOKEN;
  const giteaOrg = process.env.GITEA_ORG || 'ticket-processor';
  
  if (!giteaToken) {
    console.warn('[WARN] Cannot create PR: GITEA_TOKEN not set');
    return;
  }
  
  try {
    const prTitle = config.git.prTitle
      .replace('{id}', taskId)
      .replace('{title}', frontMatter.title || 'Untitled');
    
    const acceptanceCriteria = frontMatter.acceptanceCriteria 
      ? frontMatter.acceptanceCriteria.map((c, i) => `- [ ] ${c}`).join('\n')
      : 'N/A';
    
    const prBody = config.git.prBody
      .replace('{description}', frontMatter.description || 'N/A')
      .replace('{acceptanceCriteria}', acceptanceCriteria)
      .replace('{model}', result.model);
    
    const createUrl = `${giteaUrl}/api/v1/repos/${giteaOrg}/${repoName}/pulls`;
    const response = await axios.post(createUrl, {
      title: prTitle,
      body: prBody,
      head: branch,
      base: 'main'
    }, {
      headers: {
        'Authorization': `token ${giteaToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[INFO] Created pull request #${response.data.number}: ${prTitle}`);
    
    // Auto-merge if configured and no errors
    if (config.webhook.autoMergePR && result.success) {
      const prNumber = response.data.number;
      const mergeUrl = `${giteaUrl}/api/v1/repos/${giteaOrg}/${repoName}/pulls/${prNumber}/merge`;
      
      // Wait a bit to ensure CI checks run (if any)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await axios.post(mergeUrl, {
          Do: 'merge',
          MergeMessageField: `Automatically merged task-${taskId}`,
          delete_branch_after_merge: false
        }, {
          headers: {
            'Authorization': `token ${giteaToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`[SUCCESS] Auto-merged PR #${prNumber}`);
      } catch (mergeError) {
        console.warn(`[WARN] Failed to auto-merge PR #${prNumber}:`, mergeError.response?.data?.message || mergeError.message);
      }
    }
    
  } catch (error) {
    console.error(`[ERROR] Failed to create pull request:`, error.message);
    if (error.response) {
      console.error('[ERROR] Response:', error.response.data);
    }
  }
}

module.exports = {
  processTaskRepo,
  createGiteaRepo,
  createPullRequest
};
