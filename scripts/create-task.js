#!/usr/bin/env node

const readline = require('readline');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const config = require('../config.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('=================================');
  console.log('Create New Task');
  console.log('=================================\n');
  
  const title = await question('Task title: ');
  if (!title) {
    console.log('Title is required!');
    process.exit(1);
  }
  
  const description = await question('Description: ');
  const priority = await question('Priority (low/medium/high): ') || 'medium';
  const labels = await question('Labels (comma-separated): ');
  const model = await question(`Model (default: ${config.ollama.defaultModel}): `) || config.ollama.defaultModel;
  const estimatedHours = await question('Estimated hours: ');
  
  console.log('\nAcceptance Criteria (enter each criterion, empty line to finish):');
  const acceptanceCriteria = [];
  let criterion;
  let index = 1;
  while ((criterion = await question(`  ${index}. `))) {
    acceptanceCriteria.push(criterion);
    index++;
  }
  
  rl.close();
  
  // Create task using backlog CLI
  console.log('\nCreating task via Backlog.md CLI...');
  
  const labelArgs = labels ? labels.split(',').map(l => l.trim()).flatMap(l => ['-l', l]) : [];
  const args = [
    'backlog',
    'task',
    'create',
    title,
    '-d', description || '',
    '-s', 'To Do',
    '--priority', priority,
    ...labelArgs
  ];
  
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    proc.on('close', async (code) => {
      if (code === 0) {
        console.log('\n✓ Task created successfully!');
        
        // Try to find the created task file and update it with additional metadata
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
            
            // Add custom fields to front matter
            if (model && model !== config.ollama.defaultModel) {
              content = content.replace('---\n', `---\nmodel: ${model}\n`);
            }
            
            if (acceptanceCriteria.length > 0) {
              const acYaml = 'acceptanceCriteria:\n  - ' + acceptanceCriteria.join('\n  - ');
              content = content.replace('---\n', `---\n${acYaml}\n`);
            }
            
            if (estimatedHours) {
              content = content.replace('---\n', `---\nestimatedHours: ${estimatedHours}\n`);
            }
            
            await fs.writeFile(taskPath, content);
            console.log(`\nTask file: ${latestTask}`);
            
            // Ask if user wants to move to todo folder for processing
            const shouldMove = await question('\nMove to todo folder for processing? (y/N): ');
            if (shouldMove.toLowerCase() === 'y') {
              const todoPath = path.join(config.folders.todo, latestTask);
              await fs.rename(taskPath, todoPath);
              console.log(`\n✓ Task moved to ${config.folders.todo} and will be processed automatically`);
            }
          }
          
        } catch (error) {
          console.error('Could not update task file:', error.message);
        }
        
        resolve();
      } else {
        console.error('\n✗ Failed to create task');
        reject(new Error(`Backlog CLI exited with code ${code}`));
      }
    });
  });
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
