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
          // Skip pesan dari bot sendiri
          if (message.key.fromMe) continue;
          // Skip jika tidak ada message object
          if (!message.message) {
            console.log('📩 [SKIP] No message object');
            continue;
          }

          const chatId = message.key.remoteJid;
          const isGroup = chatId.endsWith('@g.us');
          
          // Debug: log semua pesan masuk
          const rawMessage = message.message;
          const messageText = rawMessage?.conversation || 
                             rawMessage?.extendedTextMessage?.text || 
                             rawMessage?.imageMessage?.caption ||
                             '';
          
          console.log(`\n📩 [MSG] From: ${message.key.participant || chatId} | Text: "${messageText}"`);
          
          const { command, args } = parseCommand(messageText);
          
          // === AUTO REPLY FEATURE ===
          if (!command && messageText.trim() !== '' && isGroup) {
            const lowerText = messageText.toLowerCase();
            const autoReplyData = global.autoReplyData || {};
            
            // Cari keyword yang cocok
            for (const [keyword, response] of Object.entries(autoReplyData)) {
              if (lowerText.includes(keyword.toLowerCase())) {
                console.log(`💬 [AUTO REPLY] Match: "${keyword}" → "${response}"`);
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
              '6285775003985@s.whatsapp.net',  // Nomor admin ke-2
              '62895336877643@s.whatsapp.net'
            ];

            const isOwner = ownerNumbers.includes(cleanSender);
            let isBotAdmin = false;
            let isSenderAdmin = isOwner; // Owner otomatis admin
            let groupMetadata = null;

            // Bot ID extraction
            let botJid = null;
            if (sock.user?.id) {
              botJid = sock.user.id.includes(':') 
                ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
                : sock.user.id;
            }
            
            console.log(`🔐 [ADMIN] Bot: ${botJid} | Sender: ${cleanSender} | IsOwner: ${isOwner}`);

            if (isGroup) {
              try {
                groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants || [];
                console.log(`🔐 [ADMIN] Participants count: ${participants.length}`);
                
                // Check if bot is admin - check ALL participants for bot
                if (botJid) {
                  const botParticipant = participants.find(p => {
                    return p.id === botJid || 
                           p.id === sock.user?.id ||
                           p.id?.startsWith(botJid.split('@')[0]);
                  });
                  
                  if (botParticipant) {
                    const adminStatus = botParticipant.admin;
                    isBotAdmin = adminStatus === 'admin' || adminStatus === 'superadmin' || adminStatus === true;
                    console.log(`🔐 [ADMIN] Bot found: ${botParticipant.id}, admin: ${adminStatus} → isBotAdmin: ${isBotAdmin}`);
                  } else {
                    console.log(`🔐 [ADMIN] Bot NOT found in group! Checking if it's the bot sending...`);
                    // Maybe the bot is checking its own message? No, we skip fromMe already
                  }
                }
                
                // Check sender admin status (only if not owner)
                if (!isOwner && cleanSender) {
                  const senderParticipant = participants.find(p => {
                    return p.id === cleanSender ||
                           p.id === senderId ||
                           p.id?.startsWith(cleanSender.split('@')[0]);
                  });
                  
                  if (senderParticipant) {
                    const senderAdminStatus = senderParticipant.admin;
                    isSenderAdmin = senderAdminStatus === 'admin' || senderAdminStatus === 'superadmin' || senderAdminStatus === true;
                    console.log(`🔐 [ADMIN] Sender: ${senderParticipant.id}, admin: ${senderAdminStatus} → isSenderAdmin: ${isSenderAdmin}`);
                  }
                }
              } catch (e) { 
                console.error('🔐 [ADMIN] Error:', e.message);
              }
            }

            console.log(`🔐 [ADMIN] Final - isBotAdmin: ${isBotAdmin}, isSenderAdmin: ${isSenderAdmin}`);

            const messageObj = {
              key: message.key,
              message: message.message,
              isGroup, 
              isBotAdmin, 
              isSenderAdmin,
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
