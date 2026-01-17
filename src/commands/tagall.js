const { createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'tagall',
  description: 'Duplicate pesan admin + hidden tag semua member',
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
        
        // Ekstrak teks dari berbagai jenis pesan
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
      // Opsi 3: Ambil pesan sebelumnya dari admin
      else {
        // Simulasi: mengambil pesan terakhir admin sebelum command
        // Dalam implementasi nyata, butuh sistem cache/store
        messageText = "Penting! Harap baca pesan ini.";
      }

      // 3. Jika tetap kosong, beri default
      if (!messageText.trim()) {
        messageText = "Pesan penting dari admin";
      }

      // 4. Buat hidden mention pattern
      const zeroWidthChar = '‌'; // U+200C Zero Width Non-Joiner
      const spaceChar = ' '; // Spasi normal
      
      // Pattern untuk hidden mention: karakter tak terlihat di antara spasi
      let hiddenMentionPattern = '';
      for (let i = 0; i < participants.length; i++) {
        hiddenMentionPattern += `${zeroWidthChar}${spaceChar}`;
      }

      // 5. Gabungkan pesan asli dengan hidden mentions
      const finalMessage = `${messageText}\n\n${hiddenMentionPattern}`;

      // 6. Kirim pesan dengan hidden mentions
      await sock.sendMessage(chatId, {
        text: finalMessage,
        mentions: mentions // Semua member ditag tapi tak terlihat
      });

      // 7. Hapus pesan command untuk kerahasiaan
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
          // Silent fail jika tidak bisa delete
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