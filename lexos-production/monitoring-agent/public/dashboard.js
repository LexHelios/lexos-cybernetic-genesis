// Dashboard JavaScript
let socket;
let charts = {};
let systemStatus = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    initializeCharts();
    setupEventHandlers();
});

// Initialize WebSocket connection
function initializeWebSocket() {
    socket = io();

    socket.on('connect', () => {
        updateConnectionStatus(true);
        console.log('Connected to monitoring agent');
    });

    socket.on('disconnect', () => {
        updateConnectionStatus(false);
        console.log('Disconnected from monitoring agent');
    });

    socket.on('status', (data) => {
        systemStatus = data;
        updateDashboard(data);
    });

    socket.on('statusUpdate', (update) => {
        handleStatusUpdate(update);
    });

    socket.on('alert', (alert) => {
        handleNewAlert(alert);
    });

    socket.on('metrics', (metrics) => {
        updateMetrics(metrics);
    });

    socket.on('commandResult', (result) => {
        handleCommandResult(result);
    });
}

// Initialize charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: function(value) {
                        return value + '%';
                    }
                }
            }
        }
    };

    // CPU Chart
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    charts.cpu = new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: chartOptions
    });

    // Memory Chart
    const memoryCtx = document.getElementById('memoryChart').getContext('2d');
    charts.memory = new Chart(memoryCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: chartOptions
    });

    // Disk Chart
    const diskCtx = document.getElementById('diskChart').getContext('2d');
    charts.disk = new Chart(diskCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: '#10b981'
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: {
                    display: false
                }
            }
        }
    });

    // GPU Chart
    const gpuCtx = document.getElementById('gpuChart').getContext('2d');
    charts.gpu = new Chart(gpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4
            }]
        },
        options: chartOptions
    });
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Connected';
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
    }
}

// Update dashboard with status data
function updateDashboard(data) {
    updateLastUpdateTime();
    
    // Update services
    if (data.services) {
        updateServices(data.services);
    }
    
    // Update resources
    if (data.resources) {
        updateResourceMetrics(data.resources);
    }
    
    // Update alerts
    if (data.alerts) {
        updateAlerts(data.alerts);
    }
    
    // Update incidents
    if (data.incidents) {
        updateIncidents(data.incidents);
    }
}

// Update last update time
function updateLastUpdateTime() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    lastUpdateEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
}

// Update services display
function updateServices(services) {
    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = '';
    
    Object.entries(services).forEach(([name, service]) => {
        const serviceCard = createServiceCard(name, service);
        servicesGrid.appendChild(serviceCard);
    });
}

// Create service card element
function createServiceCard(name, service) {
    const card = document.createElement('div');
    card.className = `service-card ${service.status}`;
    
    const statusIcon = service.status === 'healthy' ? 'check-circle' : 
                      service.status === 'unhealthy' ? 'times-circle' : 
                      'exclamation-circle';
    
    const statusColor = service.status === 'healthy' ? 'healthy' : 
                       service.status === 'unhealthy' ? 'unhealthy' : 
                       'warning';
    
    card.innerHTML = `
        <div class="service-header">
            <div class="service-name">${name}</div>
            <div class="service-status ${statusColor}">
                <i class="fas fa-${statusIcon}"></i>
                ${service.status}
            </div>
        </div>
        <div class="service-details">
            ${service.responseTime ? `
                <div class="service-detail">
                    <span>Response Time:</span>
                    <span>${service.responseTime}ms</span>
                </div>
            ` : ''}
            ${service.uptime !== undefined ? `
                <div class="service-detail">
                    <span>Uptime:</span>
                    <span>${service.uptime.toFixed(1)}%</span>
                </div>
            ` : ''}
            ${service.lastCheck ? `
                <div class="service-detail">
                    <span>Last Check:</span>
                    <span>${new Date(service.lastCheck).toLocaleTimeString()}</span>
                </div>
            ` : ''}
        </div>
        <div class="service-actions">
            <button class="service-action-btn" onclick="restartService('${name}')">
                <i class="fas fa-sync-alt"></i> Restart
            </button>
            <button class="service-action-btn" onclick="viewServiceLogs('${name}')">
                <i class="fas fa-file-alt"></i> Logs
            </button>
        </div>
    `;
    
    return card;
}

// Update resource metrics
function updateResourceMetrics(resources) {
    // Update CPU if available
    if (resources.cpu) {
        document.getElementById('cpuUsage').textContent = 
            `${resources.cpu.usage?.toFixed(1) || '--'}%`;
    }
    
    // Update Memory if available
    if (resources.memory) {
        document.getElementById('memoryUsage').textContent = 
            `${resources.memory.usage?.toFixed(1) || '--'}%`;
    }
    
    // Update Disk if available
    if (resources.disk) {
        const primaryDisk = resources.disk['/'] || resources.disk[Object.keys(resources.disk)[0]];
        if (primaryDisk) {
            document.getElementById('diskUsage').textContent = 
                `${primaryDisk.usage?.toFixed(1) || '--'}%`;
        }
    }
    
    // Update GPU if available
    if (resources.gpu && resources.gpu.length > 0) {
        document.getElementById('gpuUsage').textContent = 
            `${resources.gpu[0].utilization?.toFixed(1) || '--'}%`;
    }
}

// Handle status updates
function handleStatusUpdate(update) {
    updateLastUpdateTime();
    
    switch (update.type) {
        case 'services':
            // Update specific service
            break;
        case 'resources':
            updateResourceMetrics({ [update.data.type]: update.data });
            break;
    }
}

// Handle new alerts
function handleNewAlert(alert) {
    const alertsContainer = document.getElementById('alertsContainer');
    const alertEl = createAlertElement(alert);
    
    // Add to top of alerts
    alertsContainer.insertBefore(alertEl, alertsContainer.firstChild);
    
    // Remove old alerts if too many
    while (alertsContainer.children.length > 50) {
        alertsContainer.removeChild(alertsContainer.lastChild);
    }
    
    // Show notification
    showNotification(alert);
}

// Create alert element
function createAlertElement(alert) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-item ${alert.severity}`;
    
    const icon = alert.severity === 'critical' ? 'exclamation-triangle' :
                 alert.severity === 'warning' ? 'exclamation-circle' :
                 'info-circle';
    
    alertDiv.innerHTML = `
        <i class="fas fa-${icon} alert-icon"></i>
        <div class="alert-content">
            <div class="alert-message">${alert.message}</div>
            <div class="alert-details">
                ${alert.service ? `Service: ${alert.service}` : ''}
                ${alert.resource ? `Resource: ${alert.resource}` : ''}
            </div>
        </div>
        <div class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</div>
    `;
    
    return alertDiv;
}

// Update alerts display
function updateAlerts(alerts) {
    const alertsContainer = document.getElementById('alertsContainer');
    alertsContainer.innerHTML = '';
    
    alerts.slice(0, 20).forEach(alert => {
        const alertEl = createAlertElement(alert);
        alertsContainer.appendChild(alertEl);
    });
}

// Update incidents display
function updateIncidents(incidents) {
    const tbody = document.getElementById('incidentsTableBody');
    tbody.innerHTML = '';
    
    incidents.slice(0, 20).forEach(incident => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(incident.timestamp).toLocaleString()}</td>
            <td>${incident.action}</td>
            <td>${incident.service || 'System'}</td>
            <td><span class="status-badge ${incident.status}">${incident.status}</span></td>
            <td>${incident.error || incident.reason || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update metrics charts
function updateMetrics(metrics) {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (metrics.type) {
        case 'cpu':
            updateChart(charts.cpu, timestamp, metrics.data.usage);
            document.getElementById('cpuUsage').textContent = `${metrics.data.usage.toFixed(1)}%`;
            break;
            
        case 'memory':
            updateChart(charts.memory, timestamp, metrics.data.usage);
            document.getElementById('memoryUsage').textContent = `${metrics.data.usage.toFixed(1)}%`;
            break;
            
        case 'disk':
            if (Array.isArray(metrics.data) && metrics.data.length > 0) {
                const primaryDisk = metrics.data.find(d => d.mount === '/') || metrics.data[0];
                updateDiskChart(charts.disk, metrics.data);
                document.getElementById('diskUsage').textContent = `${primaryDisk.usage.toFixed(1)}%`;
            }
            break;
            
        case 'gpu':
            if (Array.isArray(metrics.data) && metrics.data.length > 0) {
                updateChart(charts.gpu, timestamp, metrics.data[0].utilization);
                document.getElementById('gpuUsage').textContent = `${metrics.data[0].utilization.toFixed(1)}%`;
            }
            break;
    }
}

// Update line chart
function updateChart(chart, label, value) {
    const maxDataPoints = 20;
    
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);
    
    // Keep only recent data
    if (chart.data.labels.length > maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    
    chart.update('none');
}

// Update disk chart
function updateDiskChart(chart, diskData) {
    chart.data.labels = diskData.map(d => d.mount);
    chart.data.datasets[0].data = diskData.map(d => d.usage);
    chart.update('none');
}

// Service actions
function restartService(serviceName) {
    if (confirm(`Are you sure you want to restart ${serviceName}?`)) {
        showModal('Restarting Service', `Restarting ${serviceName}...`);
        socket.emit('restartService', serviceName);
    }
}

function viewServiceLogs(serviceName) {
    // In a real implementation, this would open a log viewer
    alert(`Log viewing for ${serviceName} would be implemented here`);
}

// Quick actions
function restartAllServices() {
    if (confirm('Are you sure you want to restart all services?')) {
        showModal('Restarting All Services', 'This may take a few moments...');
        socket.emit('runRecovery', { type: 'restartAll' });
    }
}

function clearCache() {
    if (confirm('Are you sure you want to clear all cache?')) {
        showModal('Clearing Cache', 'Clearing cache directories...');
        socket.emit('runRecovery', { type: 'clearAllCache' });
    }
}

function cleanupSystem() {
    if (confirm('Are you sure you want to run system cleanup?')) {
        showModal('System Cleanup', 'Running cleanup tasks...');
        socket.emit('runRecovery', { type: 'cleanupSystem' });
    }
}

function exportReport() {
    // In a real implementation, this would generate and download a report
    window.location.href = '/api/report/export';
}

// Handle command results
function handleCommandResult(result) {
    if (result.success) {
        showModal('Success', 'Action completed successfully');
    } else {
        showModal('Error', `Action failed: ${result.error}`);
    }
}

// Modal functions
function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('actionModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('actionModal').style.display = 'none';
}

// Show notification
function showNotification(alert) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('LexOS Alert', {
            body: alert.message,
            icon: '/public/icon.png'
        });
    }
}

// Setup event handlers
function setupEventHandlers() {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Close modal on background click
    document.getElementById('actionModal').addEventListener('click', (e) => {
        if (e.target.id === 'actionModal') {
            closeModal();
        }
    });
}