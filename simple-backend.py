#!/usr/bin/env python3
import asyncio
import json
from aiohttp import web
import aiohttp_cors

routes = web.RouteTableDef()

@routes.get('/health')
async def health(request):
    return web.json_response({'status': 'ok'})

@routes.get('/api/agents')
async def get_agents(request):
    return web.json_response([
        {
            'id': '1',
            'name': 'LEX-Alpha-001',
            'type': 'General Purpose AI',
            'status': 'active',
            'performance': 95,
            'tasksCompleted': 1247,
            'uptime': '7d 14h',
            'capabilities': ['NLP', 'Code Generation', 'Analysis']
        }
    ])

@routes.get('/api/system/metrics')
async def get_metrics(request):
    return web.json_response({
        'cpu': {'usage': 45, 'cores': 32},
        'memory': {'used': 12.4, 'total': 32, 'percentage': 38.75},
        'gpu': {'usage': 78, 'memory': 85, 'temperature': 72},
        'network': {'in': 125.4, 'out': 89.2},
        'storage': {'used': 45.6, 'total': 100, 'percentage': 45.6}
    })

@routes.post('/api/auth/login')
async def login(request):
    return web.json_response({
        'success': True,
        'user': {'username': 'admin', 'role': 'admin'},
        'token': 'mock-token'
    })

@routes.get('/api/notifications')
async def get_notifications(request):
    return web.json_response([])

@routes.get('/api/notifications/count')
async def get_notification_count(request):
    return web.json_response({'count': 0})

@routes.get('/api/notifications/preferences')
async def get_preferences(request):
    return web.json_response({
        'emailEnabled': True,
        'pushEnabled': True,
        'inAppEnabled': True,
        'notificationTypes': []
    })

@routes.get('/ws/monitoring')
async def websocket_monitoring(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    try:
        while True:
            await ws.send_json({
                'type': 'metrics',
                'data': {
                    'cpu': 45,
                    'memory': 38,
                    'timestamp': 1234567890
                }
            })
            await asyncio.sleep(2)
    except ConnectionResetError:
        pass
    
    return ws

@routes.get('/ws')
async def websocket_main(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    return ws

app = web.Application()
app.add_routes(routes)

# Configure CORS
cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods="*"
    )
})

for route in list(app.router.routes()):
    cors.add(route)

if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=9000)