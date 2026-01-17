/**
 * Command Handler - Enhanced Version with Anti-Link Support
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { createErrorMessage, createWarningMessage, createInfoMessage } = require('../lib/utils');

const commands = new Map();
const groupAdminCache = new Map(); // Cache admin status
const commandCooldown = new Map(); // Cooldown system

function loadCommands() {
  const commandsDir = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsDir)) {
    console.warn(`⚠️  Commands directory not found: ${commandsDir}`);
    fs.mkdirSync(commandsDir, { recursive: true });
    return;
  }
  
  const files = fs.readdirSync(commandsDir);
  let loadedCount = 0;
  
  // Load anti-link module pertama (jika ada)
  const antiLinkFile = path.join(commandsDir, 'antilink.js');
  if (fs.existsSync(antiLinkFile)) {
    try {
      delete require.cache[require.resolve(antiLinkFile)];
      const antiLinkModule = require(antiLinkFile);
      
      // Load main command
      if (antiLinkModule.name && antiLinkModule.execute) {
        commands.set(antiLinkModule.name.toLowerCase(), antiLinkModule);
        console.log(`🛡️  Loaded anti-link command: .${antiLinkModule.name}`);
        loadedCount++;
      }
      
      // Load additional resetViolations command
      if (antiLinkModule.resetViolations) {
        commands.set('resetviolations', antiLinkModule.resetViolations);
        console.log(`🛡️  Loaded anti-link subcommand: .resetviolations`);
        loadedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to load anti-link command:`, error.message);
    }
  }
  
  // Load semua command lainnya
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    if (file === 'antilink.js') return; // Sudah di-load
    
    try {
      const commandPath = path.join(commandsDir, file);
      delete require.cache[require.resolve(commandPath)];
      const command = require(commandPath);
      
      if (command.name && command.execute) {
        commands.set(command.name.toLowerCase(), command);
        console.log(`✅ Loaded command: .${command.name} (${file})`);
        loadedCount++;
        
        // Load aliases jika ada
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => {
            commands.set(alias.toLowerCase(), command);
            console.log(`   └─ Alias: .${alias}`);
          });
        }
      } else {
        console.warn(`⚠️  Skipping invalid command file: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load command ${file}:`, error.message);
    }
  });
  
  console.log(`📦 Total commands loaded: ${loadedCount}`);
  return loadedCount;
}

function getCommand(name) {
  return commands.get(name.toLowerCase());
}

function getAllCommands() {
  const uniqueCommands = new Map();
  for (const [key, command] of commands.entries()) {
    if (!uniqueCommands.has(command.name)) {
      uniqueCommands.set(command.name, command);
    }
  }
  return Array.from(uniqueCommands.values());
}

function hasCommand(name) {
  return commands.has(name.toLowerCase());
}

// Enhanced cache system untuk admin
async function isUserAdmin(sock, chatId, userId) {
  // Normalize JID
  function normalizeJid(jid) {
    if (!jid) return null;
    if (jid.endsWith('@s.whatsapp.net')) return jid;
    if (jid.includes(':')) {
      return jid.split(':')[0] + '@s.whatsapp.net';
    }
    return jid.replace(/@.+$/, '') + '@s.whatsapp.net';
  }
  
  try {
    const normalizedUserId = normalizeJid(userId);
    
    // Cek cache dulu
    const cacheKey = `${chatId}:${normalizedUserId}`;
    if (groupAdminCache.has(cacheKey)) {
      return groupAdminCache.get(cacheKey);
    }
    
    // Ambil metadata grup
    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata.participants || [];
    
    // Cari participant dengan berbagai format
    let participant = null;
    for (const p of participants) {
      const normalizedParticipantId = normalizeJid(p.id);
      if (normalizedParticipantId === normalizedUserId || 
          p.id === userId || 
          (normalizedUserId && p.id?.startsWith(normalizedUserId.split('@')[0]))) {
        participant = p;
        break;
      }
    }
    
    const isAdmin = participant && (
      participant.admin === 'admin' || 
      participant.admin === 'superadmin' || 
      participant.admin === true
    );
    
    // Simpan ke cache (expire dalam 30 detik)
    groupAdminCache.set(cacheKey, isAdmin);
    setTimeout(() => groupAdminCache.delete(cacheKey), 30000);
    
    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error.message);
    return false;
  }
}

// Cooldown system untuk mencegah spam
function checkCooldown(userId, commandName) {
  const cooldownTime = 2000; // 2 detik cooldown
  const key = `${userId}:${commandName}`;
  
  if (commandCooldown.has(key)) {
    const lastUsed = commandCooldown.get(key);
    const timeLeft = cooldownTime - (Date.now() - lastUsed);
    
    if (timeLeft > 0) {
      return Math.ceil(timeLeft / 1000); // Kembalikan dalam detik
    }
  }
  
  commandCooldown.set(key, Date.now());
  setTimeout(() => commandCooldown.delete(key), cooldownTime);
  return 0;
}

async function executeCommand(commandName, sock, message, args) {
  const command = getCommand(commandName);
  
  if (!command) {
    return {
      success: false,
      message: createInfoMessage(`Command ".${commandName}" tidak ditemukan. Ketik *.help* untuk melihat daftar command.`)
    };
  }
  
  const startTime = Date.now();
  const userId = message.key.participant || message.key.remoteJid;
  const chatId = message.key.remoteJid;
  
  try {
    // Log command execution
    console.log(`🔧 [CMD] .${commandName} by ${userId.slice(0, 15)}... in ${chatId}`);
    
    // Cek cooldown
    const cooldownLeft = checkCooldown(userId, commandName);
    if (cooldownLeft > 0) {
      return {
        success: false,
        message: createWarningMessage(`Tunggu ${cooldownLeft} detik sebelum menggunakan command ini lagi.`)
      };
    }
    
    // Cek grup only
    if (command.onlyGroup && !message.isGroup) {
      return {
        success: false,
        message: createWarningMessage('Command ini hanya dapat digunakan di dalam grup.')
      };
    }
    
    // Cek admin requirement
    if (command.requireAdmin) {
      // Jika sudah ada di message object (dari index.js), gunakan yang sudah dihitung
      if (typeof message.isSenderAdmin !== 'undefined') {
        if (!message.isSenderAdmin) {
          return {
            success: false,
            message: createWarningMessage('Maaf, command ini hanya bisa digunakan oleh Admin Grup!')
          };
        }
      } else {
        // Jika tidak, hitung ulang
        const isAdmin = await isUserAdmin(sock, chatId, userId);
        if (!isAdmin) {
          return {
            success: false,
            message: createWarningMessage('Maaf, command ini hanya bisa digunakan oleh Admin Grup!')
          };
        }
      }
    }
    
    // Cek bot admin untuk command tertentu
    if (command.requireBotAdmin && message.isGroup) {
      if (!message.isBotAdmin) {
        return {
          success: false,
          message: createWarningMessage('Bot harus menjadi admin grup untuk menggunakan command ini!')
        };
      }
    }
    
    // Eksekusi command dengan timeout
    const timeout = 30000; // 30 detik timeout
    const commandPromise = command.execute(sock, message, args);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Command timeout')), timeout);
    });
    
    const result = await Promise.race([commandPromise, timeoutPromise]);
    const execTime = Date.now() - startTime;
    
    console.log(`✅ [CMD] .${commandName} executed in ${execTime}ms`);
    
    // Format response jika perlu
    if (result && typeof result === 'object') {
      return result;
    } else if (result && typeof result === 'string') {
      return { success: true, message: result };
    } else {
      return { success: true };
    }
    
  } catch (error) {
    const execTime = Date.now() - startTime;
    console.error(`❌ [CMD] Error executing .${commandName} in ${execTime}ms:`, error.message);
    
    if (error.message === 'Command timeout') {
      return {
        success: false,
        message: createErrorMessage('Command timeout! Proses terlalu lama.')
      };
    }
    
    return {
      success: false,
      message: createErrorMessage(`Terjadi kesalahan: ${error.message || 'Unknown error'}`)
    };
  }
}

function generateHelpText(userId = '') {
  let helpText = `📋 *DAFTAR COMMAND BOT* 📋\n\n`;
  helpText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  const allCommands = getAllCommands();
  
  // Urutkan alfabetis
  allCommands.sort((a, b) => a.name.localeCompare(b.name));
  
  // Filter berdasarkan izin
  const publicCommands = allCommands.filter(cmd => !cmd.requireAdmin);
  const adminCommands = allCommands.filter(cmd => cmd.requireAdmin);
  const hiddenCommands = allCommands.filter(cmd => cmd.hidden);
  
  // Command umum
  if (publicCommands.length > 0) {
    helpText += `*COMMAND UMUM:*\n`;
    publicCommands.forEach(command => {
      if (command.hidden) return;
      const usage = command.usage ? ` ${command.usage}` : '';
      helpText += `• *.${command.name}${usage}* - ${command.description || 'Tanpa deskripsi'}\n`;
    });
    helpText += `\n`;
  }
  
  // Command admin
  if (adminCommands.length > 0) {
    helpText += `*COMMAND ADMIN:* 🔒\n`;
    adminCommands.forEach(command => {
      if (command.hidden) return;
      const usage = command.usage ? ` ${command.usage}` : '';
      helpText += `• *.${command.name}${usage}* - ${command.description || 'Tanpa deskripsi'}\n`;
    });
    helpText += `\n`;
  }
  
  // Info footer
  helpText += `━━━━━━━━━━━━━━━━━━━━\n`;
  helpText += `Prefix: ${config.commandPrefix || '.'}\n`;
  helpText += `Total: ${publicCommands.length + adminCommands.length - hiddenCommands.length} command\n`;
  helpText += `\nKetik *.help [command]* untuk info detail`;
  
  return helpText;
}

function getCommandHelp(commandName) {
  const command = getCommand(commandName);
  if (!command) {
    return `Command .${commandName} tidak ditemukan.\nKetik *.help* untuk melihat daftar command.`;
  }
  
  let helpText = `📖 *BANTUAN COMMAND: .${commandName}* 📖\n\n`;
  
  if (command.description) {
    helpText += `*Deskripsi:* ${command.description}\n\n`;
  }
  
  if (command.usage || command.example) {
    helpText += `*Penggunaan:*\n`;
    if (command.usage) {
      helpText += `\`${config.commandPrefix || '.'}${command.name} ${command.usage}\`\n`;
    }
    if (command.example) {
      helpText += `*Contoh:* ${command.example}\n`;
    }
    helpText += `\n`;
  }
  
  helpText += `*Informasi:*\n`;
  helpText += `• Group Only: ${command.onlyGroup ? '✅ Ya' : '❌ Tidak'}\n`;
  helpText += `• Admin Only: ${command.requireAdmin ? '✅ Ya' : '❌ Tidak'}\n`;
  helpText += `• Bot Admin: ${command.requireBotAdmin ? '✅ Diperlukan' : '❌ Tidak'}\n`;
  
  if (command.aliases && command.aliases.length > 0) {
    helpText += `• Alias: ${command.aliases.map(a => `.${a}`).join(', ')}\n`;
  }
  
  if (command.cooldown) {
    helpText += `• Cooldown: ${command.cooldown} detik\n`;
  }
  
  return helpText;
}

// Fungsi untuk reload commands (hot reload)
function reloadCommands() {
  console.log('🔄 Reloading all commands...');
  commands.clear();
  groupAdminCache.clear();
  commandCooldown.clear();
  const count = loadCommands();
  console.log(`🔄 Reloaded ${count} commands`);
  return count;
}

// Cleanup cache secara berkala
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  
  // Clean old cooldown entries
  for (const [key, timestamp] of commandCooldown.entries()) {
    if (now - timestamp > 60000) { // 1 menit
      commandCooldown.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`🧹 Cleaned ${cleared} old cache entries`);
  }
}, 60000); // Setiap 1 menit

module.exports = {
  get commands() { return new Map(commands); }, // Read-only access
  loadCommands,
  reloadCommands,
  getCommand,
  getAllCommands,
  hasCommand,
  executeCommand,
  generateHelpText,
  getCommandHelp,
  isUserAdmin,
  checkCooldown
};