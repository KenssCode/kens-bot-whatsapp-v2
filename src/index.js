/**
 * Bot WhatsApp Jual Beli - Anti-401 Final Version (Owner HWID Fixed)
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
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      connectTimeoutMs: 90000,
      defaultQueryTimeoutMs: 0,
      getMessage: async (key) => { return { conversation: '' }; }
    });

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
        if (statusCode !== DisconnectReason.loggedOut && statusCode !== 401) {
          setTimeout(() => initSocket(), 20000); 
        }
      } else if (connection === 'open') {
        console.log('\n✅ BOT ONLINE & STABIL!');
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

          const { command, args } = parseCommand(messageText);

          // === AUTO REPLY FEATURE ===
          if (!command && messageText.trim() !== '' && isGroup) {
            const lowerText = messageText.toLowerCase();
            const autoReplyData = global.autoReplyData || {};
            
            // Cari keyword yang cocok
            for (const [keyword, response] of Object.entries(autoReplyData)) {
              if (lowerText.includes(keyword.toLowerCase())) {
                console.log(`💬 [AUTO REPLY] Keyword: "${keyword}"`);
                await sock.sendMessage(chatId, { text: response });
                break;
              }
            }
          }
          // === END AUTO REPLY ===

          if (command) {
            console.log(`🚀 [EXEC] .${command}`);
            const senderId = message.key.participant || message.key.remoteJid;
            const cleanSender = senderId.split(':')[0] + '@s.whatsapp.net';
            
            // --- DAFTAR NOMOR OWNER (GANTI DI SINI) ---
            const ownerNumbers = [
              '6289643184564@s.whatsapp.net', // Nomor kamu
              '6285775003985@s.whatsapp.net',  // Nomor admin ke-2 (ganti sesukamu)
              '62895336877643@s.whatsapp.net'
            ];

            const isOwner = ownerNumbers.includes(cleanSender);
            let isBotAdmin = false;
            let isSenderAdmin = isOwner; // Jika owner, otomatis admin
            let groupMetadata = null;

            if (isGroup) {
              try {
                groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants || [];
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

                // Improved admin detection for bot
                isBotAdmin = participants.some(p => p.id === botId && (
                  p.admin === 'admin' || 
                  p.admin === 'superadmin' || 
                  p.admin === true ||
                  p.isAdmin === true
                ));
                
                // If not owner, check sender admin status
                if (!isOwner) {
                  isSenderAdmin = participants.some(p => p.id === cleanSender && (
                    p.admin === 'admin' || 
                    p.admin === 'superadmin' || 
                    p.admin === true ||
                    p.isAdmin === true
                  ));
                }
              } catch (e) { 
                console.error('Error checking admin:', e);
              }
            }

            const messageObj = {
              key: message.key,
              message: message.message,
              isGroup, 
              isBotAdmin, 
              isSenderAdmin, // Ini yang dipakai di handler
              isOwner, 
              groupMetadata, 
              senderId
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