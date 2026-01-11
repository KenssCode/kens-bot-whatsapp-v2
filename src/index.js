/**
 * Bot WhatsApp Jual Beli - Full Fixed Structure
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
const sessionDir = path.join(__dirname, '../session_kens');

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
      browser: Browsers.ubuntu('Chrome'), 
      getMessage: async (key) => { return { conversation: '' }; }
    });

    // --- LOGIKA PAIRING CODE ---
    const phoneNumber = process.env.BOT_NUMBER || config.botNumber;

    if (!sock.authState.creds.registered && phoneNumber) {
        // Membersihkan nomor telepon
        let cleanNumber = phoneNumber.replace(/[^0-9]/g, ''); 
        if (cleanNumber.startsWith('0')) {
            cleanNumber = '62' + cleanNumber.slice(1);
        }

        console.log(`\n[SYSTEM] Attempting to pair with number: ${cleanNumber}`);
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(cleanNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("\n========================================");
                console.log(" KODE PAIRING WHATSAPP ANDA:");
                console.log(` >>>  ${code}  <<< `);
                console.log("========================================\n");
            } catch (pairError) {
                console.error("[ERROR] Gagal meminta kode pairing:", pairError.message);
            }
        }, 3000);
    }

    await bindSocket(sock);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[CONN] Closed. Status: ${statusCode}`);
        if (statusCode !== DisconnectReason.loggedOut) {
          setTimeout(() => initSocket(), 5000);
        }
      } else if (connection === 'open') {
        console.log('✅ [CONNECTED] Bot WhatsApp sudah aktif!');
      }
    });

    // --- MONITORING PESAN ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          if (message.key.fromMe || !message.message) continue;

          const chatId = message.key.remoteJid;
          const isGroup = chatId.endsWith('@g.us');
          const messageText = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || 
                             '';

          console.log(`\n📩 [MSG] From: ${chatId} | Text: ${messageText}`);

          const { command, args } = parseCommand(messageText);

          if (command) {
            console.log(`🚀 [EXEC] Mencoba Command: .${command}`);
            
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
                
                console.log(`🛡️ [ADMIN CHECK] BotAdmin: ${isBotAdmin} | SenderAdmin: ${isSenderAdmin}`);
              } catch (e) { 
                console.error("[ERROR] Gagal ambil metadata grup:", e.message);
              }
            }

            const messageObj = {
              key: message.key,
              message: message.message,
              isGroup,
              isBotAdmin,
              isSenderAdmin,
              groupMetadata,
              senderId
            };

            try {
              const result = await executeCommand(command, sock, messageObj, args);
              if (result && result.message) {
                console.log(`📤 [REPLY] Mengirim respon untuk .${command}`);
                await sock.sendMessage(chatId, { text: result.message }, { quoted: message });
              }
            } catch (error) {
              console.error(`❌ [FATAL ERROR] Command .${command}:`, error);
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
    console.log('🚀 Starting Bot (Monitor Mode)...');
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