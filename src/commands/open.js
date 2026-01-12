/**
 * Command: .open
 * Open group (allow all members to send messages)
 */

const { createInfoMessage, createWarningMessage, createSuccessMessage } = require('../lib/utils');

module.exports = {
  name: 'open',
  description: ' Buka grup (semua member bisa kirim pesan) ',
  usage: '',
  example: '.open',
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

      // Update group settings to allow all members to send messages
      await sock.groupSettingUpdate(chatId, 'not_announcement');
      
      // Confirm success
      const successMessage = createSuccessMessage(`Berhasil membuka grup "${groupName}"!\n\nSemua member dapat mengirim pesan sekarang.\n\nGunakan .close untuk menutup grup kembali.`);
      
      await sock.sendMessage(chatId, { text: successMessage });
      
      console.log(`🔓 [OPEN] Group ${chatId} is now open for all members`);
      
      return { success: true };
    } catch (error) {
      console.error('Error in open command:', error);
      return { 
        success: false, 
        message: 'Gagal membuka grup. Pastikan Bot memiliki izin untuk mengubah pengaturan grup!' 
      };
    }
  }
};

