const { createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'tagall',
  description: 'Duplicate pesan admin + hidden tag',
  usage: '<teks> atau reply pesan',
  example: '.tagall atau .tagall [pesan]',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;

      // 1. Ambil metadata grup
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;
      const mentions = participants.map(p => p.id);

      // 2. Cek apakah ada argumen teks
      let messageText = '';
      
      // Opsi 1: Jika ada teks setelah command
      if (args.length > 0) {
        messageText = args.join(' ');
      } 
      // Opsi 2: Jika reply ke pesan
      else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = message.message.extendedTextMessage.contextInfo.quotedMessage;
        
        // extract teks with any message type
        if (quoted.conversation) {
          messageText = quoted.conversation;
        } else if (quoted.extendedTextMessage?.text) {
          messageText = quoted.extendedTextMessage.text;
        } else if (quoted.imageMessage?.caption) {
          messageText = quoted.imageMessage.caption;
        } else if (quoted.videoMessage?.caption) {
          messageText = quoted.videoMessage.caption;
        } else if (quoted.documentMessage?.caption) {
          messageText = quoted.documentMessage.caption;
        }
      }
      else {
        messageText = "Important!! Harap baca pesan ini.";
      }

      if (!messageText.trim()) {
        messageText = "Atmin memanggil member";
      }

      const zeroWidthChar = '‌'; // U+200C Zero Width Non-Joiner
      const spaceChar = ' '; // Spasi normal
      
      let hiddenMentionPattern = '';
      for (let i = 0; i < participants.length; i++) {
        hiddenMentionPattern += `${zeroWidthChar}${spaceChar}`;
      }

      const finalMessage = `${messageText}\n\n${hiddenMentionPattern}`;

      await sock.sendMessage(chatId, {
        text: finalMessage,
        mentions: mentions // tag smeua member use invis @
      });

      setTimeout(async () => {
        try {
          await sock.sendMessage(chatId, {
            delete: {
              remoteJid: chatId,
              fromMe: true,
              id: message.key.id
            }
          });
        } catch (e) {
        }
      }, 1000);

      return { success: true };

    } catch (error) {
      console.error('Error in .tagall command:', error);
      return {
        success: false,
        message: createInfoMessage('Gagal melakukan tag all.')
      };
    }
  },
};