const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const axios = require('axios');

class AlertManager extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.alertConfig = config.get('alerts') || {};
    this.alertHistory = {};
    this.transporter = null;
    
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (this.alertConfig.email?.enabled) {
      const emailConfig = this.alertConfig.email;
      
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.auth.user,
          pass: emailConfig.smtp.auth.pass
        }
      });
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Email transporter verification failed:', error);
        } else {
          this.logger.info('Email transporter ready');
        }
      });
    }
  }

  async createAlert(alert) {
    // Generate alert ID
    const alertId = this.generateAlertId(alert);
    
    // Check cooldown
    if (this.isInCooldown(alertId)) {
      this.logger.debug(`Alert ${alertId} is in cooldown period`);
      return;
    }
    
    // Update alert history
    this.alertHistory[alertId] = Date.now();
    
    // Enrich alert with additional info
    const enrichedAlert = {
      ...alert,
      id: alertId,
      timestamp: new Date().toISOString(),
      hostname: require('os').hostname()
    };
    
    // Emit alert event
    this.emit('alert', enrichedAlert);
    
    // Send notifications
    await this.sendNotifications(enrichedAlert);
  }

  generateAlertId(alert) {
    const components = [
      alert.type,
      alert.severity,
      alert.service || alert.resource || alert.database || 'general'
    ];
    
    return components.join('-');
  }

  isInCooldown(alertId) {
    const lastAlert = this.alertHistory[alertId];
    if (!lastAlert) {
      return false;
    }
    
    const cooldownPeriod = this.alertConfig.cooldown || 300000; // 5 minutes default
    return Date.now() - lastAlert < cooldownPeriod;
  }

  async sendNotifications(alert) {
    const promises = [];
    
    // Send email notification
    if (this.alertConfig.email?.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    // Send webhook notification
    if (this.alertConfig.webhook?.enabled) {
      promises.push(this.sendWebhookAlert(alert));
    }
    
    // Wait for all notifications
    const results = await Promise.allSettled(promises);
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(`Notification ${index} failed:`, result.reason);
      }
    });
  }

  async sendEmailAlert(alert) {
    if (!this.transporter) {
      return;
    }
    
    try {
      const subject = this.formatEmailSubject(alert);
      const html = this.formatEmailBody(alert);
      
      const mailOptions = {
        from: this.alertConfig.email.from,
        to: this.alertConfig.email.recipients.join(', '),
        subject,
        html
      };
      
      await this.transporter.sendMail(mailOptions);
      this.logger.info(`Email alert sent: ${subject}`);
      
    } catch (error) {
      this.logger.error('Failed to send email alert:', error);
      throw error;
    }
  }

  formatEmailSubject(alert) {
    const severity = alert.severity.toUpperCase();
    const type = alert.type.charAt(0).toUpperCase() + alert.type.slice(1);
    
    return `[${severity}] LexOS Alert: ${type} - ${alert.message}`;
  }

  formatEmailBody(alert) {
    const severityColors = {
      critical: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    
    const color = severityColors[alert.severity] || '#6c757d';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: ${color}; color: white; padding: 20px; }
          .header h2 { margin: 0; }
          .content { padding: 20px; }
          .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px; }
          .details pre { margin: 0; font-size: 12px; overflow-x: auto; }
          .footer { background-color: #f8f9fa; padding: 15px 20px; font-size: 12px; color: #6c757d; }
          .label { font-weight: bold; color: #495057; }
          .value { color: #212529; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${alert.severity.toUpperCase()} Alert</h2>
          </div>
          <div class="content">
            <h3>${alert.message}</h3>
            
            <p>
              <span class="label">Type:</span> <span class="value">${alert.type}</span><br>
              <span class="label">Timestamp:</span> <span class="value">${alert.timestamp}</span><br>
              <span class="label">Hostname:</span> <span class="value">${alert.hostname}</span><br>
              ${alert.service ? `<span class="label">Service:</span> <span class="value">${alert.service}</span><br>` : ''}
              ${alert.resource ? `<span class="label">Resource:</span> <span class="value">${alert.resource}</span><br>` : ''}
              ${alert.database ? `<span class="label">Database:</span> <span class="value">${alert.database}</span><br>` : ''}
            </p>
            
            ${alert.data ? `
              <div class="details">
                <strong>Additional Details:</strong>
                <pre>${JSON.stringify(alert.data, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            LexOS Monitoring Agent | <a href="http://${alert.hostname}:4000/dashboard">View Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWebhookAlert(alert) {
    try {
      const payload = this.formatWebhookPayload(alert);
      
      await axios.post(this.alertConfig.webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      this.logger.info('Webhook alert sent');
      
    } catch (error) {
      this.logger.error('Failed to send webhook alert:', error);
      throw error;
    }
  }

  formatWebhookPayload(alert) {
    // Format for Slack webhook
    const color = {
      critical: 'danger',
      warning: 'warning',
      info: 'good'
    }[alert.severity] || 'default';
    
    const fields = [
      {
        title: 'Type',
        value: alert.type,
        short: true
      },
      {
        title: 'Severity',
        value: alert.severity,
        short: true
      }
    ];
    
    if (alert.service) {
      fields.push({
        title: 'Service',
        value: alert.service,
        short: true
      });
    }
    
    if (alert.resource) {
      fields.push({
        title: 'Resource',
        value: alert.resource,
        short: true
      });
    }
    
    return {
      attachments: [{
        color,
        title: 'LexOS Monitoring Alert',
        text: alert.message,
        fields,
        footer: 'LexOS Monitoring Agent',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };
  }

  async sendReport(report) {
    if (!this.alertConfig.email?.enabled) {
      return;
    }
    
    try {
      const subject = `LexOS Daily Report - ${report.date}`;
      const html = this.formatReportEmail(report);
      
      const mailOptions = {
        from: this.alertConfig.email.from,
        to: this.alertConfig.email.recipients.join(', '),
        subject,
        html
      };
      
      await this.transporter.sendMail(mailOptions);
      this.logger.info('Daily report sent');
      
    } catch (error) {
      this.logger.error('Failed to send daily report:', error);
    }
  }

  formatReportEmail(report) {
    const uptimeColor = report.uptime >= 99 ? '#28a745' : report.uptime >= 95 ? '#ffc107' : '#dc3545';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: #007bff; color: white; padding: 20px; }
          .header h2 { margin: 0; }
          .content { padding: 20px; }
          .metric { display: inline-block; background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 10px 10px 0; min-width: 150px; }
          .metric h4 { margin: 0 0 5px 0; color: #495057; }
          .metric .value { font-size: 24px; font-weight: bold; }
          .section { margin: 20px 0; }
          .section h3 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
          .table { width: 100%; border-collapse: collapse; }
          .table th { background-color: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; }
          .table td { padding: 10px; border-bottom: 1px solid #dee2e6; }
          .status-healthy { color: #28a745; }
          .status-unhealthy { color: #dc3545; }
          .footer { background-color: #f8f9fa; padding: 15px 20px; font-size: 12px; color: #6c757d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Daily Monitoring Report</h2>
            <p style="margin: 5px 0 0 0;">${report.date}</p>
          </div>
          <div class="content">
            <!-- Key Metrics -->
            <div class="section">
              <div class="metric">
                <h4>Overall Uptime</h4>
                <div class="value" style="color: ${uptimeColor}">${report.uptime.toFixed(2)}%</div>
              </div>
              <div class="metric">
                <h4>Incidents</h4>
                <div class="value">${report.incidents.length}</div>
              </div>
              <div class="metric">
                <h4>Alerts</h4>
                <div class="value">${report.alerts.length}</div>
              </div>
            </div>
            
            <!-- Service Health -->
            <div class="section">
              <h3>Service Health</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Uptime</th>
                    <th>Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(report.serviceHealth).map(([name, health]) => `
                    <tr>
                      <td>${name}</td>
                      <td class="status-${health.currentStatus}">${health.currentStatus}</td>
                      <td>${health.uptime.toFixed(2)}%</td>
                      <td>${health.incidents}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <!-- Recent Incidents -->
            ${report.incidents.length > 0 ? `
              <div class="section">
                <h3>Recent Incidents</h3>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Service</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.incidents.slice(0, 10).map(incident => `
                      <tr>
                        <td>${new Date(incident.timestamp).toLocaleString()}</td>
                        <td>${incident.action}</td>
                        <td>${incident.service || 'N/A'}</td>
                        <td>${incident.status}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            <!-- Resource Usage -->
            <div class="section">
              <h3>Average Resource Usage (24h)</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Average</th>
                    <th>Peak</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(report.resourceUsage).map(([resource, data]) => `
                    <tr>
                      <td>${resource.toUpperCase()}</td>
                      <td>${data.average.toFixed(2)}%</td>
                      <td>${data.peak.toFixed(2)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="footer">
            LexOS Monitoring Agent | <a href="http://localhost:4000/dashboard">View Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  clearHistory() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [alertId, timestamp] of Object.entries(this.alertHistory)) {
      if (now - timestamp > maxAge) {
        delete this.alertHistory[alertId];
      }
    }
  }
}

module.exports = AlertManager;