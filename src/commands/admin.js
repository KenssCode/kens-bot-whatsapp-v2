/**
 * Command: .admin
 * Menampilkan daftar admin di grup
 */

const { getGroup, getAdmins } = require('../lib/store');
const { createInfoMessage, createWarningMessage } = require('../lib/utils');

module.exports = {
  name: 'admin',
  description: 'Menampilkan daftar admin di grup',
  usage: '',
  example: '',
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
      
      const group = getGroup(chatId);
      
      if (!group) {
        return { 
          success: false, 
          message: createWarningMessage('Data grup tidak ditemukan. Kirim pesan di grup terlebih dahulu.') 
        };
      }
      
      const admins = getAdmins(group);
      
      let adminText = `👮 *DAFTAR ADMIN GRUP* 👮\n\n`;
      adminText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      adminText += `*Grup:* ${group.subject || 'Unknown'}\n`;
      adminText += `*Total Admin:* ${admins.length}\n\n`;
      adminText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      if (admins.length === 0) {
        adminText += `ℹ️ Tidak ada admin di grup ini.\n`;
      } else {
        admins.forEach((admin, index) => {
          const name = admin.name || admin.notify || 'Unknown';
          adminText += `${index + 1}. ${name}\n`;
          adminText += `   └─ @${admin.id.split('@')[0]}\n\n`;
        });
      }
      
      adminText += `━━━━━━━━━━━━━━━━━━━━\n`;
      
      // Send message with admin mentions
      const adminJids = admins.map(admin => admin.id);
      
      await sock.sendMessage(chatId, {
        text: adminText,
        mentions: adminJids
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in admin command:', error);
      return { success: false, message: error.message };
    }
  }
};

