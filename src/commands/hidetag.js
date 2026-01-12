/**
 * Command: .h (hidetag)
 * Mention all members one by one with hidden text (names visible but clickable)
 */

const { createInfoMessage, createWarningMessage } = require('../lib/utils');

module.exports = {
  name: 'h',
  description: ' Mention semua member (nama terlihat, format tersembunyi) ',
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
      
      // Get the message text (join all args)
      const messageText = args.join(' ') || '📌 Penting!';
      
      // Format the message with individual mentions (similar to tagall)
      let formattedMessage = `🔔 *NOTIFIKASI GRUP*\n\n`;
      formattedMessage += `${messageText}\n\n`;
      
      // Add individual mentions one by one
      for (const participant of participants) {
        const jid = participant.id;
        formattedMessage += `@${jid}\n`;
      }
      
      formattedMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      formattedMessage += `Total: ${participants.length} member\n`;
      formattedMessage += `━━━━━━━━━━━━━━━━━━━━`;
      
      // Get all member JIDs for mentions
      const memberJids = participants.map(p => p.id);
      
      // Send with mentions
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

