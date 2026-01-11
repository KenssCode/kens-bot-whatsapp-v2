/**
 * Bot WhatsApp Jual Beli - Fixed for Railway (ESM Compatible)
 */

const path = require('path');
const fs = require('fs');
const pino = require('pino');

// Load konfigurasi
const config = require('./config/config');
const { loadCommands, executeCommand } = require('./lib/handler');
const { bindSocket } = require('./lib/store');
const { initDatabase, initTables, closeDatabase } = require('./lib/connect');
const { parseCommand } = require('./lib/utils');

// Session directory
const sessionDir = path.join(__dirname, '../sessions'); // Diarahkan ke root agar aman di Railway

/**
 * Inisialisasi socket menggunakan Dynamic Import untuk fix ERR_REQUIRE_ESM
 */
async function initSocket() {
  // Solusi untuk error ERR_REQUIRE_ESM
  const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    makeInMemoryStore 
  } = await import('@whiskeysockets/baileys');

  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys v${version.join('.')} (${isLatest ? 'latest' : 'outdated'})`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      browser: Browsers.ubuntu('Chrome'),
      version,
      getMessage: async (key) => {
        return { conversation: '' }; // Simple placeholder
      }
    });

    bindSocket(sock);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log('Connection closed, reconnecting...');
          setTimeout(() => initSocket(), config.restartTimeout || 5000);
        } else {
          console.log('Authentication failed, please scan QR code again');
        }
      } else if (connection === 'open') {
        console.log('✅ Bot WhatsApp connected successfully!');
        if (config.ownerNumber) {
          await sock.sendMessage(config.ownerNumber.includes('@s.whatsapp.net') ? config.ownerNumber : `${config.ownerNumber}@s.whatsapp.net`, {
            text: '🤖 Bot WhatsApp Jual Beli sudah ONLINE!'
          });
        }
      }
    });

    // Message events
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          if (message.key.fromMe) continue;

          const chatId = message.key.remoteJid;
          const isGroup = chatId.endsWith('@g.us');
          const senderId = message.key.participant || chatId;
          const messageText = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || 
                             '';

          const { command, args } = parseCommand(messageText);

          if (command && executeCommand.hasCommand(command)) {
            let isBotAdmin = false;
            let groupMetadata = null;

            if (isGroup) {
              try {
                groupMetadata = await sock.groupMetadata(chatId);
                isBotAdmin = groupMetadata.participants.some(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net' && p.admin);
              } catch (e) { console.error('Meta error:', e); }
            }

            const messageObj = {
              key: message.key,
              message: message.message,
              isGroup,
              isBotAdmin,
              groupMetadata,
              senderId
            };

            const result = await executeCommand(command, sock, messageObj, args);
            if (result?.message) {
              await sock.sendMessage(chatId, { text: result.message }, { quoted: message });
            }
          }
        }
      }
    });

    return sock;
  } catch (error) {
    console.error('Error initializing socket:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Bot WhatsApp...');
    initDatabase();
    await initTables();
    loadCommands();
    await initSocket();
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main();

// Handle Shutdown
process.on('SIGINT', async () => { await closeDatabase(); process.exit(0); });
process.on('SIGTERM', async () => { await closeDatabase(); process.exit(0); });