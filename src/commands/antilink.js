const { createInfoMessage } = require('../lib/utils');

// Configurable settings
const ANTI_LINK_CONFIG = {
  enabled: true,
  whitelist: ['wa.me', 'facebook.com', 'twitter.com', 'youtube.com', 'youtu.be'], // Domain yang diizinkan
  adminImmunity: true
};

// Store untuk tracking pelanggaran
const linkViolations = new Map();

module.exports = {
  name: 'antilink',
  description: 'Auto hapus pesan yang mengandung link',
  usage: '<on/off/list/add>',
  example: '.antilink on',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      if (args[0] === 'on') {
        ANTI_LINK_CONFIG.enabled = true;
        await sock.sendMessage(chatId, {
          text: createInfoMessage('Anti-link system diaktifkan! Bot akan auto hapus pesan yang mengandung link.')
        });
      } else if (args[0] === 'off') {
        ANTI_LINK_CONFIG.enabled = false;
        await sock.sendMessage(chatId, {
          text: createInfoMessage('Anti-link system dimatikan.')
        });
      } else if (args[0] === 'list') {
        const whitelist = ANTI_LINK_CONFIG.whitelist.join('\n- ');
        await sock.sendMessage(chatId, {
          text: createInfoMessage(`Domain whitelist:\n- ${whitelist}\n\nTotal: ${ANTI_LINK_CONFIG.whitelist.length} domain`)
        });
      } else if (args[0] === 'add' && args[1]) {
        const domain = args[1].toLowerCase().replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        if (!ANTI_LINK_CONFIG.whitelist.includes(domain)) {
          ANTI_LINK_CONFIG.whitelist.push(domain);
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`Domain "${domain}" ditambahkan ke whitelist.`)
          });
        } else {
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`Domain "${domain}" sudah ada di whitelist.`)
          });
        }
      } else if (args[0] === 'remove' && args[1]) {
        const domain = args[1].toLowerCase();
        const index = ANTI_LINK_CONFIG.whitelist.indexOf(domain);
        if (index > -1) {
          ANTI_LINK_CONFIG.whitelist.splice(index, 1);
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`Domain "${domain}" dihapus dari whitelist.`)
          });
        } else {
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`Domain "${domain}" tidak ditemukan di whitelist.`)
          });
        }
      } else if (args[0] === 'status') {
        const violations = Array.from(linkViolations.entries())
          .filter(([key]) => key.startsWith(chatId))
          .length;
        
        await sock.sendMessage(chatId, {
          text: createInfoMessage(
            `Status Anti-Link\n\n` +
            `Status: ${ANTI_LINK_CONFIG.enabled ? 'AKTIF' : 'NONAKTIF'}\n` +
            `Action: Hapus pesan link\n` +
            `Immunity: ${ANTI_LINK_CONFIG.adminImmunity ? 'Admin' : 'Tidak'}\n` +
            `Pelanggaran aktif: ${violations}\n` +
            `Whitelist: ${ANTI_LINK_CONFIG.whitelist.length} domain`
          )
        });
      } else {
        const status = ANTI_LINK_CONFIG.enabled ? 'AKTIF' : 'NONAKTIF';
        await sock.sendMessage(chatId, {
          text: createInfoMessage(
            `Anti-link System\n\n` +
            `Status: ${status}\n\n` +
            `Penggunaan:\n` +
            `- .antilink on/off\n` +
            `- .antilink list\n` +
            `- .antilink add <domain>\n` +
            `- .antilink remove <domain>\n` +
            `- .antilink status\n\n` +
            `Reset pelanggaran:\n` +
            `- .resetviolations @member\n` +
            `- .resetviolations all`
          )
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
        // Skip pesan dari bot sendiri
        if (msg.key.fromMe) continue;
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const message = msg.message;
        
        // Cek apakah ini group chat
        if (!chatId?.endsWith('@g.us')) continue;
        
        // Cek apakah pesan mengandung link
        const detectedLinks = extractLinksFromMessage(message);
        if (detectedLinks.length === 0) continue;
        
        // Ambil metadata grup
        let groupMetadata;
        try {
          groupMetadata = await sock.groupMetadata(chatId);
        } catch (e) {
          console.error('Gagal ambil metadata grup:', e.message);
          continue;
        }
        
        // Cari participant dengan JID yang benar
        const participants = groupMetadata.participants || [];
        let participant = participants.find(p => p.id === sender);
        
        // Jika tidak ditemukan dengan exact match, coba cari dengan partial match
        if (!participant) {
          participant = participants.find(p => 
            p.id.includes(sender.split('@')[0]) || 
            sender.includes(p.id.split('@')[0])
          );
        }
        
        // Cek immunity
        if (checkImmunity(participant)) {
          console.log(`[ANTI-LINK] Immunity: ${sender} adalah admin`);
          continue;
        }
        
        // Cek apakah link termasuk whitelist
        const violationLinks = detectedLinks.filter(link => 
          !isWhitelisted(link)
        );
        
        if (violationLinks.length > 0) {
          console.log(`[ANTI-LINK] Violation detected: ${sender} sent ${violationLinks.length} links`);
          // Hapus pesan yang mengandung link
          await handleLinkViolation(sock, chatId, sender, violationLinks, msg.key);
        } else {
          console.log(`[ANTI-LINK] Whitelisted links from ${sender}`);
        }
        
      } catch (error) {
        console.error('Anti-link detection error:', error.message);
      }
    }
  });
}

// Helper functions
function extractLinksFromMessage(message) {
  const links = [];
  
  if (!message) return links;
  
  // Extract dari berbagai tipe pesan
  let text = '';
  
  if (message.conversation) {
    text = message.conversation;
  } else if (message.extendedTextMessage?.text) {
    text = message.extendedTextMessage.text;
  } else if (message.imageMessage?.caption) {
    text = message.imageMessage.caption || '';
  } else if (message.videoMessage?.caption) {
    text = message.videoMessage?.caption || '';
  } else if (message.documentMessage?.caption) {
    text = message.documentMessage.caption || '';
  }
  
  if (!text) return links;
  
  // Regex untuk deteksi URL (lebih komprehensif)
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/[^\s]*)?/gi;
  const found = text.match(urlRegex) || [];
  
  // Filter dan normalisasi URLs
  found.forEach(url => {
    try {
      // Bersihkan URL
      let cleanUrl = url.toLowerCase().trim();
      
      // Tambahkan http:// jika tidak ada
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'http://' + cleanUrl;
      }
      
      // Parse URL dan ambil hostname
      const urlObj = new URL(cleanUrl);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // Hanya tambah jika valid dan belum ada
      if (hostname && !links.includes(hostname)) {
        links.push(hostname);
      }
    } catch (e) {
      // Skip invalid URLs
      console.log(`Invalid URL skipped: ${url}`);
    }
  });
  
  return links;
}

function isWhitelisted(domain) {
  if (!domain) return false;
  
  return ANTI_LINK_CONFIG.whitelist.some(whitelistDomain => {
    // Exact match atau subdomain match
    return domain === whitelistDomain || 
           domain.endsWith('.' + whitelistDomain) ||
           whitelistDomain.endsWith('.' + domain);
  });
}

function checkImmunity(participant) {
  if (!participant) return false;
  
  if (ANTI_LINK_CONFIG.adminImmunity) {
    if (participant.admin === 'admin' || 
        participant.admin === 'superadmin' || 
        participant.admin === true) {
      return true;
    }
  }
  
  return false;
}

async function handleLinkViolation(sock, chatId, sender, violationLinks, msgKey) {
  const violationKey = `${chatId}:${sender}`;
  const currentCount = (linkViolations.get(violationKey) || 0) + 1;
  linkViolations.set(violationKey, currentCount);
  
  console.log(`[ANTI-LINK] Violation ${currentCount} for ${sender}: ${violationLinks.join(', ')}`);
  
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
    console.log(`[ANTI-LINK] Message deleted`);
  } catch (e) {
    console.log('[ANTI-LINK] Gagal menghapus pesan:', e.message);
  }
  
  // Auto reset counter setelah 1 jam
  setTimeout(() => {
    if (linkViolations.get(violationKey) === currentCount) {
      linkViolations.delete(violationKey);
      console.log(`[ANTI-LINK] Auto reset violations for ${sender}`);
    }
  }, 3600000);
}

// Command untuk reset violations
module.exports.resetViolations = {
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
        let count = 0;
        for (const key of linkViolations.keys()) {
          if (key.startsWith(chatId)) {
            linkViolations.delete(key);
            count++;
          }
        }
        await sock.sendMessage(chatId, {
          text: createInfoMessage(`${count} pelanggaran di group ini telah direset.`)
        });
      } else {
        // Reset untuk member tertentu
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        let count = 0;
        
        mentioned.forEach(sender => {
          if (sender !== sock.user?.id) {
            const key = `${chatId}:${sender}`;
            if (linkViolations.has(key)) {
              linkViolations.delete(key);
              count++;
            }
          }
        });
        
        if (count > 0) {
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`Pelanggaran telah direset untuk ${count} member.`)
          });
        } else if (mentioned.length > 0) {
          await sock.sendMessage(chatId, {
            text: createInfoMessage(`Tidak ada pelanggaran yang ditemukan untuk member tersebut.`)
          });
        } else {
          await sock.sendMessage(chatId, {
            text: createInfoMessage('Tag member yang ingin direset pelanggarannya.\nContoh: .resetviolations @member')
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

// Ekspor setup function
module.exports.setup = setupAntiLinkSystem;

