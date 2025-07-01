#!/usr/bin/env python3
import requests
import json

# Test login
response = requests.post('http://localhost:9000/api/auth/login', 
                        json={'username': 'admin', 'password': 'Admin123!'})
print('Login Response:', response.json())

# Test models endpoint
response = requests.get('http://localhost:9000/api/models', 
                       headers={'Authorization': 'Bearer test'})
print('Models Response:', response.json())