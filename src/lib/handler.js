/**
 * Command Handler - Fixed Admin Logic
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { createErrorMessage, createWarningMessage } = require('../lib/utils');

const commands = new Map();

function loadCommands() {
  const commandsDir = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsDir)) {
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
}

function getCommand(name) {
  return commands.get(name.toLowerCase());
}

function getAllCommands() {
  return Array.from(commands.values());
}

function hasCommand(name) {
  return commands.has(name.toLowerCase());
}

async function executeCommand(commandName, sock, message, args) {
  const command = getCommand(commandName);
  
  if (!command) return null; // Abaikan jika bukan command
  
  try {
    if (command.onlyGroup && !message.isGroup) {
      return {
        success: false,
        message: createWarningMessage('Command ini hanya dapat digunakan di dalam grup.')
      };
    }
    
    // --- PERBAIKAN LOGIKA ADMIN DI SINI ---
    // Cek apakah command butuh admin, DAN apakah si pengirim BUKAN admin
    if (command.requireAdmin && !message.isSenderAdmin) {
      return {
        success: false,
        message: createWarningMessage('Maaf, command ini hanya bisa digunakan oleh Admin Grup!')
      };
    }

    if (command.execute) {
      return await command.execute(sock, message, args);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error executing command .${commandName}:`, error);
    return {
      success: false,
      message: createErrorMessage(error)
    };
  }
}

// Fungsi lain (generateHelpText, dll) tetap sama
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
  helpText += `Bot Online 24 Jam | 🚀`;
  return helpText;
}

function getCommandHelp(commandName) {
  const command = getCommand(commandName);
  if (!command) return `Command .${commandName} tidak ditemukan.`;
  let helpText = `📖 *BANTUAN COMMAND: .${commandName}* 📖\n\n`;
  if (command.description) helpText += `*Deskripsi:*\n${command.description}\n\n`;
  if (command.usage) helpText += `*Penggunaan:*\n${config.commandPrefix}${command.name} ${command.usage}\n\n`;
  if (command.requireAdmin) helpText += `*Mode:* Admin Only\n\n`;
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