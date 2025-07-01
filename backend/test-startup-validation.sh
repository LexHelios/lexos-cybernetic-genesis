#!/bin/bash

# Test script for backend startup validation
echo "🧪 Testing LexOS Backend Startup Validation"
echo "=========================================="

cd /home/runner/work/lexos-cybernetic-genesis/lexos-cybernetic-genesis/backend

# Test 1: Missing environment variables
echo ""
echo "Test 1: Missing critical environment variables"
cp .env.test .env.backup
echo "NODE_ENV=production" > .env
echo "PORT=9000" >> .env
timeout 5s npm start > /dev/null 2>&1
if [ $? -eq 1 ]; then
    echo "✅ PASS: Backend correctly failed with missing environment variables"
else
    echo "❌ FAIL: Backend should have failed with missing environment variables"
fi

# Test 2: Weak passwords
echo ""
echo "Test 2: Weak/default passwords"
cp .env.backup .env
sed -i 's/SecureAdmin123!@#/NEXUS_ADMIN_CHANGE_IMMEDIATELY/' .env
timeout 5s npm start > /dev/null 2>&1
if [ $? -eq 1 ]; then
    echo "✅ PASS: Backend correctly failed with weak passwords"
else
    echo "❌ FAIL: Backend should have failed with weak passwords"
fi

# Test 3: Valid configuration
echo ""
echo "Test 3: Valid configuration"
cp .env.backup .env
timeout 5s npm start > /tmp/startup.log 2>&1 &
BACKEND_PID=$!
sleep 3
if curl -s http://localhost:9000/health > /dev/null; then
    echo "✅ PASS: Backend started successfully with valid configuration"
    echo "✅ PASS: Health endpoint responding"
else
    echo "❌ FAIL: Backend did not start or health endpoint not responding"
fi
kill $BACKEND_PID 2>/dev/null

# Test 4: Database connectivity check
echo ""
echo "Test 4: Database connectivity"
# The SQLite check should pass since better-sqlite3 is installed
if grep -q "SQLite database connectivity: OK" /tmp/startup.log; then
    echo "✅ PASS: Database connectivity check working"
else
    echo "❌ FAIL: Database connectivity check not working"
fi

# Test 5: Error logging
echo ""
echo "Test 5: Error logging"
if [ -f logs/backend-error.log ] && [ -s logs/backend-error.log ]; then
    echo "✅ PASS: Error logging working"
else
    echo "❌ FAIL: Error logging not working"
fi

# Test 6: Success logging
echo ""
echo "Test 6: Success logging"
if [ -f logs/backend.log ] && [ -s logs/backend.log ]; then
    echo "✅ PASS: Success logging working"
else
    echo "❌ FAIL: Success logging not working"
fi

# Clean up
cp .env.backup .env
echo ""
echo "🎯 Testing completed!"
echo "Check logs/backend-error.log for error details"
echo "Check logs/backend.log for success details"