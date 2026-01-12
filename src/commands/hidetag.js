/**
 * Command: .h (hidetag)
 * Mention all members with hidden text (mentions are blue but names not visible)
 */

const { createInfoMessage, createWarningMessage } = require('../lib/utils');

module.exports = {
  name: 'h',
  description: ' Mention semua member (teks tersembunyi) ',
  usage: '< pesan >',
  example: '.h Selamat datang semuanya!',
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
      
      // Get all member JIDs (not just admins)
      const memberJids = participants.map(p => p.id);
      
      // Get the message text (join all args)
      const messageText = args.join(' ') || '📌 Penting!';
      
      // Format the message
      let formattedMessage = `🔔 *NOTIFIKASI GRUP*\n\n`;
      formattedMessage += `${messageText}\n\n`;
      formattedMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
      formattedMessage += `Total: ${memberJids.length} member\n`;
      formattedMessage += `━━━━━━━━━━━━━━━━━━━━`;
      
      // Send with mentions (hidden mentions - names won't be shown)
      await sock.sendMessage(chatId, {
        text: formattedMessage,
        mentions: memberJids
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in hidetag command:', error);
      return { 
        success: false, 
        message: 'Gagal mengirim hidetag. Pastikan Bot ada di grup ini!' 
      };
    }
  }
};

