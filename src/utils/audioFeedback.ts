// Audio feedback utility for notification sounds and haptic feedback

interface AudioConfig {
  volume: number;
  enabled: boolean;
}

interface HapticConfig {
  enabled: boolean;
  pattern?: number[];
}

class AudioFeedback {
  private audioContext: AudioContext | null = null;
  private config: AudioConfig = {
    volume: 0.5,
    enabled: true
  };
  private hapticConfig: HapticConfig = {
    enabled: true
  };

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      window.addEventListener('click', this.initAudioContext.bind(this), { once: true });
      window.addEventListener('keydown', this.initAudioContext.bind(this), { once: true });
    }
  }

  private initAudioContext() {
    if (!this.audioContext && typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }

  setConfig(config: Partial<AudioConfig>) {
    this.config = { ...this.config, ...config };
  }

  setHapticConfig(config: Partial<HapticConfig>) {
    this.hapticConfig = { ...this.hapticConfig, ...config };
  }

  // Generate different types of notification sounds
  private createOscillator(frequency: number, type: OscillatorType = 'sine'): OscillatorNode | null {
    if (!this.audioContext) return null;
    
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    return oscillator;
  }

  private createGainNode(gain: number = 0.1): GainNode | null {
    if (!this.audioContext) return null;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(gain * this.config.volume, this.audioContext.currentTime);
    
    return gainNode;
  }

  // Success sound - rising tone
  playSuccess() {
    if (!this.config.enabled || !this.audioContext) return;
    
    const oscillator = this.createOscillator(400);
    const gainNode = this.createGainNode(0.1);
    
    if (!oscillator || !gainNode) return;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Create rising tone effect
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
    
    this.triggerHaptic('success');
  }

  // Error sound - descending tone
  playError() {
    if (!this.config.enabled || !this.audioContext) return;
    
    const oscillator = this.createOscillator(500, 'square');
    const gainNode = this.createGainNode(0.08);
    
    if (!oscillator || !gainNode) return;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Create descending tone effect
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
    
    this.triggerHaptic('error');
  }

  // Notification sound - gentle ping
  playNotification() {
    if (!this.config.enabled || !this.audioContext) return;
    
    const oscillator = this.createOscillator(800);
    const gainNode = this.createGainNode(0.05);
    
    if (!oscillator || !gainNode) return;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Quick fade in and out
    gainNode.gain.exponentialRampToValueAtTime(0.1 * this.config.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.15);
    
    this.triggerHaptic('notification');
  }

  // Click sound - short tick
  playClick() {
    if (!this.config.enabled || !this.audioContext) return;
    
    const oscillator = this.createOscillator(1000, 'sine');
    const gainNode = this.createGainNode(0.03);
    
    if (!oscillator || !gainNode) return;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.05);
    
    this.triggerHaptic('click');
  }

  // Hover sound - subtle woosh
  playHover() {
    if (!this.config.enabled || !this.audioContext) return;
    
    const oscillator = this.createOscillator(200);
    const gainNode = this.createGainNode(0.02);
    
    if (!oscillator || !gainNode) return;
    
    // Create filter for a softer sound
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // Warning sound - pulsing tone
  playWarning() {
    if (!this.config.enabled || !this.audioContext) return;
    
    const oscillator = this.createOscillator(440, 'triangle');
    const gainNode = this.createGainNode(0);
    
    if (!oscillator || !gainNode) return;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Create pulsing effect
    const pulseTime = 0.1;
    for (let i = 0; i < 3; i++) {
      const startTime = this.audioContext.currentTime + (i * pulseTime * 2);
      gainNode.gain.setValueAtTime(0.08 * this.config.volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + pulseTime);
    }
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.6);
    
    this.triggerHaptic('warning');
  }

  // Haptic feedback
  private triggerHaptic(type: 'success' | 'error' | 'notification' | 'click' | 'warning') {
    if (!this.hapticConfig.enabled || !('vibrate' in navigator)) return;
    
    const patterns = {
      success: [50],
      error: [100, 50, 100],
      notification: [30],
      click: [10],
      warning: [50, 30, 50, 30, 50]
    };
    
    const pattern = this.hapticConfig.pattern || patterns[type];
    navigator.vibrate(pattern);
  }

  // Stop all haptic feedback
  stopHaptic() {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }
}

// Create singleton instance
export const audioFeedback = new AudioFeedback();

// React hook for audio feedback
export function useAudioFeedback() {
  return {
    playSuccess: () => audioFeedback.playSuccess(),
    playError: () => audioFeedback.playError(),
    playNotification: () => audioFeedback.playNotification(),
    playClick: () => audioFeedback.playClick(),
    playHover: () => audioFeedback.playHover(),
    playWarning: () => audioFeedback.playWarning(),
    setConfig: (config: Partial<AudioConfig>) => audioFeedback.setConfig(config),
    setHapticConfig: (config: Partial<HapticConfig>) => audioFeedback.setHapticConfig(config)
  };
}