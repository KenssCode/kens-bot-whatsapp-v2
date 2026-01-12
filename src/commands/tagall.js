/**
 * Command: .tagall
 * Mention all members with visible names
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
      
      // Get all member JIDs
      const memberJids = participants.map(p => p.id);
      
      // Get the message text (join all args)
      const messageText = args.join(' ') || '📌 Perhatian semua member!';
      
      // Format the message with visible mentions
      let formattedMessage = `👥 *NOTIFIKASI DARI ADMIN*\n\n`;
      formattedMessage += `${messageText}\n\n`;
      formattedMessage += `_Mention untuk semua member_\n\n`;
      
      // Add individual mentions (visible)
      for (const participant of participants) {
        const jid = participant.id;
        const number = jid.split('@')[0];
        formattedMessage += `@${number} `;
      }
      
      formattedMessage += `\n\n━━━━━━━━━━━━━━━━━━━━\n`;
      formattedMessage += `Total: ${memberJids.length} member\n`;
      formattedMessage += `━━━━━━━━━━━━━━━━━━━━`;
      
      // Send with mentions (visible mentions - names will be shown)
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

