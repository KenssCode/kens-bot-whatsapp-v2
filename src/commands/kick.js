const { createWarningMessage, createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'kick',
  description: 'Kick member dari grup (tag atau reply pesan)',
  usage: '<@tag> atau reply pesan',
  example: '.kick @member atau reply pesan + .kick',
  onlyGroup: true,
  requireAdmin: true,
  requireBotAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      // Ambil mentioned JIDs dari contextInfo
      const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      
      // Ambil quoted message untuk reply
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
      
      // Target yang akan di-kick
      let targets = [];
      
      // 1. Jika ada mention (@tag)
      if (mentionedJids.length > 0) {
        targets = mentionedJids;
      }
      
      // 2. Jika reply pesan, ambil pengirim pesan yang di-reply
      if (quotedMessage && quotedParticipant) {
        // Jika belum ada di targets, tambahkan
        if (!targets.includes(quotedParticipant)) {
          targets.push(quotedParticipant);
        }
      }
      
      // Validasi
      if (targets.length === 0) {
        return {
          success: false,
          message: createWarningMessage('Tag member atau reply pesan yang ingin di-kick.\n\nContoh:\n• .kick @member\n• Reply pesan + .kick')
        };
      }
      
      // Filter: jangan kick bot sendiri
      const botJid = sock.user?.id;
      targets = targets.filter(target => target !== botJid);
      
      if (targets.length === 0) {
        return {
          success: false,
          message: createWarningMessage('Tidak bisa kick bot!')
        };
      }
      
      // Eksekusi kick
      const failed = [];
      const success = [];
      
      for (const target of targets) {
        try {
          await sock.groupParticipantsUpdate(chatId, [target], 'remove');
          success.push(target.split('@')[0]);
        } catch (error) {
          console.error(`Gagal kick ${target}:`, error.message);
          failed.push(target.split('@')[0]);
        }
      }
      
      // Kirim notifikasi hasil
      let resultText = '';
      
      if (success.length > 0) {
        resultText += `✅ *Berhasil di-kick:*\n${success.map(u => `@${u}`).join(', ')}\n\n`;
      }
      
      if (failed.length > 0) {
        resultText += `❌ *Gagal di-kick:*\n${failed.map(u => `@${u}`).join(', ')}\n\n`;
      }
      
      resultText += `Total: ${success.length} berhasil, ${failed.length} gagal`;
      
      await sock.sendMessage(chatId, {
        text: createInfoMessage(resultText),
        mentions: [...success.map(u => `${u}@s.whatsapp.net`), ...failed.map(u => `${u}@s.whatsapp.net`)]
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Kick command error:', error);
      return {
        success: false,
        message: createWarningMessage('Gagal mengeksekusi kick. Pastikan bot adalah admin grup.')
      };
    }
  }
};

