/**
 * Command: .h (Hidetag)
 * Mengirim pesan dengan mentioning semua member (hanya admin)
 */

const { getGroup, getAllGroups } = require('../lib/store');
const { createWarningMessage, createInfoMessage, mentions } = require('../lib/utils');

module.exports = {
  name: 'h',
  description: 'Mengirim pesan dengan mentioning semua member (hanya admin)',
  usage: '<teks>',
  example: 'Ada yang perlu dibicarakan',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      const senderId = message.key.participant;
      
      // Check if it's a group
      if (!chatId.endsWith('@g.us')) {
        return { 
          success: false, 
          message: createInfoMessage('Command ini hanya dapat digunakan di dalam grup.') 
        };
      }
      
      // Check if message has a reply
      if (!message.quotedMessage) {
        return { 
          success: false, 
          message: createWarningMessage('Silakan reply pesan yang ingin di-hidetag.') 
        };
      }
      
      const group = getGroup(chatId);
      
      if (!group) {
        return { 
          success: false, 
          message: createWarningMessage('Data grup tidak ditemukan. Kirim pesan di grup terlebih dahulu.') 
        };
      }
      
      // Get all group participants
      const participants = group.participants || [];
      
      if (participants.length === 0) {
        return { 
          success: false, 
          message: createInfoMessage('Tidak ada member di grup ini.') 
        };
      }
      
      // Get the quoted message content
      const quotedMessage = message.quotedMessage;
      let quotedText = '';
      
      if (quotedMessage.conversation) {
        quotedText = quotedMessage.conversation;
      } else if (quotedMessage.extendedTextMessage) {
        quotedText = quotedMessage.extendedTextMessage.text || '';
      } else if (quotedMessage.imageMessage) {
        quotedText = '📷 Gambar';
      } else if (quotedMessage.videoMessage) {
        quotedText = '🎥 Video';
      } else if (quotedMessage.documentMessage) {
        quotedText = '📄 Dokumen';
      }
      
      // Get additional text from args
      const additionalText = args.join(' ');
      
      // Build the hidetag message
      let hidetagText = `📢 *PEMBERITAHUAN* 📢\n\n`;
      
      if (additionalText) {
        hidetagText += `${additionalText}\n\n`;
      }
      
      hidetagText += `━━━━━━━━━━━━━━━━━━━━\n`;
      hidetagText += `"${quotedText}"\n`;
      hidetagText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      hidetagText += `🔰 Ditandai oleh: @${senderId.split('@')[0]}\n\n`;
      hidetagText += `⚡️ _Mohon perhatian_ ⚡️`;
      
      // Get all participant JIDs for mentions
      const participantJids = participants.map(p => p.id);
      
      await sock.sendMessage(chatId, {
        text: hidetagText,
        mentions: participantJids
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in hidetag command:', error);
      return { success: false, message: error.message };
    }
  }
};

