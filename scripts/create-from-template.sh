#!/bin/bash

# Script to create a task from template
# Usage: ./create-from-template.sh

TEMPLATE_FILE="backlog/task-template.md"
TODO_DIR="backlog/todo"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found at $TEMPLATE_FILE"
    exit 1
fi

# Get next task ID
NEXT_ID=1
if [ -d "$TODO_DIR" ]; then
    # Find highest task number
    LAST_ID=$(find backlog -name "task-*.md" | sed 's/.*task-\([0-9]*\).*/\1/' | sort -n | tail -1)
    if [ ! -z "$LAST_ID" ]; then
        NEXT_ID=$((LAST_ID + 1))
    fi
fi

# Generate filename
TASK_FILE="$TODO_DIR/task-${NEXT_ID} - New Task.md"

# Copy template
cp "$TEMPLATE_FILE" "$TASK_FILE"

# Update created timestamp
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/createdAt: .*/createdAt: $(date -u +"%Y-%m-%dT%H:%M:%SZ")/" "$TASK_FILE"
else
    # Linux
    sed -i "s/createdAt: .*/createdAt: $(date -u +"%Y-%m-%dT%H:%M:%SZ")/" "$TASK_FILE"
fi

echo "✓ Created task file: $TASK_FILE"
echo ""
echo "Next steps:"
echo "1. Edit the file to add your task details"
echo "2. The watcher will automatically process it when saved"
echo ""
echo "Opening in default editor..."

# Open in editor (use EDITOR env var or fallback)
${EDITOR:-nano} "$TASK_FILE"
