const EventEmitter = require('events');
const fs = require('fs');
const tls = require('tls');
const https = require('https');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

class SSLMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.sslConfig = config.get('ssl') || {};
    this.interval = null;
    this.certificates = {};
  }

  async start() {
    if (!this.sslConfig.enabled) {
      this.logger.info('SSL monitor disabled');
      return;
    }
    
    this.logger.info('Starting SSL monitor...');
    
    // Initial check
    await this.checkCertificates();
    
    // Schedule periodic checks
    this.interval = setInterval(() => {
      this.checkCertificates();
    }, this.sslConfig.checkInterval || 86400000); // 24 hours default
  }

  async stop() {
    this.logger.info('Stopping SSL monitor...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async checkCertificates() {
    const certificates = this.sslConfig.certificates || [];
    
    for (const certConfig of certificates) {
      try {
        await this.checkCertificate(certConfig);
      } catch (error) {
        this.logger.error(`Error checking certificate ${certConfig.path}:`, error);
      }
    }
  }

  async checkCertificate(certConfig) {
    try {
      let certInfo;
      
      // Check if it's a file path or a domain
      if (certConfig.path.startsWith('/') || certConfig.path.includes('.pem') || certConfig.path.includes('.crt')) {
        // Local certificate file
        certInfo = await this.checkLocalCertificate(certConfig.path);
      } else {
        // Remote domain certificate
        certInfo = await this.checkRemoteCertificate(certConfig.path);
      }
      
      // Calculate days until expiry
      const now = new Date();
      const expiryDate = new Date(certInfo.validTo);
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      // Store certificate info
      this.certificates[certConfig.path] = {
        ...certInfo,
        daysUntilExpiry,
        lastCheck: now.toISOString()
      };
      
      // Check thresholds and emit alerts
      if (daysUntilExpiry <= 0) {
        this.emit('expiring', {
          path: certConfig.path,
          severity: 'critical',
          message: 'Certificate has expired',
          daysUntilExpiry,
          expiryDate: certInfo.validTo,
          details: certInfo
        });
      } else if (daysUntilExpiry <= certConfig.criticalDays) {
        this.emit('expiring', {
          path: certConfig.path,
          severity: 'critical',
          message: `Certificate expires in ${daysUntilExpiry} days`,
          daysUntilExpiry,
          expiryDate: certInfo.validTo,
          details: certInfo
        });
      } else if (daysUntilExpiry <= certConfig.warningDays) {
        this.emit('expiring', {
          path: certConfig.path,
          severity: 'warning',
          message: `Certificate expires in ${daysUntilExpiry} days`,
          daysUntilExpiry,
          expiryDate: certInfo.validTo,
          details: certInfo
        });
      }
      
      // Emit status update
      this.emit('status', {
        path: certConfig.path,
        status: 'valid',
        daysUntilExpiry,
        ...certInfo
      });
      
    } catch (error) {
      this.logger.error(`Failed to check certificate ${certConfig.path}:`, error);
      
      this.emit('error', {
        path: certConfig.path,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkLocalCertificate(certPath) {
    try {
      // Use openssl to get certificate info
      const { stdout } = await execAsync(
        `openssl x509 -in ${certPath} -noout -subject -issuer -dates -serial`
      );
      
      const info = this.parseOpenSSLOutput(stdout);
      
      // Get additional details
      const { stdout: textOutput } = await execAsync(
        `openssl x509 -in ${certPath} -text -noout`
      );
      
      const details = this.parseCertificateText(textOutput);
      
      return {
        ...info,
        ...details,
        type: 'local'
      };
      
    } catch (error) {
      throw new Error(`Failed to read certificate: ${error.message}`);
    }
  }

  async checkRemoteCertificate(hostname) {
    return new Promise((resolve, reject) => {
      const port = 443;
      const options = {
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false
      };
      
      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate();
        
        if (!cert || Object.keys(cert).length === 0) {
          socket.end();
          reject(new Error('No certificate received'));
          return;
        }
        
        const certInfo = {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          altNames: cert.subjectaltname,
          type: 'remote',
          hostname: hostname
        };
        
        socket.end();
        resolve(certInfo);
      });
      
      socket.on('error', (error) => {
        reject(error);
      });
      
      socket.setTimeout(10000, () => {
        socket.end();
        reject(new Error('Connection timeout'));
      });
    });
  }

  parseOpenSSLOutput(output) {
    const lines = output.split('\n');
    const info = {};
    
    for (const line of lines) {
      if (line.startsWith('subject=')) {
        info.subject = line.substring(8).trim();
      } else if (line.startsWith('issuer=')) {
        info.issuer = line.substring(7).trim();
      } else if (line.startsWith('notBefore=')) {
        info.validFrom = line.substring(10).trim();
      } else if (line.startsWith('notAfter=')) {
        info.validTo = line.substring(9).trim();
      } else if (line.startsWith('serial=')) {
        info.serialNumber = line.substring(7).trim();
      }
    }
    
    return info;
  }

  parseCertificateText(text) {
    const details = {
      signatureAlgorithm: null,
      keySize: null,
      extensions: {}
    };
    
    // Extract signature algorithm
    const sigAlgMatch = text.match(/Signature Algorithm: (.+)/);
    if (sigAlgMatch) {
      details.signatureAlgorithm = sigAlgMatch[1].trim();
    }
    
    // Extract key size
    const keySizeMatch = text.match(/Public-Key: \((\d+) bit\)/);
    if (keySizeMatch) {
      details.keySize = parseInt(keySizeMatch[1]);
    }
    
    // Extract SANs
    const sanMatch = text.match(/Subject Alternative Name:\s*\n\s*(.+)/);
    if (sanMatch) {
      details.altNames = sanMatch[1].trim();
    }
    
    return details;
  }

  async checkCertificateChain(certPath) {
    try {
      const { stdout } = await execAsync(
        `openssl verify -CApath /etc/ssl/certs ${certPath}`
      );
      
      return {
        valid: stdout.includes('OK'),
        output: stdout.trim()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async getCertificateOCSPStatus(certPath) {
    try {
      // This would implement OCSP checking
      // For now, return placeholder
      return {
        status: 'good',
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }

  getStatus() {
    return this.certificates;
  }

  async generateRenewalCommands() {
    const commands = {};
    
    for (const [path, cert] of Object.entries(this.certificates)) {
      if (cert.daysUntilExpiry <= 30) {
        // Generate renewal command based on certificate type
        if (cert.hostname) {
          // Let's Encrypt style renewal
          commands[path] = {
            type: 'letsencrypt',
            command: `certbot renew --cert-name ${cert.hostname}`,
            description: `Renew Let's Encrypt certificate for ${cert.hostname}`
          };
        } else {
          // Manual renewal reminder
          commands[path] = {
            type: 'manual',
            command: null,
            description: `Manual renewal required for ${path}`
          };
        }
      }
    }
    
    return commands;
  }

  async checkSSLConfiguration(hostname, port = 443) {
    const results = {
      protocols: {},
      ciphers: [],
      vulnerabilities: {}
    };
    
    // Check supported protocols
    const protocols = ['ssl3', 'tls1', 'tls1_1', 'tls1_2', 'tls1_3'];
    
    for (const protocol of protocols) {
      try {
        const { stdout, stderr } = await execAsync(
          `echo | openssl s_client -${protocol} -connect ${hostname}:${port} 2>&1`,
          { timeout: 5000 }
        );
        
        results.protocols[protocol] = !stderr.includes('unknown option');
      } catch (error) {
        results.protocols[protocol] = false;
      }
    }
    
    // Check for common vulnerabilities
    results.vulnerabilities.ssl3 = results.protocols.ssl3;
    results.vulnerabilities.tls1_0 = results.protocols.tls1;
    results.vulnerabilities.tls1_1 = results.protocols.tls1_1;
    
    return results;
  }
}

module.exports = SSLMonitor;