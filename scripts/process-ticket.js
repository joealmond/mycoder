#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Load configuration
const config = require('../config.json');

/**
 * Process a ticket using Kilo Code CLI
 * @param {string} filePath - Path to the ticket markdown file
 * @param {object} frontMatter - Parsed front matter from the ticket
 * @param {string} body - Body content of the ticket
 * @param {string} taskId - Extracted task ID
 * @returns {Promise<object>} - Processing result with success status
 */
async function processTicket(filePath, frontMatter, body, taskId) {
  return new Promise((resolve) => {
    try {
      // Determine which model to use (per-task or default)
      const model = frontMatter.model || config.ollama.defaultModel;
      
      // Construct the prompt for kodu
      const prompt = buildPrompt(frontMatter, body);
      
      console.log(`[INFO] Processing task-${taskId} with model: ${model}`);
      console.log(`[INFO] Prompt length: ${prompt.length} characters`);
      
      // Spawn kodu process
      const koduArgs = [
        'kodu',
        '--message', prompt,
        '--auto-approve',
        '--model', model
      ];
      
      console.log(`[INFO] Executing: npx ${koduArgs.join(' ')}`);
      
      const koduProcess = spawn('npx', koduArgs, {
        cwd: path.dirname(filePath),
        env: {
          ...process.env,
          OLLAMA_API_BASE: process.env.OLLAMA_HOST || 'http://host.containers.internal:11434'
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      koduProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        // Stream output in real-time
        process.stdout.write(chunk);
      });
      
      koduProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        process.stderr.write(chunk);
      });
      
      koduProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[SUCCESS] Task-${taskId} processed successfully`);
          resolve({
            success: true,
            exitCode: code,
            stdout,
            stderr,
            model,
            taskId
          });
        } else {
          console.error(`[ERROR] Task-${taskId} failed with exit code ${code}`);
          resolve({
            success: false,
            exitCode: code,
            stdout,
            stderr,
            error: `Kodu exited with code ${code}`,
            model,
            taskId
          });
        }
      });
      
      koduProcess.on('error', (error) => {
        console.error(`[ERROR] Failed to spawn kodu process:`, error.message);
        resolve({
          success: false,
          error: error.message,
          stderr: error.stack,
          model,
          taskId
        });
      });
      
      // Set timeout for long-running processes
      const timeout = setTimeout(() => {
        console.error(`[ERROR] Task-${taskId} timed out after ${config.ollama.timeout}ms`);
        koduProcess.kill('SIGTERM');
        
        resolve({
          success: false,
          error: `Process timed out after ${config.ollama.timeout}ms`,
          stderr: 'Process killed due to timeout',
          model,
          taskId
        });
      }, config.ollama.timeout);
      
      koduProcess.on('close', () => {
        clearTimeout(timeout);
      });
      
    } catch (error) {
      console.error(`[ERROR] Exception in processTicket:`, error.message);
      resolve({
        success: false,
        error: error.message,
        stderr: error.stack,
        taskId
      });
    }
  });
}

/**
 * Build a comprehensive prompt for kodu from the task details
 * @param {object} frontMatter - Task metadata
 * @param {string} body - Task body content
 * @returns {string} - Formatted prompt
 */
function buildPrompt(frontMatter, body) {
  let prompt = `# ${frontMatter.title || 'Task'}\n\n`;
  
  if (frontMatter.description) {
    prompt += `## Description\n${frontMatter.description}\n\n`;
  }
  
  if (frontMatter.acceptanceCriteria && Array.isArray(frontMatter.acceptanceCriteria)) {
    prompt += `## Acceptance Criteria\n`;
    frontMatter.acceptanceCriteria.forEach((criterion, index) => {
      prompt += `${index + 1}. ${criterion}\n`;
    });
    prompt += '\n';
  }
  
  if (frontMatter.dependencies && Array.isArray(frontMatter.dependencies) && frontMatter.dependencies.length > 0) {
    prompt += `## Dependencies\n`;
    prompt += `This task depends on: ${frontMatter.dependencies.join(', ')}\n\n`;
  }
  
  if (frontMatter.labels && Array.isArray(frontMatter.labels)) {
    prompt += `## Labels\n${frontMatter.labels.join(', ')}\n\n`;
  }
  
  if (frontMatter.priority) {
    prompt += `## Priority\n${frontMatter.priority}\n\n`;
  }
  
  if (frontMatter.estimatedHours) {
    prompt += `## Estimated Time\n${frontMatter.estimatedHours} hours\n\n`;
  }
  
  if (body && body.trim()) {
    prompt += `## Additional Details\n${body}\n\n`;
  }
  
  prompt += `## Instructions\n`;
  prompt += `Please implement this task according to the description and acceptance criteria above. `;
  prompt += `Make sure all acceptance criteria are met. `;
  prompt += `Write clean, well-documented, and tested code. `;
  prompt += `Follow best practices and coding standards.\n`;
  
  return prompt;
}

module.exports = processTicket;
