/**
 * Command: .testi
 * Menampilkan link channel testimoni
 */

const config = require('../config/config');

module.exports = {
  name: 'testi',
  description: 'Menampilkan link channel testimoni',
  usage: '',
  example: '',
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      return { 
        success: true, 
        message: `📢 *CHANNEL TESTIMONI* 📢\n\n` +
                 `Klik link di bawah untuk melihat testimoni:\n\n` +
                 `🔗 https://whatsapp.com/channel/0029VAg9lfI0TIvZV86RhY3X\n\n` +
                 `📌 Pastikan sudah join channel ya!` 
      };
    } catch (error) {
      console.error('Error in testi command:', error);
      return { success: false, message: 'Gagal menampilkan link testimoni.' };
    }
  }
};

