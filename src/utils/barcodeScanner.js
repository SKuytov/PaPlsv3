// Audio Context for generating beeps without external files
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playBeep = (type = 'success') => {
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'success') {
      // High pitched short beep for success
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'error') {
      // Low pitched double buzz for error
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'warning') {
      // Medium pitch for warnings
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export class BarcodeScanner {
  constructor(onScan) {
    this.onScan = onScan;
    this.buffer = '';
    this.lastKeyTime = Date.now();
    this.scannerTimeout = 50; // ms between keystrokes - USB scanners are fast
  }

  handleKeyPress = (event) => {
    // Ignore input into form fields to prevent double scanning or typing garbage
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }

    const currentTime = Date.now();
    
    // Reset buffer if typing too slow (manual entry prevention)
    if (currentTime - this.lastKeyTime > this.scannerTimeout) {
      this.buffer = '';
    }
    
    this.lastKeyTime = currentTime;

    // Enter key usually triggers the end of barcode sequence
    if (event.key === 'Enter') {
      if (this.buffer.length > 1) { // Filter out accidental single enters
        this.onScan(this.buffer);
        this.buffer = '';
      }
      // event.preventDefault(); // Optional: prevent default if causing issues
      return;
    }

    // Accumulate characters (numbers and letters)
    if (event.key.length === 1) {
      this.buffer += event.key;
    }
  };

  start() {
    document.addEventListener('keydown', this.handleKeyPress);
  }

  stop() {
    document.removeEventListener('keydown', this.handleKeyPress);
  }
}