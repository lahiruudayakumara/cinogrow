// Polyfills for React Native 0.81.5 and Expo SDK 54 compatibility
// Ensure this file is imported before any other imports

// Suppress frequent undefined function errors during development
const originalError = console.error;
const originalWarn = console.warn;

console.error = function(...args) {
  const message = args.join(' ');
  if (message.includes('undefined is not a function') || 
      message.includes('clearTimeout called with an invalid handle') ||
      message.includes('TurboModule')) {
    console.warn('Polyfill suppressed error:', ...args);
    return;
  }
  originalError.apply(console, args);
};

// Enhanced timeout/interval handling for React Native 0.81.5
const timeoutMap = new WeakMap();
const intervalMap = new WeakMap();

const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

global.setTimeout = function(callback, delay, ...args) {
  if (typeof callback !== 'function') {
    originalWarn('setTimeout called with non-function callback');
    return null;
  }
  
  const wrappedCallback = function() {
    try {
      callback.apply(this, args);
    } catch (error) {
      console.warn('Error in setTimeout callback:', error);
    }
  };
  
  return originalSetTimeout(wrappedCallback, delay || 0);
};

global.clearTimeout = function(timeoutId) {
  if (timeoutId === null || timeoutId === undefined) {
    return;
  }
  
  try {
    originalClearTimeout(timeoutId);
  } catch (error) {
    // Silently ignore errors for invalid timeout IDs
  }
};

global.setInterval = function(callback, delay, ...args) {
  if (typeof callback !== 'function') {
    originalWarn('setInterval called with non-function callback');
    return null;
  }
  
  const wrappedCallback = function() {
    try {
      callback.apply(this, args);
    } catch (error) {
      console.warn('Error in setInterval callback:', error);
    }
  };
  
  return originalSetInterval(wrappedCallback, delay || 0);
};

global.clearInterval = function(intervalId) {
  if (intervalId === null || intervalId === undefined) {
    return;
  }
  
  try {
    originalClearInterval(intervalId);
  } catch (error) {
    // Silently ignore errors for invalid interval IDs
  }
};

// Enhanced animation frame handling
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = function(callback) {
    if (typeof callback !== 'function') {
      originalWarn('requestAnimationFrame called with non-function callback');
      return null;
    }
    return global.setTimeout(callback, 16); // 60fps fallback
  };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = function(frameId) {
    if (frameId === null || frameId === undefined) {
      return;
    }
    try {
      global.clearTimeout(frameId);
    } catch (error) {
      // Silently ignore errors
    }
  };
} else {
  // Override existing cancelAnimationFrame to handle invalid IDs gracefully
  global.cancelAnimationFrame = function(frameId) {
    if (frameId === null || frameId === undefined) {
      return;
    }
    try {
      originalCancelAnimationFrame(frameId);
    } catch (error) {
      // Silently ignore errors for invalid frame IDs
    }
  };
}

// AbortController polyfill for React Native 0.81.5
if (typeof global.AbortController === 'undefined') {
  class AbortControllerPolyfill {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: function(type, listener) {
          if (type === 'abort' && !this.aborted && typeof listener === 'function') {
            this._abortListeners = this._abortListeners || [];
            this._abortListeners.push(listener);
          }
        },
        removeEventListener: function(type, listener) {
          if (type === 'abort' && this._abortListeners) {
            const index = this._abortListeners.indexOf(listener);
            if (index > -1) {
              this._abortListeners.splice(index, 1);
            }
          }
        },
        dispatchEvent: function(event) {
          if (event.type === 'abort' && this._abortListeners) {
            this._abortListeners.forEach(listener => {
              try {
                listener(event);
              } catch (error) {
                console.warn('Error in abort listener:', error);
              }
            });
          }
        },
        onabort: null,
      };
    }
    
    abort() {
      if (!this.signal.aborted) {
        this.signal.aborted = true;
        const event = { type: 'abort', target: this.signal };
        
        if (typeof this.signal.onabort === 'function') {
          try {
            this.signal.onabort(event);
          } catch (error) {
            console.warn('Error in onabort handler:', error);
          }
        }
        
        this.signal.dispatchEvent(event);
      }
    }
  }
  
  global.AbortController = AbortControllerPolyfill;
}

// Promise polyfills for React Native 0.81.5
if (global.Promise && !global.Promise.allSettled) {
  global.Promise.allSettled = function(promises) {
    return Promise.all(promises.map(promise => 
      Promise.resolve(promise)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    ));
  };
}

// TurboModule fallback for development
if (typeof global.nativeFabricUIManager === 'undefined') {
  global.nativeFabricUIManager = null;
}

// React Native 0.81.5 specific polyfills
if (typeof global.__fbBatchedBridge === 'undefined') {
  global.__fbBatchedBridge = null;
}

console.log('✅ React Native 0.81.5 compatible polyfills loaded');