const { createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'tall',
  description: 'Tag semua member dengan hidden tag (reply pesan) - Admin Only',
  usage: '',
  example: '.tall',
  onlyGroup: true,
  requireAdmin: true, // DIUBAH: hanya admin yang bisa
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;

      // 1. Ambil metadata grup
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;

      // 2. Cek apakah ada pesan yang direply
      if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return {
          success: false,
          message: createInfoMessage('Gunakan: Reply pesan seseorang dengan `.tall` untuk hidden tag semua member.')
        };
      }

      // 3. Buat hidden mention text
      let hiddenText = '';
      const mentions = [];
      
      participants.forEach((participant) => {
        const invisibleChar = '‌'; // Zero Width Joiner
        hiddenText += `@${invisibleChar} `;
        mentions.push(participant.id);
      });

      // 4. Kirim sebagai reply dengan mention tersembunyi
      await sock.sendMessage(chatId, {
        text: hiddenText.trim(),
        mentions: mentions,
        contextInfo: {
          stanzaId: message.message.extendedTextMessage.contextInfo.stanzaId,
          participant: sender,
          quotedMessage: message.message.extendedTextMessage.contextInfo.quotedMessage
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in .tall command:', error);
      return {
        success: false,
        message: createInfoMessage('Terjadi error saat menjalankan command.')
      };
    }
  },
};