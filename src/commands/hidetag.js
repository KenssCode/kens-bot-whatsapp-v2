const { createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'h',
  description: 'Hidden tag broadcast (admin only)',
  usage: '',
  example: '.h',
  onlyGroup: true,
  requireAdmin: true, // Menggunakan requireAdmin dari handler
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;

      // 1. Ambil metadata grup
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;

      // 2. Buat hidden mention text
      let hiddenText = '';
      const mentions = [];
      
      participants.forEach((participant) => {
        const invisibleChar = '‌'; // Zero Width Joiner
        hiddenText += `@${invisibleChar} `;
        mentions.push(participant.id);
      });

      // 3. Kirim sebagai broadcast hidden tag
      await sock.sendMessage(chatId, {
        text: hiddenText.trim(),
        mentions: mentions
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in .h command:', error);
      return {
        success: false,
        message: createInfoMessage('Terjadi error saat menjalankan command.')
      };
    }
  },
};