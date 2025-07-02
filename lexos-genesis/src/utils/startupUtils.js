/**
 * Startup utilities for LexOS
 * Handles startup sounds, welcome messages, and initial setup
 */

export class StartupUtils {
  constructor() {
    this.audioContext = null;
    this.hasPlayedStartupSound = false;
  }

  /**
   * Play startup sound
   */
  async playStartupSound() {
    if (this.hasPlayedStartupSound) return;
    
    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Generate a pleasant startup chime
      const duration = 0.8;
      const currentTime = this.audioContext.currentTime;

      // Create oscillators for harmonious sound
      const oscillators = [
        { freq: 523.25, gain: 0.3 }, // C5
        { freq: 659.25, gain: 0.2 }, // E5
        { freq: 783.99, gain: 0.2 }, // G5
        { freq: 1046.50, gain: 0.1 } // C6
      ];

      oscillators.forEach((osc, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.frequency.value = osc.freq;
        oscillator.type = 'sine';

        // Envelope
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(osc.gain, currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

        // Connect
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Play with slight delay for arpeggio effect
        oscillator.start(currentTime + index * 0.05);
        oscillator.stop(currentTime + duration);
      });

      this.hasPlayedStartupSound = true;
    } catch (error) {
      console.log('Could not play startup sound:', error);
    }
  }

  /**
   * Get personalized welcome message
   */
  getWelcomeMessage(username) {
    const hour = new Date().getHours();
    let greeting;

    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    const messages = [
      `${greeting}, ${username}! Welcome back to LexOS.`,
      `${greeting}, ${username}! Ready to be productive today?`,
      `${greeting}, ${username}! Your cloud desktop is ready.`,
      `${greeting}, ${username}! All systems are operational.`,
      `${greeting}, ${username}! Let's create something amazing today.`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Show system ready notification
   */
  showSystemReadyNotification(username) {
    // Check if browser supports notifications
    if ('Notification' in window) {
      // Request permission if not granted
      if (Notification.permission === 'granted') {
        this.createNotification(username);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.createNotification(username);
          }
        });
      }
    }
  }

  /**
   * Create system ready notification
   */
  createNotification(username) {
    const notification = new Notification('LexOS is Ready', {
      body: this.getWelcomeMessage(username),
      icon: '/lexos-logo.png',
      badge: '/lexos-badge.png',
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  /**
   * Run performance optimization checks
   */
  async performanceCheck() {
    const checks = {
      browserCompatibility: this.checkBrowserCompatibility(),
      hardwareAcceleration: this.checkHardwareAcceleration(),
      networkSpeed: await this.checkNetworkSpeed(),
      localStorage: this.checkLocalStorage()
    };

    const issues = [];
    
    if (!checks.browserCompatibility.supported) {
      issues.push('Your browser may not support all LexOS features. Consider updating to the latest version.');
    }

    if (!checks.hardwareAcceleration) {
      issues.push('Hardware acceleration is disabled. Enable it in your browser settings for better performance.');
    }

    if (checks.networkSpeed < 1) {
      issues.push('Slow network connection detected. Some features may load slowly.');
    }

    if (!checks.localStorage) {
      issues.push('Local storage is not available. Some preferences may not be saved.');
    }

    return {
      checks,
      issues,
      overallScore: this.calculatePerformanceScore(checks)
    };
  }

  /**
   * Check browser compatibility
   */
  checkBrowserCompatibility() {
    const requiredFeatures = [
      'WebSocket' in window,
      'requestAnimationFrame' in window,
      'localStorage' in window,
      'Worker' in window,
      'Promise' in window,
      'fetch' in window
    ];

    const supported = requiredFeatures.every(feature => feature);
    
    return {
      supported,
      features: {
        webSocket: 'WebSocket' in window,
        animationFrame: 'requestAnimationFrame' in window,
        localStorage: 'localStorage' in window,
        webWorkers: 'Worker' in window,
        promises: 'Promise' in window,
        fetch: 'fetch' in window
      }
    };
  }

  /**
   * Check hardware acceleration
   */
  checkHardwareAcceleration() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  }

  /**
   * Check network speed
   */
  async checkNetworkSpeed() {
    try {
      const startTime = performance.now();
      const response = await fetch('/api/health', { method: 'HEAD' });
      const endTime = performance.now();
      
      const latency = endTime - startTime;
      // Rough estimate of speed based on latency
      if (latency < 100) return 5; // Excellent
      if (latency < 300) return 4; // Good
      if (latency < 500) return 3; // Fair
      if (latency < 1000) return 2; // Poor
      return 1; // Very poor
    } catch (error) {
      return 0; // No connection
    }
  }

  /**
   * Check local storage availability
   */
  checkLocalStorage() {
    try {
      const test = '__lexos_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(checks) {
    let score = 0;
    let total = 0;

    if (checks.browserCompatibility.supported) score += 25;
    total += 25;

    if (checks.hardwareAcceleration) score += 25;
    total += 25;

    score += (checks.networkSpeed / 5) * 25;
    total += 25;

    if (checks.localStorage) score += 25;
    total += 25;

    return Math.round((score / total) * 100);
  }

  /**
   * Initialize startup sequence
   */
  async initialize(username = 'User') {
    // Play startup sound
    await this.playStartupSound();

    // Show welcome notification
    this.showSystemReadyNotification(username);

    // Run performance checks
    const performance = await this.performanceCheck();

    return {
      welcomeMessage: this.getWelcomeMessage(username),
      performance
    };
  }
}

// Export singleton instance
export default new StartupUtils();