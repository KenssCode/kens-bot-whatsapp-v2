/**
 * Command: .help
 * Menampilkan daftar lengkap command bot
 */

const { generateHelpText, getCommandHelp } = require('../lib/handler');
const { createInfoMessage } = require('../lib/utils');
const config = require('../config/config');

module.exports = {
  name: 'help',
  description: ' Faftar command bot atau info command tertentu ',
  usage: '[ Nama Command ]',
  example: '',
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      if (args.length > 0) {
        // Show help for specific command
        const commandName = args[0].toLowerCase();
        const helpText = getCommandHelp(commandName);
        
        await sock.sendMessage(chatId, {
          text: helpText
        });
        
        return { success: true };
      }
      
      // Show all commands
      const helpText = generateHelpText();
      
      await sock.sendMessage(chatId, {
        text: helpText
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in help command:', error);
      return { success: false, message: error.message };
    }
  }
};

