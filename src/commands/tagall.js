/**
 * Command: .tagall (Fixed for No-Store Mode)
 */
const { createWarningMessage, createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'tagall',
  description: 'Mention semua member di grup (hanya admin)',
  usage: '[pesan_opsional]',
  example: 'Halo semuanya!',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      // Gunakan senderId dari messageObj di index.js
      const senderId = message.senderId; 
      
      // 1. Ambil data partisipan langsung dari metadata grup
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants || [];
      
      if (participants.length === 0) {
        return { 
          success: false, 
          message: createInfoMessage('Gagal mengambil daftar member.') 
        };
      }
      
      // 2. Ambil pesan tambahan jika ada
      const customMessage = args.join(' ');
      
      // 3. Susun teks Tag All
      let tagallText = `🏷️ *TAG ALL* 🏷️\n\n`;
      if (customMessage) {
        tagallText += `💬 *Pesan:* ${customMessage}\n\n`;
      }
      tagallText += `━━━━━━━━━━━━━━━━━━━━\n`;
      
      // Ambil daftar JID untuk mentions dan buat list nomornya
      const participantJids = participants.map(p => p.id);
      
      participants.forEach((participant, index) => {
        const num = participant.id.split('@')[0];
        tagallText += `${index + 1}. @${num}\n`;
      });
      
      tagallText += `━━━━━━━━━━━━━━━━━━━━\n`;
      tagallText += `👥 *Total:* ${participants.length} member\n`;
      tagallText += `📍 Oleh: @${senderId.split('@')[0]}\n`;
      tagallText += `━━━━━━━━━━━━━━━━━━━━`;
      
      // 4. Kirim pesan dengan mentions
      await sock.sendMessage(chatId, {
        text: tagallText,
        mentions: participantJids
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in tagall command:', error);
      return { 
        success: false, 
        message: 'Gagal melakukan tagall. Pastikan Bot adalah Admin!' 
      };
    }
  }
};