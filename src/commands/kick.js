const { createWarningMessage, createInfoMessage } = require('../lib/utils');

// Helper function untuk normalisasi JID
function normalizeJid(jid) {
  if (!jid) return null;
  // Jika sudah format yang benar
  if (jid.endsWith('@s.whatsapp.net')) return jid;
  if (jid.endsWith('@lid')) return jid;
  // Jika mengandung ':' (device format), ambil bagian number saja
  if (jid.includes(':')) {
    const num = jid.split(':')[0];
    return num + '@s.whatsapp.net';
  }
  // Default: asumsikan sudah format number, convert ke wa.net
  return jid.replace(/@.+$/, '') + '@s.whatsapp.net';
}

module.exports = {
  name: 'kick',
  description: 'Kick member dari grup (tag atau reply pesan)',
  usage: '<@tag> atau reply pesan',
  example: '.kick @member atau reply pesan + .kick',
  onlyGroup: true,
  requireAdmin: true,
  requireBotAdmin: false, // Disable sementara karena ada bug deteksi admin di index.js
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      // Ambil mentioned JIDs dari contextInfo
      const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      
      // Ambil quoted message untuk reply
      const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
      
      // Target yang akan di-kick
      let targets = [];
      
      // 1. Jika ada mention (@tag)
      if (mentionedJids.length > 0) {
        targets = mentionedJids.map(jid => normalizeJid(jid)).filter(Boolean);
      }
      
      // 2. Jika reply pesan, ambil pengirim pesan yang di-reply
      if (quotedParticipant) {
        const normalizedQuoted = normalizeJid(quotedParticipant);
        if (normalizedQuoted && !targets.includes(normalizedQuoted)) {
          targets.push(normalizedQuoted);
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
      const botJid = normalizeJid(sock.user?.id);
      targets = targets.filter(target => target !== botJid);
      
      if (targets.length === 0) {
        return {
          success: false,
          message: createWarningMessage('Tidak bisa kick bot!')
        };
      }
      
      console.log(`[KICK] Targets: ${JSON.stringify(targets)}`);
      console.log(`[KICK] ChatId: ${chatId}`);
      
      // Eksekusi kick
      const failed = [];
      const success = [];
      
      for (const target of targets) {
        try {
          console.log(`[KICK] Attempting to kick: ${target}`);
          await sock.groupParticipantsUpdate(chatId, [target], 'remove');
          success.push(target.split('@')[0]);
          console.log(`[KICK] Success kicked: ${target}`);
          
          // Kirim notifikasi segera setelah kick berhasil
          await sock.sendMessage(chatId, {
            text: `🚫 @${target.split('@')[0]} CUHHH 💦, KELUAR KAU HAMA`,
            mentions: [target]
          });
          
          // Delay sejenak untuk menghindari rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[KICK] Gagal kick ${target}:`, error.message);
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
      
      const allMentions = [...success.map(u => `${u}@s.whatsapp.net`), ...failed.map(u => `${u}@s.whatsapp.net`)];
      
      await sock.sendMessage(chatId, {
        text: createInfoMessage(resultText),
        mentions: allMentions
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

