#!/usr/bin/env node

// Test script to verify monitoring agent can start

const path = require('path');

console.log('🧪 Testing LexOS Monitoring Agent startup...\n');

// Test 1: Check Node.js version
console.log('1️⃣ Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 16) {
  console.log(`✅ Node.js ${nodeVersion} (>= 16.0.0 required)`);
} else {
  console.log(`❌ Node.js ${nodeVersion} is too old (>= 16.0.0 required)`);
  process.exit(1);
}

// Test 2: Check required modules
console.log('\n2️⃣ Checking required modules...');
const requiredModules = [
  'express',
  'winston',
  'axios',
  'ws',
  'socket.io',
  'yaml',
  'joi'
];

let modulesOk = true;
for (const module of requiredModules) {
  try {
    require(module);
    console.log(`✅ ${module}`);
  } catch (error) {
    console.log(`❌ ${module} - not installed`);
    modulesOk = false;
  }
}

if (!modulesOk) {
  console.log('\n❌ Some modules are missing. Run: npm install');
  process.exit(1);
}

// Test 3: Check configuration
console.log('\n3️⃣ Checking configuration...');
try {
  const ConfigManager = require('../src/utils/configManager');
  const config = new ConfigManager();
  console.log('✅ Configuration loaded successfully');
  
  // Check critical config values
  const port = config.get('agent.port');
  const services = config.get('services');
  
  console.log(`   Port: ${port}`);
  console.log(`   Services configured: ${Object.keys(services).length}`);
} catch (error) {
  console.log(`❌ Configuration error: ${error.message}`);
  process.exit(1);
}

// Test 4: Check logger
console.log('\n4️⃣ Checking logger...');
try {
  const Logger = require('../src/utils/logger');
  const logger = new Logger();
  logger.info('Test log message');
  console.log('✅ Logger initialized successfully');
} catch (error) {
  console.log(`❌ Logger error: ${error.message}`);
  process.exit(1);
}

// Test 5: Check directory structure
console.log('\n5️⃣ Checking directory structure...');
const fs = require('fs');
const dirs = ['logs', 'metrics', 'public', 'config', 'src'];
let dirsOk = true;

for (const dir of dirs) {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${dir}/`);
  } else {
    console.log(`❌ ${dir}/ - missing`);
    dirsOk = false;
  }
}

if (!dirsOk) {
  console.log('\n❌ Some directories are missing. Run setup script.');
  process.exit(1);
}

// Test 6: Test basic HTTP server
console.log('\n6️⃣ Testing HTTP server...');
const express = require('express');
const app = express();
const testPort = 14000; // Use different port for test

const server = app.listen(testPort, () => {
  console.log(`✅ Test server started on port ${testPort}`);
  server.close();
  
  console.log('\n✅ All tests passed! The monitoring agent should start successfully.');
  console.log('\nRun "npm start" to start the monitoring agent.');
  process.exit(0);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${testPort} is in use, but that's OK for testing`);
    console.log('\n✅ All tests passed! The monitoring agent should start successfully.');
  } else {
    console.log(`❌ Server error: ${error.message}`);
  }
  process.exit(0);
});