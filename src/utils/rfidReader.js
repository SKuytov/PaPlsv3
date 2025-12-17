/**
 * RFID Reader Utility
 * Handles USB RFID readers that emulate keyboard input
 * 
 * Most cheap USB RFID readers work as keyboard wedges:
 * - Focus on input field
 * - Type card ID
 * - End with Enter (\n) or Tab
 * 
 * No external library needed - just DOM event listeners
 */

class RFIDReader {
  constructor(options = {}) {
    this.buffer = '';
    this.timeoutMs = options.timeoutMs || 100; // Wait between chars
    this.minLength = options.minLength || 8; // Min RFID length
    this.maxLength = options.maxLength || 50; // Max RFID length
    this.prefixChar = options.prefixChar || null; // Some readers prefix with ^, STX, etc
    this.suffixChar = options.suffixChar || null; // Some readers end with ^, ETX, CR
    this.clearOnRead = options.clearOnRead !== false; // Clear buffer after read
    this.timeoutRef = null;
    this.listeners = [];
  }

  /**
   * Initialize RFID reader - attach keyboard listener
   * @param {Function} onCardRead - Callback when card read successfully
   * @param {Function} onError - Callback on error
   */
  init(onCardRead, onError) {
    this.onCardRead = onCardRead;
    this.onError = onError;
    
    // Attach global keyboard listener
    this.keydownHandler = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.keydownHandler);
    
    console.log('✅ RFID Reader initialized');
    return this;
  }

  /**
   * Core keyboard handler
   * Accumulates chars and processes when Enter/Tab pressed
   */
  handleKeydown(event) {
    // Ignore meta keys, modifiers
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    
    // Enter or Tab signals end of RFID read
    if (event.code === 'Enter' || event.code === 'Tab') {
      event.preventDefault();
      this.processBuffer();
      return;
    }

    // Printable character
    if (event.key && event.key.length === 1) {
      event.preventDefault(); // Prevent default input behavior
      this.addChar(event.key);
      return;
    }

    // Allow backspace for correction (optional)
    if (event.code === 'Backspace' && this.buffer.length > 0) {
      event.preventDefault();
      this.buffer = this.buffer.slice(0, -1);
      console.log(`[RFID] Buffer: ${this.buffer}`);
      return;
    }
  }

  /**
   * Add character to buffer
   */
  addChar(char) {
    // Prevent buffer overflow
    if (this.buffer.length >= this.maxLength) {
      console.warn('[RFID] Buffer max length reached');
      return;
    }

    this.buffer += char;
    console.log(`[RFID] Buffer: ${this.buffer}`);

    // Reset timeout for buffer (in case of slow reader)
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
    
    this.timeoutRef = setTimeout(() => {
      if (this.buffer.length > 0) {
        console.warn('[RFID] Timeout - processing incomplete buffer');
        this.processBuffer();
      }
    }, this.timeoutMs);
  }

  /**
   * Process accumulated buffer
   * Validate format, clean up, trigger callback
   */
  processBuffer() {
    if (this.timeoutRef) clearTimeout(this.timeoutRef);

    let cardId = this.buffer.trim();

    // Remove prefix if configured
    if (this.prefixChar && cardId.startsWith(this.prefixChar)) {
      cardId = cardId.substring(1);
    }

    // Remove suffix if configured
    if (this.suffixChar && cardId.endsWith(this.suffixChar)) {
      cardId = cardId.substring(0, cardId.length - 1);
    }

    // Validate length
    if (cardId.length < this.minLength) {
      console.warn(`[RFID] Card ID too short: ${cardId}`);
      if (this.onError) {
        this.onError(new Error(`Card ID too short. Expected >= ${this.minLength} chars, got ${cardId.length}`));
      }
      this.buffer = '';
      return;
    }

    if (cardId.length > this.maxLength) {
      console.warn(`[RFID] Card ID too long: ${cardId}`);
      if (this.onError) {
        this.onError(new Error(`Card ID too long. Expected <= ${this.maxLength} chars, got ${cardId.length}`));
      }
      this.buffer = '';
      return;
    }

    // Success
    console.log(`✅ [RFID] Card read: ${cardId}`);
    if (this.onCardRead) {
      this.onCardRead(cardId);
    }

    // Clear buffer for next read
    if (this.clearOnRead) {
      this.buffer = '';
    }
  }

  /**
   * Destroy listener
   */
  destroy() {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
    console.log('✅ RFID Reader destroyed');
  }

  /**
   * Get current buffer state (for testing)
   */
  getBuffer() {
    return this.buffer;
  }
}

export default RFIDReader;
