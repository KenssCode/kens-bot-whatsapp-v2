/**
 * Konfigurasi Bot WhatsApp
 * Load dari environment variables dengan default values
 */

require('dotenv').config();

module.exports = {
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Session
  sessionName: process.env.SESSION_NAME || 'bot-jualbeli',
  
  // Command Prefix
  commandPrefix: process.env.COMMAND_PREFIX || '.',
  
  // Fee Rekber dalam persentase
  feePercentage: parseFloat(process.env.FEE_PERCENTAGE) || 1,
  
  // Nama Grup
  groupName: process.env.GROUP_NAME || 'Jual Beli',
  
  // Log Level
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Auto-reconnect
  autoReconnect: true,
  
  // Restart timeout (ms)
  restartTimeout: 5000,
};

