/**
 * Bot WhatsApp Jual Beli - Anti-401 Final Version
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

// PAKAI NAMA FIX: Jangan ganti-ganti lagi biar Railway stabil
const sessionDir = path.join(__dirname, '../session_permanen_bot');

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
      browser: Browsers.macOS('Desktop'), // Tetap macOS biar aman
      syncFullHistory: false,
      connectTimeoutMs: 90000, // Naikin ke 90 detik biar gak gampang RTO
      defaultQueryTimeoutMs: 0,
      getMessage: async (key) => { return { conversation: '' }; }
    });

    // --- PAIRING CODE DIMATIKAN SEMENTARA (BIAR GAK BLACKLIST) ---
    // Kita fokus pakai QR Link karena lebih tembus status 401

    await bindSocket(sock);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrLink = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=500x500`;
        console.log("\n========================================");
        console.log(" ⚠️ SCAN QR MELALUI LINK INI (CEPAT!): ");
        console.log(` ${qrLink}`);
        console.log("========================================\n");
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[CONN] Terputus. Status: ${statusCode}`);
        
        // Jeda 20 detik sebelum nyoba lagi biar gak spam ke server WA
        if (statusCode !== DisconnectReason.loggedOut && statusCode !== 401) {
          console.log(`[SYSTEM] Mencoba menyambung ulang dalam 20 detik...`);
          setTimeout(() => initSocket(), 20000); 
        } else {
          console.log('⚠️ SESI MATI (401). JANGAN RESTART. Hapus tautan di HP dan tunggu 10 menit baru push lagi.');
        }
      } else if (connection === 'open') {
        console.log('\n✅ BOT ONLINE & STABIL!');
        console.log('Hubungi bot kamu sekarang dan ketik .h\n');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          if (message.key.fromMe || !message.message) continue;

          const chatId = message.key.remoteJid;
          const isGroup = chatId.endsWith('@g.us');
          const messageText = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || 
                             '';

          console.log(`📩 [MSG] ${chatId}: ${messageText}`);

          const { command, args } = parseCommand(messageText);

          if (command) {
            console.log(`🚀 [EXEC] .${command}`);
            const senderId = message.key.participant || message.key.remoteJid;
            let isBotAdmin = false;
            let isSenderAdmin = false;
            let groupMetadata = null;

            if (isGroup) {
              try {
                groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants || [];
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const cleanSenderId = senderId.split(':')[0] + '@s.whatsapp.net';

                isBotAdmin = participants.some(p => p.id === botId && (p.admin || p.isAdmin));
                isSenderAdmin = participants.some(p => p.id === cleanSenderId && (p.admin || p.isAdmin));
              } catch (e) { }
            }

            const messageObj = {
              key: message.key,
              message: message.message,
              isGroup, isBotAdmin, isSenderAdmin, groupMetadata, senderId
            };

            try {
              const result = await executeCommand(command, sock, messageObj, args);
              if (result && result.message) {
                await sock.sendMessage(chatId, { text: result.message }, { quoted: message });
              }
            } catch (error) {
              console.error(`❌ [ERROR .${command}]`, error);
            }
          }
        }
      }
    });

    return sock;
  } catch (error) {
    console.error('Fatal Error:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Bot Hybrid Mode...');
    initDatabase();
    try { await initTables(); } catch (e) {}
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