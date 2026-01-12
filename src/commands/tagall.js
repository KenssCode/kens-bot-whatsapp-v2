/**
 * Command: .tagall
 * Mention all members one by one with visible names
 * Handles large groups by splitting into multiple messages
 */

const { createInfoMessage, createWarningMessage } = require('../lib/utils');

const MAX_MENTIONS_PER_MESSAGE = 80; // Buffer for text content

module.exports = {
  name: 'tagall',
  description: ' Mention semua member (nama terlihat) ',
  usage: '< pesan >',
  example: '.tagall Selamat datang di grup baru!',
  onlyGroup: true,
  requireAdmin: false,
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

      // Get group metadata
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants || [];
      
      // Filter out @lid JIDs and get valid member JIDs
      const validParticipants = participants.filter(p => !p.id && !p.id.includes('@lid'));
      const memberJids = validParticipants.map(p => p.id);
      
      // Get the message text (join all args)
      const messageText = args.join(' ') || '📌 Perhatian semua member!';
      
      // Check if this command is a reply to another message
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const options = quotedMessage ? { quoted: message.key } : {};
      
      // If group is small, send in one message
      if (memberJids.length <= MAX_MENTIONS_PER_MESSAGE) {
        let formattedMessage = `👥 *NOTIFIKASI DARI ADMIN*\n\n`;
        formattedMessage += `${messageText}\n\n`;
        
        // Add individual mentions one by one
        for (const participant of validParticipants) {
          const jid = participant.id;
          formattedMessage += `@${jid}\n`;
        }
        
        formattedMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        formattedMessage += `Total: ${validParticipants.length} member\n`;
        formattedMessage += `━━━━━━━━━━━━━━━━━━━━`;
        
        options.text = formattedMessage;
        options.mentions = memberJids;
        
        await sock.sendMessage(chatId, options);
        return { success: true };
      }
      
      // Group is too large, send in multiple messages
      console.log(`🔔 [TAGALL] Group has ${memberJids.length} members, splitting into multiple messages`);
      
      // Send initial message
      const introMessage = `👥 *NOTIFIKASI DARI ADMIN*\n\n${messageText}\n\n_mention untuk ${memberJids.length} member_`;
      await sock.sendMessage(chatId, { text: introMessage, ...options });
      
      // Split mentions into chunks
      const chunks = [];
      for (let i = 0; i < memberJids.length; i += MAX_MENTIONS_PER_MESSAGE) {
        chunks.push(memberJids.slice(i, i + MAX_MENTIONS_PER_MESSAGE));
      }
      
      // Send each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let chunkMessage = `\n`;
        
        for (const jid of chunk) {
          chunkMessage += `@${jid}\n`;
        }
        
        const footer = `\n━━━━━━━━━━━━━━━━━━━━\n(${i + 1}/${chunks.length}) - Total: ${memberJids.length} member\n━━━━━━━━━━━━━━━━━━━━`;
        
        await sock.sendMessage(chatId, {
          text: chunkMessage + footer,
          mentions: chunk
        });
        
        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in tagall command:', error);
      return { 
        success: false, 
        message: 'Gagal mengirim tagall. Pastikan Bot ada di grup ini!' 
      };
    }
  }
};

