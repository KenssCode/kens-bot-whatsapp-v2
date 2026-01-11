/**
 * Command: .admin (Fixed for No-Store Mode)
 */
const { createInfoMessage, createWarningMessage } = require('../lib/utils');

module.exports = {
  name: 'admin',
  description: 'Menampilkan daftar admin di grup',
  usage: '',
  example: '.admin',
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

      // 1. Ambil metadata grup langsung dari WhatsApp (Anti-Store)
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants || [];
      
      // 2. Filter peserta yang merupakan admin atau superadmin
      const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
      
      let adminText = `👮 *DAFTAR ADMIN GRUP* 👮\n\n`;
      adminText += `━━━━━━━━━━━━━━━━━━━━\n`;
      adminText += `*Grup:* ${groupMetadata.subject || 'Unknown'}\n`;
      adminText += `*Total Admin:* ${admins.length}\n`;
      adminText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      if (admins.length === 0) {
        adminText += `ℹ️ Tidak ada admin di grup ini.\n`;
      } else {
        admins.forEach((admin, index) => {
          // Kita pakai format nomor saja karena store (nama kontak) sedang off
          const jid = admin.id.split('@')[0];
          adminText += `${index + 1}. @${jid}\n`;
        });
      }
      
      adminText += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      adminText += `💡 _Gunakan .h untuk panggil admin_`;
      
      // 3. Kirim pesan dengan mentions agar nomornya biru (bisa diklik)
      const adminJids = admins.map(admin => admin.id);
      
      await sock.sendMessage(chatId, {
        text: adminText,
        mentions: adminJids
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in admin command:', error);
      return { 
        success: false, 
        message: 'Gagal mengambil data admin. Pastikan Bot ada di grup ini!' 
      };
    }
  }
};