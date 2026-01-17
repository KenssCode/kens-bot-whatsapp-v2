// Versi 2: Hidden tag dengan duplikasi pesan persis
const { createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'h',
  description: 'Duplicate pesan + hidden tag semua member',
  usage: '',
  example: '.h',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      // Ambil metadata grup
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;
      
      // Cek reply
      const contextInfo = message.message?.extendedTextMessage?.contextInfo;
      if (!contextInfo?.quotedMessage) {
        return {
          success: false,
          message: createInfoMessage('Reply pesan yang ingin di-duplicate + hidden tag!')
        };
      }
      
      // Siapkan mentions array
      const mentions = participants.map(p => p.id);
      
      // Ekstrak teks pesan asli
      const quotedMsg = contextInfo.quotedMessage;
      let originalText = '';
      
      // Fungsi ekstrak teks dari berbagai tipe pesan
      const extractText = (msg) => {
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
        if (msg.imageMessage?.caption) return msg.imageMessage.caption;
        if (msg.videoMessage?.caption) return msg.videoMessage.caption;
        if (msg.documentMessage?.caption) return msg.documentMessage.caption;
        return '';
      };
      
      originalText = extractText(quotedMsg);
      
      // Jika pesan kosong, beri default
      if (!originalText.trim()) {
        originalText = "Pesan penting";
      }
      
      // Buat hidden mention pattern
      const zeroWidthChar = '‌'; // U+200C
      const hiddenMentions = zeroWidthChar.repeat(mentions.length * 2);
      
      // Gabungkan: pesan asli + hidden mentions
      const finalMessage = `${originalText}\\n${hiddenMentions}`;
      
      // Kirim pesan
      await sock.sendMessage(chatId, {
        text: finalMessage,
        mentions: mentions
      });
      
      // Auto delete command
      setTimeout(async () => {
        try {
          await sock.sendMessage(chatId, {
            delete: {
              remoteJid: chatId,
              fromMe: true,
              id: message.key.id
            }
          });
        } catch (e) {}
      }, 1000);
      
      return { success: true };
      
    } catch (error) {
      console.error('Hidden tag error:', error);
      return {
        success: false,
        message: createInfoMessage('Gagal melakukan hidden tag.')
      };
    }
  },
};