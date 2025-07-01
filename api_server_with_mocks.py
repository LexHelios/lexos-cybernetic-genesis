#!/usr/bin/env python3
"""
API Server with mock endpoints wrapper
"""
import sys
sys.path.append('/home/user')

# Import and run the original API server
from api_server import LexOSAPIServer
from mock_endpoints import add_mock_endpoints

if __name__ == "__main__":
    # Create the server
    server = LexOSAPIServer()
    
    # Add mock endpoints
    add_mock_endpoints(server.app)
    
    # Run the server
    import uvicorn
    uvicorn.run(
        server.app,
        host="0.0.0.0",
        port=9000,
        reload=False,
        access_log=True
    )