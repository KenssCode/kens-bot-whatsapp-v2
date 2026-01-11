/**
 * Bot WhatsApp Jual Beli - Pairing Code Mode
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
const sessionDir = path.join(__dirname, '../sessions');

/**
 * Inisialisasi socket menggunakan Pairing Code
 */
async function initSocket() {
  const baileys = await import('@whiskeysockets/baileys');
  const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    fetchLatestBaileysVersion, 
    DisconnectReason 
  } = baileys;

  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      version,
      logger: pino({ level: 'silent' }),
      // Browser harus Chrome agar fitur Pairing Code muncul
      browser: Browsers.ubuntu('Chrome'), 
      getMessage: async (key) => { return { conversation: '' }; }
    });

    // --- LOGIKA PAIRING CODE ---
    // Pastikan kamu sudah mengisi BOT_NUMBER di Variables Railway (contoh: 62812345678)
    const phoneNumber = process.env.BOT_NUMBER || config.botNumber;

    if (!sock.authState.creds.registered) {
      if (phoneNumber) {
        console.log(`\nAttempting to pair with number: ${phoneNumber}`);
        setTimeout(async () => {
          try {
            let code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log("\n========================================");
            console.log(" KODE PAIRING WHATSAPP ANDA:");
            console.log(` >>>  ${code}  <<< `);
            console.log("========================================\n");
          } catch (pairError) {
            console.error("Gagal meminta kode pairing:", pairError.message);
          }
        }, 3000);
      } else {
        console.log("\n⚠️ BOT_NUMBER tidak ditemukan di environment variables!");
        console.log("Silakan tambah variable BOT_NUMBER di Railway agar kode muncul.\n");
      }
    }

    await bindSocket(sock);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log('Connection closed, reconnecting...');
          setTimeout(() => initSocket(), 5000);
        } else {
          console.log('Terputus secara permanen. Hapus folder sessions dan restart.');
        }
      } else if (connection === 'open') {
        console.log('✅ Bot WhatsApp connected successfully!');
      }
    });

    // Message events
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          if (message.key.fromMe || !message.message) continue;

          const chatId = message.key.remoteJid;
          const isGroup = chatId.endsWith('@g.us');
          const messageText = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || '';

          const { command, args } = parseCommand(messageText);

          if (command && executeCommand.hasCommand(command)) {
            let isBotAdmin = false;
            let groupMetadata = null;

            if (isGroup) {
              try {
                groupMetadata = await sock.groupMetadata(chatId);
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                isBotAdmin = groupMetadata.participants.some(p => p.id === botId && p.admin);
              } catch (e) { }
            }

            const messageObj = {
              key: message.key,
              message: message.message,
              isGroup,
              isBotAdmin,
              groupMetadata,
              senderId: message.key.participant || chatId
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
    console.log('🚀 Starting Bot WhatsApp (Pairing Mode)...');
    initDatabase();
    try { await initTables(); } catch (e) { console.log("DB Skip: " + e.message); }
    loadCommands();
    await initSocket();
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main();

const shutdown = async () => {
  await closeDatabase();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);