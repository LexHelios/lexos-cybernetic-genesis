const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const Joi = require('joi');

class ConfigManager {
  constructor() {
    this.config = {};
    this.configPath = path.join(__dirname, '../../config/default.yaml');
    this.envConfigPath = path.join(__dirname, '../../config/production.yaml');
    
    this.loadConfig();
    this.validateConfig();
  }
  
  loadConfig() {
    try {
      // Load default config
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        this.config = yaml.parse(configContent);
      }
      
      // Load environment-specific config if exists
      const env = process.env.NODE_ENV || 'development';
      const envPath = path.join(__dirname, `../../config/${env}.yaml`);
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envConfig = yaml.parse(envContent);
        this.config = this.deepMerge(this.config, envConfig);
      }
      
      // Override with environment variables
      this.applyEnvironmentVariables();
      
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }
  
  validateConfig() {
    // Define configuration schema
    const schema = Joi.object({
      services: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          name: Joi.string().required(),
          url: Joi.string().uri().required(),
          healthEndpoint: Joi.string().required(),
          processName: Joi.string(),
          logFile: Joi.string(),
          restartCommand: Joi.string(),
          checkInterval: Joi.number().min(1000).default(30000),
          timeout: Joi.number().min(100).default(5000),
          retries: Joi.number().min(0).default(3)
        })
      ),
      
      resources: Joi.object({
        cpu: Joi.object({
          warningThreshold: Joi.number().min(0).max(100),
          criticalThreshold: Joi.number().min(0).max(100),
          checkInterval: Joi.number().min(1000)
        }),
        memory: Joi.object({
          warningThreshold: Joi.number().min(0).max(100),
          criticalThreshold: Joi.number().min(0).max(100),
          checkInterval: Joi.number().min(1000)
        }),
        disk: Joi.object({
          warningThreshold: Joi.number().min(0).max(100),
          criticalThreshold: Joi.number().min(0).max(100),
          checkInterval: Joi.number().min(1000),
          paths: Joi.array().items(Joi.string())
        }),
        gpu: Joi.object({
          enabled: Joi.boolean(),
          warningThreshold: Joi.number().min(0).max(100),
          criticalThreshold: Joi.number().min(0).max(100),
          memoryWarningThreshold: Joi.number().min(0).max(100),
          memoryCriticalThreshold: Joi.number().min(0).max(100),
          checkInterval: Joi.number().min(1000)
        })
      }),
      
      database: Joi.object({
        postgresql: Joi.object({
          enabled: Joi.boolean(),
          host: Joi.string(),
          port: Joi.number(),
          database: Joi.string(),
          checkInterval: Joi.number().min(1000),
          connectionTimeout: Joi.number().min(100),
          maxConnections: Joi.number().min(1),
          warningConnections: Joi.number().min(0).max(100)
        }),
        redis: Joi.object({
          enabled: Joi.boolean(),
          host: Joi.string(),
          port: Joi.number(),
          checkInterval: Joi.number().min(1000),
          connectionTimeout: Joi.number().min(100)
        })
      }),
      
      ssl: Joi.object({
        enabled: Joi.boolean(),
        certificates: Joi.array().items(
          Joi.object({
            path: Joi.string().required(),
            warningDays: Joi.number().min(1),
            criticalDays: Joi.number().min(1)
          })
        ),
        checkInterval: Joi.number().min(1000)
      }),
      
      logs: Joi.object({
        errorPatterns: Joi.array().items(Joi.string()),
        warningPatterns: Joi.array().items(Joi.string()),
        scanInterval: Joi.number().min(1000),
        maxFileSize: Joi.number().min(1)
      }),
      
      alerts: Joi.object({
        email: Joi.object({
          enabled: Joi.boolean(),
          smtp: Joi.object({
            host: Joi.string(),
            port: Joi.number(),
            secure: Joi.boolean(),
            auth: Joi.object({
              user: Joi.string(),
              pass: Joi.string()
            })
          }),
          recipients: Joi.array().items(Joi.string().email()),
          from: Joi.string()
        }),
        webhook: Joi.object({
          enabled: Joi.boolean(),
          url: Joi.string().uri()
        }),
        cooldown: Joi.number().min(0)
      }),
      
      recovery: Joi.object({
        enabled: Joi.boolean(),
        actions: Joi.object()
      }),
      
      agent: Joi.object({
        port: Joi.number().port(),
        host: Joi.string(),
        dashboardPath: Joi.string(),
        apiPath: Joi.string(),
        wsPath: Joi.string(),
        authentication: Joi.object({
          enabled: Joi.boolean(),
          username: Joi.string(),
          password: Joi.string()
        }),
        logging: Joi.object({
          level: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose', 'silly'),
          maxFiles: Joi.number().min(1),
          maxSize: Joi.string()
        }),
        metrics: Joi.object({
          retentionDays: Joi.number().min(1),
          aggregationInterval: Joi.number().min(1000)
        })
      }),
      
      network: Joi.object({
        connectivity: Joi.object({
          enabled: Joi.boolean(),
          endpoints: Joi.array().items(
            Joi.object({
              name: Joi.string().required(),
              host: Joi.string(),
              url: Joi.string().uri(),
              type: Joi.string().valid('ping', 'http')
            })
          ),
          checkInterval: Joi.number().min(1000),
          timeout: Joi.number().min(100)
        })
      }),
      
      memoryLeak: Joi.object({
        enabled: Joi.boolean(),
        checkInterval: Joi.number().min(1000),
        growthRateThreshold: Joi.number().min(0),
        samplingPeriods: Joi.number().min(2)
      }),
      
      websocket: Joi.object({
        enabled: Joi.boolean(),
        checkInterval: Joi.number().min(1000),
        reconnectTimeout: Joi.number().min(100),
        maxReconnectAttempts: Joi.number().min(1)
      })
    });
    
    const { error } = schema.validate(this.config);
    if (error) {
      console.error('Configuration validation error:', error.details);
      throw new Error(`Invalid configuration: ${error.message}`);
    }
  }
  
  applyEnvironmentVariables() {
    // Override specific config values with environment variables
    if (process.env.MONITORING_PORT) {
      this.config.agent.port = parseInt(process.env.MONITORING_PORT);
    }
    
    if (process.env.MONITORING_HOST) {
      this.config.agent.host = process.env.MONITORING_HOST;
    }
    
    if (process.env.MONITORING_USERNAME) {
      this.config.agent.authentication.username = process.env.MONITORING_USERNAME;
    }
    
    if (process.env.MONITORING_PASSWORD) {
      this.config.agent.authentication.password = process.env.MONITORING_PASSWORD;
    }
    
    if (process.env.SMTP_USER) {
      this.config.alerts.email.smtp.auth.user = process.env.SMTP_USER;
    }
    
    if (process.env.SMTP_PASS) {
      this.config.alerts.email.smtp.auth.pass = process.env.SMTP_PASS;
    }
    
    if (process.env.DB_USER) {
      this.config.database.postgresql.user = process.env.DB_USER;
    }
    
    if (process.env.DB_PASSWORD) {
      this.config.database.postgresql.password = process.env.DB_PASSWORD;
    }
  }
  
  get(path) {
    if (!path) {
      return this.config;
    }
    
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }
  
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
  
  reload() {
    this.loadConfig();
    this.validateConfig();
  }
  
  save() {
    const yamlStr = yaml.stringify(this.config);
    fs.writeFileSync(this.configPath, yamlStr, 'utf8');
  }
}

module.exports = ConfigManager;