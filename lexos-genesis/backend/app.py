#!/usr/bin/env python3
"""
LexOS Backend Server
Main application entry point
"""

import os
import sys
import json
import logging
from datetime import datetime
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.security import generate_password_hash, check_password_hash
import psutil
import platform

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        ],
        "supports_credentials": True
    }
})

# Configure SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# In-memory storage (replace with database in production)
users = {
    'admin': {
        'password': generate_password_hash('admin'),
        'role': 'admin',
        'name': 'Administrator'
    }
}

active_sessions = {}

# System health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """System health check endpoint"""
    try:
        # Get system information
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'system': {
                'platform': platform.system(),
                'platform_release': platform.release(),
                'platform_version': platform.version(),
                'architecture': platform.machine(),
                'processor': platform.processor(),
                'python_version': platform.python_version()
            },
            'resources': {
                'cpu': {
                    'percent': cpu_percent,
                    'count': psutil.cpu_count()
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': disk.percent
                }
            },
            'services': {
                'api': 'operational',
                'websocket': 'operational',
                'auth': 'operational',
                'storage': 'operational'
            }
        }
        
        # Determine overall health
        if cpu_percent > 90 or memory.percent > 90 or disk.percent > 95:
            health_status['status'] = 'degraded'
        
        return jsonify(health_status), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if username in users and check_password_hash(users[username]['password'], password):
        session['username'] = username
        session['role'] = users[username]['role']
        
        return jsonify({
            'success': True,
            'user': {
                'username': username,
                'name': users[username]['name'],
                'role': users[username]['role']
            }
        }), 200
    
    return jsonify({
        'success': False,
        'message': 'Invalid credentials'
    }), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    session.clear()
    return jsonify({'success': True}), 200

@app.route('/api/auth/session', methods=['GET'])
def get_session():
    """Get current session info"""
    if 'username' in session:
        username = session['username']
        return jsonify({
            'authenticated': True,
            'user': {
                'username': username,
                'name': users[username]['name'],
                'role': users[username]['role']
            }
        }), 200
    
    return jsonify({'authenticated': False}), 200

# System monitoring endpoints
@app.route('/api/system/stats', methods=['GET'])
def system_stats():
    """Get system statistics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_freq = psutil.cpu_freq()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        stats = {
            'cpu': {
                'percent': cpu_percent,
                'frequency': cpu_freq.current if cpu_freq else 0,
                'cores': psutil.cpu_count(logical=False),
                'threads': psutil.cpu_count(logical=True)
            },
            'memory': {
                'total': memory.total,
                'used': memory.used,
                'available': memory.available,
                'percent': memory.percent
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': disk.percent
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
        }
        
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Failed to get system stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

# File system endpoints
@app.route('/api/files/list', methods=['GET'])
def list_files():
    """List files in user directory"""
    # Placeholder implementation
    return jsonify({
        'files': [
            {'name': 'document.txt', 'type': 'file', 'size': 1024},
            {'name': 'images', 'type': 'directory', 'size': 0}
        ]
    }), 200

# Application management endpoints
@app.route('/api/apps/list', methods=['GET'])
def list_apps():
    """List available applications"""
    apps = [
        {
            'id': 'text-editor',
            'name': 'Text Editor',
            'icon': 'edit',
            'description': 'Edit text files'
        },
        {
            'id': 'terminal',
            'name': 'Terminal',
            'icon': 'terminal',
            'description': 'Command line interface'
        },
        {
            'id': 'file-manager',
            'name': 'File Manager',
            'icon': 'folder',
            'description': 'Browse and manage files'
        },
        {
            'id': 'calculator',
            'name': 'Calculator',
            'icon': 'calculator',
            'description': 'Perform calculations'
        }
    ]
    
    return jsonify({'apps': apps}), 200

# WebSocket events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('system_monitor_subscribe')
def handle_system_monitor_subscribe():
    """Subscribe to system monitoring updates"""
    # In production, this would start sending periodic updates
    emit('system_update', {
        'cpu': psutil.cpu_percent(),
        'memory': psutil.virtual_memory().percent,
        'timestamp': datetime.utcnow().isoformat()
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """500 error handler"""
    logger.error(f"Internal error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

# API documentation endpoint
@app.route('/api/docs', methods=['GET'])
def api_docs():
    """Return API documentation"""
    docs = {
        'version': '1.0.0',
        'title': 'LexOS API',
        'description': 'LexOS Backend API Documentation',
        'endpoints': [
            {
                'path': '/api/health',
                'method': 'GET',
                'description': 'System health check'
            },
            {
                'path': '/api/auth/login',
                'method': 'POST',
                'description': 'User login',
                'body': {
                    'username': 'string',
                    'password': 'string'
                }
            },
            {
                'path': '/api/auth/logout',
                'method': 'POST',
                'description': 'User logout'
            },
            {
                'path': '/api/system/stats',
                'method': 'GET',
                'description': 'Get system statistics'
            },
            {
                'path': '/api/files/list',
                'method': 'GET',
                'description': 'List user files'
            },
            {
                'path': '/api/apps/list',
                'method': 'GET',
                'description': 'List available applications'
            }
        ]
    }
    
    return jsonify(docs), 200

# Welcome endpoint
@app.route('/api', methods=['GET'])
def api_root():
    """API root endpoint"""
    return jsonify({
        'message': 'Welcome to LexOS API',
        'version': '1.0.0',
        'docs': '/api/docs',
        'health': '/api/health'
    }), 200

# Development server
if __name__ == '__main__':
    # Check if running in production
    is_production = os.environ.get('FLASK_ENV') == 'production'
    
    # Show startup message
    print(f"""
    ╔═══════════════════════════════════════╗
    ║          LexOS Backend Server         ║
    ║                                       ║
    ║  Version: 1.0.0                       ║
    ║  Mode: {'Production' if is_production else 'Development'}                   ║
    ║  Port: 5000                           ║
    ╚═══════════════════════════════════════╝
    """)
    
    # Run the server
    if is_production:
        # In production, use a proper WSGI server like gunicorn
        logger.info("Starting in production mode")
        socketio.run(app, host='0.0.0.0', port=5000)
    else:
        # Development mode with debug enabled
        logger.info("Starting in development mode")
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)