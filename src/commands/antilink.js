const { createInfoMessage } = require('../lib/utils');

// Configurable settings
const ANTI_LINK_CONFIG = {
  enabled: true,
  whitelist: ['whatsapp.com', 'wa.me', 'instagram.com', 'facebook.com', 'twitter.com'], // Domain yang diizinkan
  action: 'kick', // 'kick', 'warn', 'delete'
  adminImmunity: true,
  groupCreatorImmunity: true,
  warningCount: 2 // Jumlah peringatan sebelum kick
};

// Store untuk tracking pelanggaran
const linkViolations = new Map();

module.exports = {
  name: 'antilink',
  description: 'Auto kick member yang kirim link',
  usage: '<on/off>',
  example: '.antilink on',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      if (args[0] === 'on') {
        ANTI_LINK_CONFIG.enabled = true;
        await sock.sendMessage(chatId, {
          text: createInfoMessage('✅ Anti-link system diaktifkan! Bot akan auto kick yang kirim link.')
        });
      } else if (args[0] === 'off') {
        ANTI_LINK_CONFIG.enabled = false;
        await sock.sendMessage(chatId, {
          text: createInfoMessage('❌ Anti-link system dimatikan.')
        });
      } else if (args[0] === 'list') {
        const whitelist = ANTI_LINK_CONFIG.whitelist.join('\n• ');
        await sock.sendMessage(chatId, {
          text: createInfoMessage(`📋 Domain whitelist:\n• ${whitelist}`)
        });
      } else if (args[0] === 'add' && args[1]) {
        ANTI_LINK_CONFIG.whitelist.push(args[1].toLowerCase());
        await sock.sendMessage(chatId, {
          text: createInfoMessage(`✅ Domain "${args[1]}" ditambahkan ke whitelist.`)
        });
      } else {
        const status = ANTI_LINK_CONFIG.enabled ? 'AKTIF' : 'NONAKTIF';
        await sock.sendMessage(chatId, {
          text: createInfoMessage(`🛡️ Anti-link Status: ${status}\n\nGunakan:\n• .antilink on/off\n• .antilink list\n• .antilink add <domain>`)
        });
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Anti-link command error:', error);
      return {
        success: false,
        message: createInfoMessage('Gagal mengatur anti-link.')
      };
    }
  },
};

// Main anti-link detection system
async function setupAntiLinkSystem(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!ANTI_LINK_CONFIG.enabled) return;
    
    for (const msg of messages) {
      try {
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const message = msg.message;
        
        // Cek apakah ini group chat
        if (!chatId.endsWith('@g.us')) continue;
        
        // Cek apakah pesan mengandung link
        const detectedLinks = extractLinksFromMessage(message);
        if (detectedLinks.length === 0) continue;
        
        // Ambil metadata grup
        const groupMetadata = await sock.groupMetadata(chatId);
        const participant = groupMetadata.participants.find(p => p.id === sender);
        
        // Cek immunity
        if (checkImmunity(participant)) continue;
        
        // Cek apakah link termasuk whitelist
        const violationLinks = detectedLinks.filter(link => 
          !isWhitelisted(link)
        );
        
        if (violationLinks.length > 0) {
          // Aksi berdasarkan config
          await handleLinkViolation(sock, chatId, sender, participant, violationLinks, message, msg.key);
        }
        
      } catch (error) {
        console.error('Anti-link detection error:', error);
      }
    }
  });
}

// Helper functions
function extractLinksFromMessage(message) {
  const links = [];
  
  // Extract dari berbagai tipe pesan
  let text = '';
  
  if (message.conversation) {
    text = message.conversation;
  } else if (message.extendedTextMessage?.text) {
    text = message.extendedTextMessage.text;
  } else if (message.imageMessage?.caption) {
    text = message.imageMessage.caption;
  } else if (message.videoMessage?.caption) {
    text = videoMessage.caption;
  } else if (message.documentMessage?.caption) {
    text = message.documentMessage.caption;
  }
  
  // Regex untuk deteksi URL
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const found = text.match(urlRegex) || [];
  
  // Filter valid URLs
  found.forEach(url => {
    try {
      // Normalize URL
      let normalized = url.toLowerCase();
      if (!normalized.startsWith('http')) {
        normalized = 'http://' + normalized;
      }
      links.push(new URL(normalized).hostname.replace('www.', ''));
    } catch (e) {
      // Skip invalid URLs
    }
  });
  
  return links;
}

function isWhitelisted(domain) {
  return ANTI_LINK_CONFIG.whitelist.some(whitelistDomain => 
    domain.includes(whitelistDomain) || whitelistDomain.includes(domain)
  );
}

function checkImmunity(participant) {
  if (!participant) return false;
  
  if (ANTI_LINK_CONFIG.adminImmunity && 
      (participant.admin === 'admin' || participant.admin === 'superadmin')) {
    return true;
  }
  
  if (ANTI_LINK_CONFIG.groupCreatorImmunity && 
      participant.admin === 'superadmin') {
    return true;
  }
  
  return false;
}

async function handleLinkViolation(sock, chatId, sender, participant, violationLinks, message, msgKey) {
  const violationKey = `${chatId}:${sender}`;
  const currentCount = (linkViolations.get(violationKey) || 0) + 1;
  linkViolations.set(violationKey, currentCount);
  
  // Hapus pesan yang mengandung link
  try {
    await sock.sendMessage(chatId, {
      delete: {
        remoteJid: chatId,
        fromMe: false,
        id: msgKey.id,
        participant: sender
      }
    });
  } catch (e) {
    console.log('Gagal menghapus pesan:', e);
  }
  
  const domains = violationLinks.join(', ');
  
  if (ANTI_LINK_CONFIG.action === 'kick') {
    // Langsung kick jika config atau sudah melebihi warning
    if (ANTI_LINK_CONFIG.warningCount <= 1 || currentCount >= ANTI_LINK_CONFIG.warningCount) {
      // Kick participant
      try {
        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
        
        // Kirim notifikasi
        await sock.sendMessage(chatId, {
          text: createInfoMessage(`🚫 @${sender.split('@')[0]} telah di-kick karena mengirim link terlarang: ${domains}\nTotal pelanggaran: ${currentCount}x`),
          mentions: [sender]
        });
        
        // Reset counter
        linkViolations.delete(violationKey);
      } catch (error) {
        console.error('Gagal kick member:', error);
      }
    } else {
      // Kirim warning
      await sock.sendMessage(chatId, {
        text: createInfoMessage(`⚠️ Peringatan ${currentCount}/${ANTI_LINK_CONFIG.warningCount} untuk @${sender.split('@')[0]}\nDilarang mengirim link: ${domains}`),
        mentions: [sender]
      });
    }
  } else if (ANTI_LINK_CONFIG.action === 'warn') {
    // Hanya warning
    await sock.sendMessage(chatId, {
      text: createInfoMessage(`⚠️ @${sender.split('@')[0]} mengirim link terlarang: ${domains}\nPelanggaran ke-${currentCount}`),
      mentions: [sender]
    });
  }
  
  // Auto reset counter setelah 1 jam
  setTimeout(() => {
    if (linkViolations.get(violationKey) === currentCount) {
      linkViolations.delete(violationKey);
    }
  }, 3600000);
}

// Command untuk reset violations
const resetViolationsCmd = {
  name: 'resetviolations',
  description: 'Reset pelanggaran anti-link member',
  usage: '<@tag> atau all',
  example: '.resetviolations @member',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      if (args[0] === 'all') {
        // Hapus semua violations di group ini
        for (const key of linkViolations.keys()) {
          if (key.startsWith(chatId)) {
            linkViolations.delete(key);
          }
        }
        await sock.sendMessage(chatId, {
          text: createInfoMessage('✅ Semua pelanggaran di group ini telah direset.')
        });
      } else {
        // Reset untuk member tertentu
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        mentioned.forEach(sender => {
          if (sender !== sock.user.id) {
            linkViolations.delete(`${chatId}:${sender}`);
          }
        });
        
        if (mentioned.length > 0) {
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`✅ Pelanggaran telah direset untuk ${mentioned.length} member.`)
          });
        } else {
          await sock.sendMessage(chatId, {
            text: createInfoMessage('Tag member yang ingin direset pelanggarannya.')
          });
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Reset violations error:', error);
      return {
        success: false,
        message: createInfoMessage('Gagal reset pelanggaran.')
      };
    }
  },
};

// Ekspor setup function dan additional command
module.exports.setup = setupAntiLinkSystem;
module.exports.resetViolations = resetViolationsCmd;