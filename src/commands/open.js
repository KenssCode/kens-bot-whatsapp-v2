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

      // Get bot's JID
      const botJid = sock.user?.id;
      const participants = groupMetadata.participants || [];
      
      // Find bot in participants
      let botIsAdmin = false;
      const botParticipant = participants.find(p => 
        p.id === botJid || 
        p.id === sock.user?.id ||
        (botJid && p.id?.includes(botJid.split('@')[0]))
      );
      
      if (botParticipant) {
        botIsAdmin = botParticipant.admin === 'admin' || 
                     botParticipant.admin === 'superadmin' || 
                     botParticipant.admin === true;
      }
      
      console.log(`🔓 [OPEN] Bot JID: ${botJid}`);
      console.log(`🔓 [OPEN] Bot participant:`, botParticipant);
      console.log(`🔓 [OPEN] Bot is admin: ${botIsAdmin}`);
      
      if (!botIsAdmin) {
        return { 
          success: false, 
          message: createWarningMessage('Bot harus menjadi admin untuk menggunakan command ini!') 
        };
      }

      console.log(`🔓 [OPEN] Attempting to open group: ${chatId}`);

      // Update group settings to allow all members to send messages
      // 'not_announcement' = all members can send messages
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
        message: `Gagal membuka grup: ${error.message}` 
      };
    }
  }
};

