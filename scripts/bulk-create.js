#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const config = require('../config.json');

/**
 * Bulk create tasks from a JSON array
 * Usage: node bulk-create.js tasks.json
 * 
 * JSON format:
 * [
 *   {
 *     "title": "Task title",
 *     "description": "Task description",
 *     "priority": "high",
 *     "labels": ["backend", "api"],
 *     "model": "ollama/deepseek-coder",
 *     "acceptanceCriteria": ["AC 1", "AC 2"],
 *     "estimatedHours": 4
 *   }
 * ]
 */

async function createTask(task) {
  return new Promise((resolve, reject) => {
    const args = [
      'backlog',
      'task',
      'create',
      task.title,
      '-d', task.description || '',
      '-s', 'To Do',
      '--priority', task.priority || 'medium'
    ];
    
    if (task.labels && Array.isArray(task.labels)) {
      task.labels.forEach(label => {
        args.push('-l', label);
      });
    }
    
    console.log(`Creating task: ${task.title}`);
    
    const proc = spawn('npx', args, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', async (code) => {
      if (code === 0) {
        console.log(`  ✓ Created: ${task.title}`);
        
        // Update task file with additional metadata
        try {
          const backlogDir = path.join(__dirname, '..', 'backlog');
          const files = await fs.readdir(backlogDir);
          const taskFiles = files
            .filter(f => f.startsWith('task-') && f.endsWith('.md'))
            .sort((a, b) => {
              const aNum = parseInt(a.match(/task-(\d+)/)?.[1] || '0');
              const bNum = parseInt(b.match(/task-(\d+)/)?.[1] || '0');
              return bNum - aNum;
            });
          
          if (taskFiles.length > 0) {
            const latestTask = taskFiles[0];
            const taskPath = path.join(backlogDir, latestTask);
            let content = await fs.readFile(taskPath, 'utf-8');
            
            // Add model
            if (task.model && task.model !== config.ollama.defaultModel) {
              content = content.replace('---\n', `---\nmodel: ${task.model}\n`);
            }
            
            // Add acceptance criteria
            if (task.acceptanceCriteria && Array.isArray(task.acceptanceCriteria)) {
              const acYaml = 'acceptanceCriteria:\n  - ' + task.acceptanceCriteria.join('\n  - ');
              content = content.replace('---\n', `---\n${acYaml}\n`);
            }
            
            // Add estimated hours
            if (task.estimatedHours) {
              content = content.replace('---\n', `---\nestimatedHours: ${task.estimatedHours}\n`);
            }
            
            await fs.writeFile(taskPath, content);
            
            // Move to todo if specified
            if (task.autoProcess) {
              const todoPath = path.join(config.folders.todo, latestTask);
              await fs.rename(taskPath, todoPath);
              console.log(`  → Moved to ${config.folders.todo} for processing`);
            }
          }
          
          resolve();
        } catch (error) {
          console.error(`  ✗ Error updating task: ${error.message}`);
          resolve(); // Continue with other tasks
        }
      } else {
        console.error(`  ✗ Failed to create: ${task.title}`);
        reject(new Error(`Backlog CLI exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node bulk-create.js <tasks.json>');
    console.log('\nExample JSON format:');
    console.log(JSON.stringify([
      {
        title: "Implement user authentication",
        description: "Add OAuth 2.0 authentication",
        priority: "high",
        labels: ["backend", "security"],
        model: "ollama/deepseek-coder",
        acceptanceCriteria: [
          "Users can log in with Google",
          "Users can log in with GitHub",
          "Session management works correctly"
        ],
        estimatedHours: 8,
        autoProcess: false
      }
    ], null, 2));
    process.exit(1);
  }
  
  const jsonFile = args[0];
  
  try {
    console.log(`Reading tasks from: ${jsonFile}\n`);
    const content = await fs.readFile(jsonFile, 'utf-8');
    const tasks = JSON.parse(content);
    
    if (!Array.isArray(tasks)) {
      console.error('Error: JSON file must contain an array of tasks');
      process.exit(1);
    }
    
    console.log(`Found ${tasks.length} task(s) to create\n`);
    
    for (const task of tasks) {
      try {
        await createTask(task);
        // Small delay between tasks
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error creating task: ${error.message}`);
      }
    }
    
    console.log(`\n✓ Bulk creation complete!`);
    console.log(`Created ${tasks.length} task(s)`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
