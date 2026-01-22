const config = require('../config/config');

module.exports = {
  name: 'autoreply',
  description: ' Auto reply (Admin Only) ',
  usage: '<add|list|del> <kata_kunci> <balasan>',
  example: '.autoreply add halo hai juga',
  onlyGroup: true,
  requireAdmin: true,
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      if (args.length === 0) {
        return { 
          success: false, 
          message: `*Format Salah!*\n\n` +
                   `📌 *Cara Penggunaan:*\n` +
                   `• ${config.commandPrefix}autoreply add <kata_kunci> <balasan>\n` +
                   `• ${config.commandPrefix}autoreply list\n` +
                   `• ${config.commandPrefix}autoreply del <kata_kunci>\n\n` +
                   `*Contoh:*\n` +
                   `• ${config.commandPrefix}autoreply add halo hai juga!\n` +
                   `• ${config.commandPrefix}autoreply del halo`
        };
      }

      const subCommand = args[0].toLowerCase();
      const autoReplyData = global.autoReplyData || {};
      
      if (subCommand === 'add') {
        // Format: autoreply add <kata_kunci> <balasan>
        const keyword = args[1]?.toLowerCase();
        const response = args.slice(2).join(' ');
        
        if (!keyword || !response) {
          return { 
            success: false, 
            message: 'Format salah!\nContoh: .autoreply add halo hai juga' 
          };
        }
        
        autoReplyData[keyword] = response;
        global.autoReplyData = autoReplyData;
        
        return { 
          success: true, 
          message: `✅ *Auto Reply Ditambahkan!*\n\n` +
                   `🔑 Kata Kunci: "${keyword}"\n` +
                   `💬 Balasan: "${response}"` 
        };
      } 
      
      else if (subCommand === 'list') {
        const entries = Object.entries(autoReplyData);
        if (entries.length === 0) {
          return { 
            success: true, 
            message: '📭 *Belum ada auto reply tersimpan!*' 
          };
        }
        
        let listMsg = `📋 *DAFTAR AUTO REPLY* 📋\n\n`;
        entries.forEach(([key, value], index) => {
          listMsg += `${index + 1}. 🔑 *"${key}"* → "${value}"\n`;
        });
        
        return { success: true, message: listMsg };
      } 
      
      else if (subCommand === 'del' || subCommand === 'delete') {
        const keyword = args[1]?.toLowerCase();
        
        if (!keyword) {
          return { 
            success: false, 
            message: 'Masukkan kata kunci yang ingin dihapus!\nContoh: .autoreply del halo' 
          };
        }
        
        if (!autoReplyData[keyword]) {
          return { 
            success: false, 
            message: `Kata kunci "${keyword}" tidak ditemukan!` 
          };
        }
        
        delete autoReplyData[keyword];
        global.autoReplyData = autoReplyData;
        
        return { 
          success: true, 
          message: `✅ *Auto Reply "${keyword}" Berhasil Dihapus!*` 
        };
      } 
      
      else {
        return { 
          success: false, 
          message: 'Command tidak dikenali! Gunakan: add, list, atau del' 
        };
      }
    } catch (error) {
      console.error('Error in autoreply command:', error);
      return { success: false, message: 'Gagal mengelola auto reply.' };
    }
  }
};

// Initialize global auto reply data if not exists
if (!global.autoReplyData) {
  global.autoReplyData = {};
}

