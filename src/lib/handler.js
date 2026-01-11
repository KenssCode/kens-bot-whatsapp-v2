/**
 * Command Handler
 * Sistem untuk mengelola command bot
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { createErrorMessage, createWarningMessage } = require('../lib/utils');

// Map untuk menyimpan command
const commands = new Map();

/**
 * Load semua command dari folder commands
 */
function loadCommands() {
  const commandsDir = path.join(__dirname, '../commands');
  
  if (!fs.existsSync(commandsDir)) {
    console.log('Commands directory not found, creating...');
    fs.mkdirSync(commandsDir, { recursive: true });
    return;
  }
  
  const files = fs.readdirSync(commandsDir);
  
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    
    const commandPath = path.join(commandsDir, file);
    const command = require(commandPath);
    
    if (command.name) {
      commands.set(command.name, command);
      console.log(`Loaded command: .${command.name}`);
    }
  });
  
  console.log(`Total commands loaded: ${commands.size}`);
}

/**
 * Get command by name
 */
function getCommand(name) {
  return commands.get(name.toLowerCase());
}

/**
 * Get all commands
 */
function getAllCommands() {
  return Array.from(commands.values());
}

/**
 * Check if command exists
 */
function hasCommand(name) {
  return commands.has(name.toLowerCase());
}

/**
 * Execute command
 */
async function executeCommand(commandName, sock, message, args) {
  const command = getCommand(commandName);
  
  if (!command) {
    return {
      success: false,
      message: `Command .${commandName} tidak ditemukan.\nKetik .help untuk melihat daftar command.`
    };
  }
  
  try {
    // Check if command is only for groups
    if (command.onlyGroup && !message.isGroup) {
      return {
        success: false,
        message: createWarningMessage('Command ini hanya dapat digunakan di dalam grup.')
      };
    }
    
    // Check if command requires admin
    if (command.requireAdmin && !message.isBotAdmin) {
      return {
        success: false,
        message: createWarningMessage('Command ini hanya dapat digunakan oleh admin.')
      };
    }
    
    // Execute command
    if (command.execute) {
      const result = await command.execute(sock, message, args);
      return result;
    }
    
    return {
      success: true,
      message: 'Command executed successfully'
    };
  } catch (error) {
    console.error(`Error executing command .${commandName}:`, error);
    return {
      success: false,
      message: createErrorMessage(error)
    };
  }
}

/**
 * Help text generator
 */
function generateHelpText() {
  let helpText = `📋 *DAFTAR COMMAND BOT* 📋\n\n`;
  helpText += `Prefix: ${config.commandPrefix}\n`;
  helpText += `Bot: ${config.groupName}\n\n`;
  helpText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  commands.forEach(command => {
    const usage = command.usage || '';
    const description = command.description || 'Tidak ada deskripsi';
    const onlyAdmin = command.requireAdmin ? ' (Admin Only)' : '';
    
    helpText += `${config.commandPrefix}${command.name} ${usage}\n`;
    helpText += `└─ ${description}${onlyAdmin}\n\n`;
  });
  
  helpText += `━━━━━━━━━━━━━━━━━━━━\n`;
  helpText += `🔰 *Catatan:*\n`;
  helpText += `• Command dengan label "Admin Only" hanya dapat digunakan oleh admin grup.\n`;
  helpText += `• Beberapa command memerlukan reply pada pesan tertentu.\n`;
  helpText += `• Ketik ${config.commandPrefix}help <nama_command> untuk info detail.\n\n`;
  helpText += `Bot Online 24 Jam | 🚀`;
  
  return helpText;
}

/**
 * Get command help
 */
function getCommandHelp(commandName) {
  const command = getCommand(commandName);
  
  if (!command) {
    return `Command .${commandName} tidak ditemukan.`;
  }
  
  let helpText = `📖 *BANTUAN COMMAND: .${commandName}* 📖\n\n`;
  helpText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (command.description) {
    helpText += `*Deskripsi:*\n${command.description}\n\n`;
  }
  
  if (command.usage) {
    helpText += `*Penggunaan:*\n${config.commandPrefix}${command.name} ${command.usage}\n\n`;
  }
  
  if (command.example) {
    helpText += `*Contoh:*\n${config.commandPrefix}${command.name} ${command.example}\n\n`;
  }
  
  if (command.requireAdmin) {
    helpText += `*Mode:* Admin Only\n\n`;
  }
  
  if (command.onlyGroup) {
    helpText += `*Mode:* Hanya di Grup\n\n`;
  }
  
  helpText += `━━━━━━━━━━━━━━━━━━━━`;
  
  return helpText;
}

module.exports = {
  commands,
  loadCommands,
  getCommand,
  getAllCommands,
  hasCommand,
  executeCommand,
  generateHelpText,
  getCommandHelp
};

