// Polyfill for crypto in Node.js test environment
const crypto = require('crypto');

// Make crypto available globally for ECPair
if (!globalThis.crypto) {
  globalThis.crypto = {
    getRandomValues: (arr) => {
      const bytes = crypto.randomBytes(arr.length);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = bytes[i];
      }
      return arr;
    },
  };
}

// Also add to global for older Node versions
if (!global.crypto) {
  global.crypto = globalThis.crypto;
}