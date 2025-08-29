// Polyfill for crypto in Node.js test environment
const crypto = require('crypto');

// Make crypto available globally for ECPair
global.crypto = {
  getRandomValues: (arr) => crypto.randomBytes(arr.length),
};