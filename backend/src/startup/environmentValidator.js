/**
 * Environment Variable Validation Module
 * Validates critical environment variables before backend startup
 */

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    
    // Define weak/default values that should not be used in production
    this.weakValues = [
      'CHANGE_THIS_TO_SECURE_RANDOM_STRING_MIN_32_CHARS_PRODUCTION',
      'CHANGE_THIS_TO_SECURE_SESSION_SECRET_MIN_32_CHARS_PRODUCTION',
      'NEXUS_ADMIN_CHANGE_IMMEDIATELY',
      'NEXUS_OPERATOR_CHANGE_IMMEDIATELY',
      'lexos-genesis-secret-key-change-in-production',
      'your-secure-jwt-secret-minimum-32-characters',
      'your-secure-session-secret-minimum-32-characters',
      'change-this-secure-password',
      'NEXUS_GENESIS_QUANTUM_SECURE_JWT_SECRET_V2024_CHANGE_IN_PRODUCTION_DEPLOYMENT',
      'NEXUS_ADMIN_SECURE_2024',
      'NEXUS_OPERATOR_SECURE_2024'
    ];
  }

  /**
   * Validate all critical environment variables
   */
  validateAll() {
    this.errors = [];
    this.warnings = [];

    // Critical environment variables
    this.validateJwtSecret();
    this.validateSessionSecret();
    this.validateAdminPassword();
    this.validateOperatorPassword();
    this.validateDatabaseUrl();
    
    // Additional security checks
    this.validateNodeEnv();
    this.validateAuthSettings();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validate JWT_SECRET
   */
  validateJwtSecret() {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      this.errors.push('JWT_SECRET environment variable is required');
      return;
    }
    
    if (this.weakValues.includes(jwtSecret)) {
      this.errors.push('JWT_SECRET is set to a default/weak value. Please change it to a secure random string.');
      return;
    }
    
    if (jwtSecret.length < 32) {
      this.errors.push('JWT_SECRET must be at least 32 characters long');
      return;
    }
    
    // Check for simple patterns that might indicate weak secrets
    if (/^[a-zA-Z0-9]{32}$/.test(jwtSecret) && /^(.)\1+$/.test(jwtSecret)) {
      this.warnings.push('JWT_SECRET appears to use a simple pattern. Consider using a more complex secret.');
    }
  }

  /**
   * Validate SESSION_SECRET
   */
  validateSessionSecret() {
    const sessionSecret = process.env.SESSION_SECRET;
    
    if (!sessionSecret) {
      this.errors.push('SESSION_SECRET environment variable is required');
      return;
    }
    
    if (this.weakValues.includes(sessionSecret)) {
      this.errors.push('SESSION_SECRET is set to a default/weak value. Please change it to a secure random string.');
      return;
    }
    
    if (sessionSecret.length < 32) {
      this.errors.push('SESSION_SECRET must be at least 32 characters long');
      return;
    }
  }

  /**
   * Validate ADMIN_PASSWORD
   */
  validateAdminPassword() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      this.errors.push('ADMIN_PASSWORD environment variable is required');
      return;
    }
    
    if (this.weakValues.includes(adminPassword)) {
      this.errors.push('ADMIN_PASSWORD is set to a default/weak value. Please change it to a secure password.');
      return;
    }
    
    if (adminPassword.length < 12) {
      this.errors.push('ADMIN_PASSWORD must be at least 12 characters long');
      return;
    }
    
    // Basic password complexity check
    const hasUpper = /[A-Z]/.test(adminPassword);
    const hasLower = /[a-z]/.test(adminPassword);
    const hasNumber = /\d/.test(adminPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(adminPassword);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      this.warnings.push('ADMIN_PASSWORD should contain uppercase, lowercase, numbers, and special characters for better security');
    }
  }

  /**
   * Validate OPERATOR_PASSWORD
   */
  validateOperatorPassword() {
    const operatorPassword = process.env.OPERATOR_PASSWORD;
    
    if (!operatorPassword) {
      this.errors.push('OPERATOR_PASSWORD environment variable is required');
      return;
    }
    
    if (this.weakValues.includes(operatorPassword)) {
      this.errors.push('OPERATOR_PASSWORD is set to a default/weak value. Please change it to a secure password.');
      return;
    }
    
    if (operatorPassword.length < 12) {
      this.errors.push('OPERATOR_PASSWORD must be at least 12 characters long');
      return;
    }
    
    // Basic password complexity check
    const hasUpper = /[A-Z]/.test(operatorPassword);
    const hasLower = /[a-z]/.test(operatorPassword);
    const hasNumber = /\d/.test(operatorPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(operatorPassword);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      this.warnings.push('OPERATOR_PASSWORD should contain uppercase, lowercase, numbers, and special characters for better security');
    }
  }

  /**
   * Validate DATABASE_URL (optional, since app can use SQLite)
   */
  validateDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    
    // DATABASE_URL is optional since the app can use SQLite
    if (!databaseUrl) {
      this.warnings.push('DATABASE_URL not set, using SQLite database');
      return;
    }
    
    // Basic URL validation
    try {
      const url = new URL(databaseUrl);
      if (!['postgresql:', 'postgres:', 'mysql:', 'sqlite:'].includes(url.protocol)) {
        this.warnings.push('DATABASE_URL protocol should be postgresql:, postgres:, mysql:, or sqlite:');
      }
    } catch (error) {
      this.errors.push('DATABASE_URL is not a valid URL format');
    }
  }

  /**
   * Validate NODE_ENV
   */
  validateNodeEnv() {
    const nodeEnv = process.env.NODE_ENV;
    
    if (!nodeEnv) {
      this.warnings.push('NODE_ENV not set, defaulting to development mode');
      return;
    }
    
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
      this.warnings.push('NODE_ENV should be "development", "production", or "test"');
    }
    
    // Production-specific checks
    if (nodeEnv === 'production') {
      if (process.env.DISABLE_AUTH === 'true') {
        this.errors.push('DISABLE_AUTH cannot be true in production environment');
      }
    }
  }

  /**
   * Validate authentication settings
   */
  validateAuthSettings() {
    // Check if auth is disabled inappropriately
    if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV === 'production') {
      this.errors.push('Authentication cannot be disabled in production environment');
    }
    
    // Check JWT expiry
    const jwtExpiry = process.env.JWT_EXPIRY;
    if (jwtExpiry) {
      // Basic validation of JWT expiry format
      if (!/^\d+[smhd]$/.test(jwtExpiry)) {
        this.warnings.push('JWT_EXPIRY format should be like "24h", "30m", "7d", etc.');
      }
    }
  }

  /**
   * Get a formatted error message for logging
   */
  getFormattedErrorMessage() {
    if (this.errors.length === 0) {
      return null;
    }
    
    let message = '❌ Backend startup failed due to environment configuration errors:\n\n';
    
    this.errors.forEach((error, index) => {
      message += `${index + 1}. ${error}\n`;
    });
    
    message += '\n💡 To fix these issues:\n';
    message += '   • Copy .env.example to .env and update with secure values\n';
    message += '   • Generate secure secrets using: openssl rand -base64 32\n';
    message += '   • Set strong passwords for admin and operator accounts\n';
    message += '   • Ensure all environment variables are properly configured\n';
    
    if (this.warnings.length > 0) {
      message += '\n⚠️  Warnings:\n';
      this.warnings.forEach((warning, index) => {
        message += `${index + 1}. ${warning}\n`;
      });
    }
    
    return message;
  }

  /**
   * Log validation results
   */
  logResults() {
    const result = this.validateAll();
    
    if (result.isValid) {
      console.log('✅ Environment validation passed');
      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`   • ${warning}`));
      }
    } else {
      console.error(this.getFormattedErrorMessage());
    }
    
    return result;
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();
export default environmentValidator;