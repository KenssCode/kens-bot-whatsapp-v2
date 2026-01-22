const config = require('../config/config');

/**
 * Generate random ID
 */
function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate fee
 */
function calculateFee(amount, percentage = null) {
  const feePercentage = percentage || config.feePercentage;
  return Math.ceil(amount * (feePercentage / 100));
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('id-ID', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get formatted time
 */
function getFormattedTime() {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get formatted date
 */
function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Check if user is admin in group
 */
function isAdmin(participant, groupMetadata) {
  if (!participant || !groupMetadata) return false;
  
  const adminList = groupMetadata.participants
    .filter(p => p.admin)
    .map(p => p.id);
  
  return adminList.includes(participant);
}

/**
 * Get all admins in group
 */
function getAdmins(groupMetadata) {
  if (!groupMetadata) return [];
  
  return groupMetadata.participants
    .filter(p => p.admin)
    .map(p => p);
}

/**
 * Get all members (non-admin) in group
 */
function getMembers(groupMetadata) {
  if (!groupMetadata) return [];
  
  return groupMetadata.participants
    .filter(p => !p.admin)
    .map(p => p);
}

/**
 * Get user mention text
 */
function getMentionText(userJids) {
  return userJids.map(jid => `@${jid.split('@')[0]}`).join(' ');
}

/**
 * Get user mention string for sending
 */
function mentions(sock, jids) {
  return jids.map(jid => sock.decodeJid(jid));
}

/**
 * Parse command and arguments from message
 */
function parseCommand(text) {
  const trimmedText = text.trim();
  const prefix = config.commandPrefix;
  
  if (!trimmedText.startsWith(prefix)) {
    return { command: null, args: [] };
  }
  
  const parts = trimmedText.slice(prefix.length).split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  return { command, args };
}

/**
 * Clean phone number
 */
function cleanPhoneNumber(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned + '@s.whatsapp.net';
}

/**
 * Check if JID is group
 */
function isGroupJid(jid) {
  return jid.endsWith('@g.us');
}

/**
 * Check if JID is broadcast
 */
function isBroadcastJid(jid) {
  return jid.endsWith('@broadcast');
}

/**
 * Sleep/wait function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text
 */
function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get random array item
 */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array
 */
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create error message
 */
function createErrorMessage(error) {
  const errorMessage = error.message || 'Unknown error';
  return `❌ Terjadi kesalahan: ${errorMessage}`;
}

/**
 * Create success message
 */
function createSuccessMessage(message) {
  return `✅ ${message}`;
}

/**
 * Create info message
 */
function createInfoMessage(message) {
  return `ℹ️ ${message}`;
}

/**
 * Create warning message
 */
function createWarningMessage(message) {
  return `⚠️ ${message}`;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Check if user is bot
 */
function isBotJid(jid) {
  return jid === config.sessionName + '@s.whatsapp.net' ||
         jid.includes('bot');
}

module.exports = {
  generateId,
  formatCurrency,
  calculateFee,
  formatTimestamp,
  getFormattedTime,
  getFormattedDate,
  isAdmin,
  getAdmins,
  getMembers,
  getMentionText,
  mentions,
  parseCommand,
  cleanPhoneNumber,
  isGroupJid,
  isBroadcastJid,
  sleep,
  truncate,
  randomItem,
  shuffleArray,
  debounce,
  createErrorMessage,
  createSuccessMessage,
  createInfoMessage,
  createWarningMessage,
  capitalize,
  isBotJid
};

