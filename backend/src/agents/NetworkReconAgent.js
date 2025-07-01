import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { BaseAgent } from './BaseAgent.js';

const execAsync = promisify(exec);

/**
 * NEXUS NETWORK RECONNAISSANCE AGENT - NETWORK INTELLIGENCE
 * This agent performs network reconnaissance, port scanning, and infrastructure analysis
 */
export class NetworkReconAgent extends BaseAgent {
  constructor() {
    super('network-recon', 'Network Reconnaissance Agent');
    this.capabilities = [
      'port_scanning',
      'subdomain_discovery',
      'dns_enumeration',
      'whois_lookup',
      'ssl_analysis',
      'network_mapping',
      'vulnerability_scanning',
      'service_detection'
    ];
  }

  async initialize() {
    console.log('🔍 Network Reconnaissance Agent initialized - SCANNING THE INTERNET!');
    return true;
  }

  async executeTask(task) {
    const { action } = task;

    switch (action) {
      case 'port_scan':
        return await this.portScan(task.target, task.options);
      case 'subdomain_discovery':
        return await this.discoverSubdomains(task.domain, task.options);
      case 'dns_enumeration':
        return await this.enumerateDNS(task.domain, task.options);
      case 'whois_lookup':
        return await this.whoisLookup(task.domain);
      case 'ssl_analysis':
        return await this.analyzeSSL(task.domain, task.port);
      case 'service_detection':
        return await this.detectServices(task.target, task.options);
      case 'network_map':
        return await this.mapNetwork(task.target, task.options);
      case 'vulnerability_scan':
        return await this.vulnerabilityScan(task.target, task.options);
      default:
        throw new Error(`Unknown network reconnaissance action: ${action}`);
    }
  }

  async portScan(target, options = {}) {
    const ports = options.ports || '1-1000';
    const timeout = options.timeout || 5000;
    
    console.log(`🔍 Port scanning ${target} on ports ${ports}`);

    try {
      // Use nmap if available, otherwise fallback to custom implementation
      let nmapResult;
      try {
        const { stdout } = await execAsync(`nmap -p ${ports} ${target} --open -T4`, { timeout });
        nmapResult = this.parseNmapOutput(stdout);
      } catch (error) {
        console.log('Nmap not available, using custom port scanner');
        nmapResult = await this.customPortScan(target, options);
      }

      return {
        success: true,
        target,
        ports: nmapResult.openPorts,
        services: nmapResult.services,
        scanTime: nmapResult.scanTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async customPortScan(target, options = {}) {
    const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 8080, 8443, 3389, 5432, 3306, 27017, 6379];
    const portsToScan = options.customPorts || commonPorts;
    const timeout = options.timeout || 3000;

    const openPorts = [];
    const services = [];

    console.log(`🔍 Custom scanning ${portsToScan.length} ports on ${target}`);

    for (const port of portsToScan) {
      try {
        const isOpen = await this.checkPort(target, port, timeout);
        if (isOpen) {
          openPorts.push(port);
          const service = this.identifyService(port);
          if (service) {
            services.push({ port, service });
          }
        }
      } catch (error) {
        // Port closed or filtered
      }
    }

    return {
      openPorts,
      services,
      scanTime: `${portsToScan.length} ports scanned`
    };
  }

  async checkPort(host, port, timeout = 3000) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  identifyService(port) {
    const commonServices = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S',
      3389: 'RDP',
      5432: 'PostgreSQL',
      3306: 'MySQL',
      27017: 'MongoDB',
      6379: 'Redis',
      8080: 'HTTP-Alt',
      8443: 'HTTPS-Alt'
    };

    return commonServices[port] || 'Unknown';
  }

  parseNmapOutput(output) {
    const lines = output.split('\n');
    const openPorts = [];
    const services = [];
    let scanTime = '';

    for (const line of lines) {
      if (line.includes('/tcp') && line.includes('open')) {
        const parts = line.trim().split(/\s+/);
        const portInfo = parts[0].split('/')[0];
        const port = parseInt(portInfo);
        const service = parts[2] || 'unknown';
        
        openPorts.push(port);
        services.push({ port, service });
      }
      
      if (line.includes('Nmap done')) {
        scanTime = line;
      }
    }

    return { openPorts, services, scanTime };
  }

  async discoverSubdomains(domain, options = {}) {
    const subdomains = new Set();
    const methods = options.methods || ['dns', 'certificate', 'wordlist'];

    console.log(`🔍 Discovering subdomains for ${domain}`);

    // Method 1: DNS enumeration
    if (methods.includes('dns')) {
      const dnsSubdomains = await this.dnsSubdomainDiscovery(domain);
      dnsSubdomains.forEach(sub => subdomains.add(sub));
    }

    // Method 2: Certificate transparency logs
    if (methods.includes('certificate')) {
      const certSubdomains = await this.certificateSubdomainDiscovery(domain);
      certSubdomains.forEach(sub => subdomains.add(sub));
    }

    // Method 3: Wordlist brute force
    if (methods.includes('wordlist')) {
      const wordlistSubdomains = await this.wordlistSubdomainDiscovery(domain, options);
      wordlistSubdomains.forEach(sub => subdomains.add(sub));
    }

    const discoveredSubdomains = Array.from(subdomains);
    
    // Verify subdomains are alive
    const aliveSubdomains = [];
    for (const subdomain of discoveredSubdomains) {
      const isAlive = await this.checkSubdomainAlive(subdomain);
      if (isAlive) {
        aliveSubdomains.push(subdomain);
      }
    }

    return {
      success: true,
      domain,
      totalFound: discoveredSubdomains.length,
      aliveSubdomains: aliveSubdomains.length,
      subdomains: aliveSubdomains,
      methods: methods,
      timestamp: new Date().toISOString()
    };
  }

  async dnsSubdomainDiscovery(domain) {
    const commonSubdomains = [
      'www', 'mail', 'ftp', 'admin', 'api', 'dev', 'test', 'staging', 'blog',
      'shop', 'store', 'support', 'help', 'docs', 'cdn', 'static', 'assets',
      'img', 'images', 'media', 'video', 'files', 'download', 'upload',
      'secure', 'ssl', 'vpn', 'remote', 'portal', 'dashboard', 'panel'
    ];

    const subdomains = [];
    
    for (const sub of commonSubdomains) {
      const subdomain = `${sub}.${domain}`;
      try {
        const { stdout } = await execAsync(`nslookup ${subdomain}`, { timeout: 5000 });
        if (!stdout.includes('NXDOMAIN') && !stdout.includes('can\'t find')) {
          subdomains.push(subdomain);
        }
      } catch (error) {
        // DNS lookup failed
      }
    }

    return subdomains;
  }

  async certificateSubdomainDiscovery(domain) {
    try {
      const response = await axios.get(`https://crt.sh/?q=${domain}&output=json`, {
        timeout: 10000
      });

      const subdomains = new Set();
      
      if (Array.isArray(response.data)) {
        response.data.forEach(cert => {
          if (cert.name_value) {
            const names = cert.name_value.split('\n');
            names.forEach(name => {
              if (name.includes(domain) && !name.startsWith('*')) {
                subdomains.add(name.trim());
              }
            });
          }
        });
      }

      return Array.from(subdomains);
    } catch (error) {
      console.warn('Certificate transparency lookup failed:', error.message);
      return [];
    }
  }

  async wordlistSubdomainDiscovery(domain, options = {}) {
    const wordlist = options.wordlist || [
      'admin', 'administrator', 'api', 'app', 'apps', 'auth', 'backup',
      'beta', 'blog', 'cdn', 'chat', 'cms', 'code', 'connect', 'console',
      'cpanel', 'dashboard', 'data', 'db', 'demo', 'dev', 'developer',
      'docs', 'download', 'email', 'ftp', 'git', 'help', 'home', 'host',
      'images', 'internal', 'intranet', 'lab', 'login', 'mail', 'manage',
      'mobile', 'monitor', 'news', 'old', 'panel', 'portal', 'private',
      'prod', 'production', 'public', 'secure', 'server', 'service',
      'shop', 'site', 'stage', 'staging', 'static', 'stats', 'status',
      'store', 'support', 'test', 'testing', 'tools', 'upload', 'user',
      'users', 'video', 'web', 'webmail', 'wiki', 'www'
    ];

    const subdomains = [];
    const maxConcurrent = options.maxConcurrent || 10;

    for (let i = 0; i < wordlist.length; i += maxConcurrent) {
      const batch = wordlist.slice(i, i + maxConcurrent);
      const promises = batch.map(async (word) => {
        const subdomain = `${word}.${domain}`;
        const isAlive = await this.checkSubdomainAlive(subdomain);
        return isAlive ? subdomain : null;
      });

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          subdomains.push(result.value);
        }
      });
    }

    return subdomains;
  }

  async checkSubdomainAlive(subdomain) {
    try {
      const response = await axios.get(`http://${subdomain}`, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: () => true // Accept any status code
      });
      return response.status < 500;
    } catch (error) {
      try {
        const response = await axios.get(`https://${subdomain}`, {
          timeout: 5000,
          maxRedirects: 5,
          validateStatus: () => true
        });
        return response.status < 500;
      } catch (httpsError) {
        return false;
      }
    }
  }

  async enumerateDNS(domain, options = {}) {
    const recordTypes = options.recordTypes || ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
    const dnsRecords = {};

    console.log(`🔍 DNS enumeration for ${domain}`);

    for (const recordType of recordTypes) {
      try {
        const { stdout } = await execAsync(`nslookup -type=${recordType} ${domain}`, { timeout: 5000 });
        dnsRecords[recordType] = this.parseDNSOutput(stdout, recordType);
      } catch (error) {
        dnsRecords[recordType] = { error: error.message };
      }
    }

    return {
      success: true,
      domain,
      records: dnsRecords,
      timestamp: new Date().toISOString()
    };
  }

  parseDNSOutput(output, recordType) {
    const lines = output.split('\n');
    const records = [];

    for (const line of lines) {
      if (line.includes(recordType) || (recordType === 'A' && /\d+\.\d+\.\d+\.\d+/.test(line))) {
        records.push(line.trim());
      }
    }

    return records;
  }

  async whoisLookup(domain) {
    try {
      const { stdout } = await execAsync(`whois ${domain}`, { timeout: 10000 });
      
      const whoisData = this.parseWhoisOutput(stdout);
      
      return {
        success: true,
        domain,
        whoisData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  parseWhoisOutput(output) {
    const lines = output.split('\n');
    const data = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key && value) {
          data[key.trim().toLowerCase()] = value;
        }
      }
    }

    return data;
  }

  async analyzeSSL(domain, port = 443) {
    try {
      const response = await axios.get(`https://api.ssllabs.com/api/v3/analyze?host=${domain}&publish=off&startNew=on&all=done`, {
        timeout: 30000
      });

      return {
        success: true,
        domain,
        port,
        sslAnalysis: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async detectServices(target, options = {}) {
    const portScanResult = await this.portScan(target, options);
    
    if (!portScanResult.success) {
      return portScanResult;
    }

    const detailedServices = [];

    for (const serviceInfo of portScanResult.services) {
      const serviceDetails = await this.probeService(target, serviceInfo.port, serviceInfo.service);
      detailedServices.push({
        ...serviceInfo,
        ...serviceDetails
      });
    }

    return {
      success: true,
      target,
      services: detailedServices,
      totalServices: detailedServices.length,
      timestamp: new Date().toISOString()
    };
  }

  async probeService(host, port, service) {
    const details = { version: 'unknown', banner: '', additional: {} };

    try {
      if (service === 'HTTP' || service === 'HTTPS') {
        const protocol = service === 'HTTPS' ? 'https' : 'http';
        const response = await axios.get(`${protocol}://${host}:${port}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        details.banner = response.headers.server || '';
        details.additional = {
          statusCode: response.status,
          headers: response.headers,
          title: this.extractTitle(response.data)
        };
      }
    } catch (error) {
      details.error = error.message;
    }

    return details;
  }

  extractTitle(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  async mapNetwork(target, options = {}) {
    console.log(`🗺️ Mapping network for ${target}`);

    const networkMap = {
      target,
      hosts: [],
      services: [],
      topology: {}
    };

    // Discover live hosts
    const hosts = await this.discoverHosts(target, options);
    networkMap.hosts = hosts;

    // Scan services on discovered hosts
    for (const host of hosts.slice(0, options.maxHosts || 10)) {
      const services = await this.portScan(host, { ports: '1-1000' });
      if (services.success) {
        networkMap.services.push({
          host,
          ports: services.ports,
          services: services.services
        });
      }
    }

    return {
      success: true,
      networkMap,
      timestamp: new Date().toISOString()
    };
  }

  async discoverHosts(target, options = {}) {
    // Simple ping sweep for network discovery
    const hosts = [];
    
    try {
      // Extract network range from target
      const baseIP = target.split('.').slice(0, 3).join('.');
      const promises = [];

      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        promises.push(this.pingHost(ip));
      }

      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          hosts.push(`${baseIP}.${index + 1}`);
        }
      });

    } catch (error) {
      console.warn('Host discovery failed:', error.message);
    }

    return hosts;
  }

  async pingHost(host) {
    try {
      const { stdout } = await execAsync(`ping -c 1 -W 1 ${host}`, { timeout: 2000 });
      return stdout.includes('1 received') || stdout.includes('1 packets received');
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: 'network-recon',
      status: 'active',
      capabilities: this.capabilities
    };
  }
}