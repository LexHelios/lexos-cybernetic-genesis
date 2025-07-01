#!/bin/bash
pkill -f "node src/index.js" 2>/dev/null || true
sleep 2
cd /home/user/lexos-genesis/backend
npm start > /home/user/backend.log 2>&1 &
echo "Backend restarted on port 3001"
sleep 3
tail -20 /home/user/backend.log