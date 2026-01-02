#!/bin/bash
# Check status of the ticket processor service

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use systemd
    systemctl --user status ticket-processor
    echo ""
    echo "Recent logs:"
    journalctl --user -u ticket-processor -n 20 --no-pager
else
    # macOS - use PM2
    pm2 status ticket-processor
    echo ""
    echo "Recent logs:"
    pm2 logs ticket-processor --lines 20 --nostream
fi
