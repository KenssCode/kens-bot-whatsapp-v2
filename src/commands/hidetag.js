/**
 * Command: .h (Hidetag) - Fixed for No-Store Mode
 */
const { createWarningMessage, createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'h',
  description: 'Mengirim pesan dengan mentioning semua member (hanya admin)',
  usage: '<teks>',
  example: 'Halo semua',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      // Gunakan senderId dari messageObj yang sudah kita buat di index.js
      const senderId = message.senderId; 
      
      // 1. Ambil data partisipan langsung dari WhatsApp (bukan dari store)
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants || [];
      
      if (participants.length === 0) {
        return { 
          success: false, 
          message: createInfoMessage('Gagal mengambil daftar member.') 
        };
      }

      // 2. Ambil teks hidetag (bisa dari args atau dari reply)
      let textToTag = args.join(' ');
      
      // Jika tidak ada teks di args, coba ambil dari pesan yang di-reply
      if (!textToTag && message.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = message.message.extendedTextMessage.contextInfo.quotedMessage;
        textToTag = quoted.conversation || quoted.extendedTextMessage?.text || "Pesan Media";
      }

      if (!textToTag) {
        return { 
          success: false, 
          message: createWarningMessage('Ketik teksnya atau reply pesan yang ingin di-hidetag!\nContoh: .h Halo semuanya') 
        };
      }
      
      // 3. Susun pesan hidetag
      let hidetagText = `📢 *PEMBERITAHUAN* 📢\n\n`;
      hidetagText += `${textToTag}\n\n`;
      hidetagText += `━━━━━━━━━━━━━━━━━━━━\n`;
      hidetagText += `🔰 Oleh: @${senderId.split('@')[0]}\n`;
      hidetagText += `━━━━━━━━━━━━━━━━━━━━`;
      
      // 4. Kirim dengan mentions semua orang
      await sock.sendMessage(chatId, {
        text: hidetagText,
        mentions: participants.map(p => p.id)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in hidetag command:', error);
      return { success: false, message: 'Gagal menjalankan hidetag. Pastikan bot adalah Admin!' };
    }
  }
};