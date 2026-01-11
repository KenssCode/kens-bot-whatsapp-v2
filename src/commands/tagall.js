/**
 * Command: .tagall
 * Mention semua member di grup (hanya admin)
 */

const { getGroup } = require('../lib/store');
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
      const senderId = message.key.participant;
      
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
      
      // Get all group participants
      const participants = group.participants || [];
      
      if (participants.length === 0) {
        return { 
          success: false, 
          message: createInfoMessage('Tidak ada member di grup ini.') 
        };
      }
      
      // Get optional message
      const customMessage = args.join(' ');
      
      // Build the tagall message
      let tagallText = `🏷️ *TAG ALL* 🏷️\n\n`;
      
      if (customMessage) {
        tagallText += `${customMessage}\n\n`;
      }
      
      tagallText += `━━━━━━━━━━━━━━━━━━━━\n`;
      
      // Add mention for all participants
      const participantJids = [];
      
      participants.forEach(participant => {
        if (participant.id !== senderId) { // Don't mention sender
          participantJids.push(participant.id);
        }
      });
      
      // Add mentions
      if (participantJids.length > 0) {
        participantJids.forEach(jid => {
          const name = jid.split('@')[0];
          tagallText += `@${name}\n`;
        });
      }
      
      tagallText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      tagallText += `👥 *Total:* ${participants.length} member\n`;
      tagallText += `📍 Via: @${senderId.split('@')[0]}\n\n`;
      tagallText += `_Mohon perhatian semua_ 👀`;
      
      // Add sender to mentions
      const allMentions = [senderId, ...participantJids];
      
      await sock.sendMessage(chatId, {
        text: tagallText,
        mentions: allMentions
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in tagall command:', error);
      return { success: false, message: error.message };
    }
  }
};

