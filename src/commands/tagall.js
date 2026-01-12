/**
 * Command: .tagall
 * Mention all members one by one with visible names
 */

const { createInfoMessage, createWarningMessage } = require('../lib/utils');

module.exports = {
  name: 'tagall',
  description: ' Mention semua member (nama terlihat) ',
  usage: '< pesan >',
  example: '.tagall Selamat datang di grup baru!',
  onlyGroup: true,
  requireAdmin: false,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      // Check if it's a group
      if (!chatId.endsWith('@g.us')) {
        return { 
          success: false, 
          message: createInfoMessage('Command ini hanya dapat digunakan di dalam grup.') 
        };
      }

      // Get group metadata
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants || [];
      
      // Get the message text (join all args)
      const messageText = args.join(' ') || '📌 Perhatian semua member!';
      
      // Format the message with individual mentions
      let formattedMessage = `👥 *NOTIFIKASI DARI ADMIN*\n\n`;
      formattedMessage += `${messageText}\n\n`;
      
      // Add individual mentions one by one (each on new line)
      for (const participant of participants) {
        const jid = participant.id;
        formattedMessage += `@${jid}\n`;
      }
      
      formattedMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      formattedMessage += `Total: ${participants.length} member\n`;
      formattedMessage += `━━━━━━━━━━━━━━━━━━━━`;
      
      // Get all member JIDs for mentions
      const memberJids = participants.map(p => p.id);
      
      // Send with mentions (visible mentions)
      await sock.sendMessage(chatId, {
        text: formattedMessage,
        mentions: memberJids
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in tagall command:', error);
      return { 
        success: false, 
        message: 'Gagal mengirim tagall. Pastikan Bot ada di grup ini!' 
      };
    }
  }
};

