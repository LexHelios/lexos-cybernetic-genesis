#!/bin/bash
cd /home/user/lexos-genesis/backend
pkill -f "node src/index.js" 2>/dev/null || true
sleep 1
npm start > /home/user/backend.log 2>&1 &
echo "Backend started with PID: $!"
sleep 3
echo "Backend log:"
cat /home/user/backend.log