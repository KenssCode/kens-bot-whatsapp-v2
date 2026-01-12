/**
 * Command: .link
 * Menampilkan link grup
 */

module.exports = {
  name: 'link',
  description: 'Menampilkan link invite grup',
  usage: '',
  example: '',
  onlyGroup: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      // Ambil link invite grup
      const inviteCode = await sock.groupInviteCode(chatId);
      const link = `https://chat.whatsapp.com/${inviteCode}`;
      
      return { 
        success: true, 
        message: `🔗 *LINK GRUP* 🔗\n\n` +
                 `Link invite grup:\n\n` +
                 `${link}\n\n` +
                 `📌 Share dengan teman yang ingin join!` 
      };
    } catch (error) {
      console.error('Error in link command:', error);
      return { 
        success: false, 
        message: 'Gagal mendapatkan link grup. Pastikan bot adalah Admin!' 
      };
    }
  }
};

