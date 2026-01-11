/**
 * Bot WhatsApp Jual Beli
 * Main Entry Point
 * 
 * Bot ini berjalan 24 jam di Railway dan mendukung fitur-fitur:
 * - .help - Melihat daftar command
 * - .fee - Melihat informasi fee rekber
 * - .admin - Melihat daftar admin grup
 * - .h - Hidetag pesan (admin only)
 * - .tagall - Tag semua member (admin only)
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  disconnect,
  Browsers,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidNormalizedUser
} = require('@adiwajshing/baileys');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// Load konfigurasi
const config = require('./config/config');
const { loadCommands, executeCommand, generateHelpText } = require('./lib/handler');
const { store, bindSocket, logger } = require('./lib/store');
const { initDatabase, initTables, closeDatabase } = require('./lib/connect');
const { parseCommand, createInfoMessage, createWarningMessage, createErrorMessage } = require('./lib/utils');

// Session directory
const sessionDir = path.join(__dirname, 'sessions');

/**
 * Inisialisasi socket
 */
async function initSocket() {
  try {
    // Create session directory if not exists
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Fetch latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys v${version.join('.')} (${isLatest ? 'latest' : 'outdated'})`);

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // Create socket
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      browser: Browsers.ubuntu('Chrome'),
      version,
      getMessage: async (key) => {
        const message = store.messages.get(key.id);
        return message?.message || '';
      }
    });

    // Bind store to socket
    bindSocket(sock);

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Connection events
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        
        if (shouldReconnect) {
          console.log('Connection closed, reconnecting...');
          setTimeout(() => initSocket(), config.restartTimeout);
        } else {
          console.log('Authentication failed, please scan QR code again');
        }
      } else if (connection === 'open') {
        console.log('✅ Bot WhatsApp connected successfully!');
        console.log(`📱 Bot is ready to use`);
        
        // Send notification to owner's number (if configured)
        if (config.ownerNumber) {
          await sock.sendMessage(config.ownerNumber, {
            text: '🤖 Bot WhatsApp Jual Beli sudah ONLINE!\n\nBot berjalan 24 jam di Railway.'
          });
        }
      }
    });

    // Group events
    sock.ev.on('groups.update', async (updates) => {
      for (const update of updates) {
        console.log(`Group updated: ${update.subject || update.id}`);
      }
    });

    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
      console.log(`Group ${id} - Participants ${action}:`, participants);
      
      // Get group info
      const groupInfo = await sock.groupMetadata(id);
      
      // Welcome message
      if (action === 'add') {
        const welcomeText = `🎉 *SELAMAT DATANG* 🎉\n\n`;
        welcomeText += `Hai @${participants[0].split('@')[0]}!\n`;
        welcomeText += `Selamat datang di grup *${groupInfo.subject}*\n\n`;
        welcomeText += `📋 Ketik ${config.commandPrefix}help untuk melihat command bot.\n`;
        welcomeText += `💰 Ketik ${config.commandPrefix}fee untuk melihat biaya rekber.`;
        
        await sock.sendMessage(id, {
          text: welcomeText,
          mentions: participants
        });
      }
      
      // Goodbye message
      if (action === 'remove') {
        const goodbyeText = `👋 *SAMPAI JUMPA* 👋\n\n`;
        goodbyeText += `@${participants[0].split('@')[0]} telah meninggalkan grup.\n`;
        goodbyeText += `Semoga luck selalu ya! 🍀`;
        
        await sock.sendMessage(id, {
          text: goodbyeText,
          mentions: participants
        });
      }
    });

    // Message events
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          // Skip self messages
          if (message.key.fromMe) continue;

          const chatId = message.key.remoteJid;
          const isGroup = chatId.endsWith('@g.us');
          const senderId = message.key.participant;
          const messageText = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || 
                             '';

          // Log message
          console.log(`[${isGroup ? 'GROUP' : 'DM'}] ${senderId}: ${messageText.slice(0, 50)}...`);

          // Check if it's a command
          const { command, args } = parseCommand(messageText);

          if (command) {
            // Check if command exists
            if (!executeCommand.hasCommand(command)) {
              continue;
            }

            // Get group metadata for admin check
            let isBotAdmin = false;
            let groupMetadata = null;

            if (isGroup) {
              try {
                groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants || [];
                const botJid = sock.user?.id;
                
                isBotAdmin = participants.some(p => 
                  p.id === botJid && p.admin
                );
              } catch (error) {
                console.error('Error getting group metadata:', error);
              }
            }

            // Create message object
            const messageObj = {
              key: message.key,
              message: message.message,
              quotedMessage: message.message?.extendedTextMessage?.contextInfo?.quotedMessage,
              isGroup,
              isBotAdmin,
              groupMetadata,
              senderId
            };

            // Execute command
            const result = await executeCommand(command, sock, messageObj, args);

            // Send response if any
            if (result && result.message) {
              await sock.sendMessage(chatId, {
                text: result.message,
                quoted: message
              });
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

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Bot WhatsApp Jual Beli...');
    console.log('================================');

    // Initialize database
    console.log('📦 Initializing database...');
    initDatabase();
    
    // Initialize tables
    const tablesInitialized = await initTables();
    if (tablesInitialized) {
      console.log('✅ Database tables ready');
    }

    // Load commands
    console.log('📖 Loading commands...');
    loadCommands();

    // Initialize socket
    console.log('🔌 Connecting to WhatsApp...');
    await initSocket();

    console.log('================================');
    console.log('✅ Bot is running!');
    console.log(`💡 Send ${config.commandPrefix}help in WhatsApp to see available commands.`);
    console.log('🛑 Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bot...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down bot...');
  await closeDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await closeDatabase();
  process.exit(1);
});

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error);
  await closeDatabase();
  process.exit(1);
});

// Start the bot
main();

