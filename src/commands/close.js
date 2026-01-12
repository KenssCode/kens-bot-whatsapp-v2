/**
 * Command: .close
 * Restrict group messages to admin only
 */

const { createInfoMessage, createWarningMessage, createSuccessMessage } = require('../lib/utils');

module.exports = {
  name: 'close',
  description: ' Tutup grup (hanya admin yang bisa kirim pesan) ',
  usage: '',
  example: '.close',
  onlyGroup: true,
  requireAdmin: true, // Only admins can use this command
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
      const groupName = groupMetadata.subject || ' grup ini';
      
      // Check if sender is admin (already checked by handler, but double-check)
      if (!message.isSenderAdmin) {
        return { 
          success: false, 
          message: createWarningMessage('Hanya admin grup yang dapat menggunakan command ini!') 
        };
      }

      console.log(`🔒 [CLOSE] Attempting to close group: ${chatId}`);

      // Update group settings to only allow admins to send messages
      // 'announcement' = only admins can send messages
      await sock.groupSettingUpdate(chatId, 'announcement');
      
      // Check if this command is a reply to another message
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      // Prepare options
      const successMessage = createSuccessMessage(`Berhasil menutup grup "${groupName}"!\n\nHanya admin yang dapat mengirim pesan sekarang.\n\nGunakan .open untuk membuka grup kembali.`);
      
      const options = { text: successMessage };
      
      // If replying to a message, include the quoted message
      if (quotedMessage) {
        options.quoted = message.key;
      }
      
      await sock.sendMessage(chatId, options);
      
      console.log(`🔒 [CLOSE] Group ${chatId} is now restricted to admins only`);
      
      return { success: true };
    } catch (error) {
      console.error('Error in close command:', error);
      return { 
        success: false, 
        message: `Gagal menutup grup: ${error.message}` 
      };
    }
  }
};

