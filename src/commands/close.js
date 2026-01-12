/**
 * Command: .close
 * Restrict group messages to admin only
 */

const { createInfoMessage, createWarningMessage, createSuccessMessage } = require('../lib/utils');

module.exports = {
  name: 'close',
  description: ' Grup di Tutup ( Semua Admin Offline ) ',
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

      // Check if bot is admin (required to change group settings)
      if (!message.isBotAdmin) {
        return { 
          success: false, 
          message: createWarningMessage('Bot harus menjadi admin untuk menggunakan command ini!') 
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

      // Update group settings to only allow admins to send messages
      await sock.groupSettingUpdate(chatId, 'announcement');
      
      // Confirm success
      const successMessage = createSuccessMessage(`Berhasil menutup grup "${groupName}"!\n\nHanya admin yang dapat mengirim pesan sekarang.\n\nGunakan .open untuk membuka grup kembali.`);
      
      await sock.sendMessage(chatId, { text: successMessage });
      
      console.log(`🔒 [CLOSE] Group ${chatId} is now restricted to admins only`);
      
      return { success: true };
    } catch (error) {
      console.error('Error in close command:', error);
      return { 
        success: false, 
        message: 'Gagal menutup grup. Pastikan Bot memiliki izin untuk mengubah pengaturan grup!' 
      };
    }
  }
};

