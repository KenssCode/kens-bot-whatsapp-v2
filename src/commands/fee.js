/**
 * Command: .fee
 * Menampilkan harga/rekber fee untuk transaksi
 */

const config = require('../config/config');
const { formatCurrency, createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'fee',
  description: 'Menampilkan informasi biaya rekber (fee)',
  usage: '[jumlah_transaksi]',
  example: '1000000',
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      const feePercentage = config.feePercentage;
      
      let feeInfo = `💰 *INFORMASI FEE REKBER* 💰\n\n`;
      feeInfo += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      feeInfo += `*Persentase Fee:* ${feePercentage}%\n\n`;
      
      if (args.length > 0) {
        // Calculate fee for specific amount
        const amount = parseInt(args[0].replace(/[^0-9]/g, ''));
        
        if (isNaN(amount) || amount <= 0) {
          return { 
            success: false, 
            message: createInfoMessage('Masukkan jumlah yang valid. Contoh: .fee 1000000') 
          };
        }
        
        const fee = Math.ceil(amount * (feePercentage / 100));
        const total = amount + fee;
        
        feeInfo += `*Perhitungan Fee:*\n\n`;
        feeInfo += `├─ Harga Barang: ${formatCurrency(amount)}\n`;
        feeInfo += `├─ Fee (${feePercentage}%): ${formatCurrency(fee)}\n`;
        feeInfo += `├─ *Total: ${formatCurrency(total)}*\n\n`;
        feeInfo += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        feeInfo += `*Catatan:*\n`;
        feeInfo += `• Buyer membayar: ${formatCurrency(total)}\n`;
        feeInfo += `• Seller menerima: ${formatCurrency(amount)}\n`;
        feeInfo += `• Admin menerima: ${formatCurrency(fee)}\n`;
      } else {
        // General fee info
        feeInfo += `*Contoh Perhitungan:*\n\n`;
        feeInfo += `├─ 100.000 → Fee: ${formatCurrency(100000 * (feePercentage / 100))}\n`;
        feeInfo += `├─ 500.000 → Fee: ${formatCurrency(500000 * (feePercentage / 100))}\n`;
        feeInfo += `├─ 1.000.000 → Fee: ${formatCurrency(1000000 * (feePercentage / 100))}\n`;
        feeInfo += `├─ 5.000.000 → Fee: ${formatCurrency(5000000 * (feePercentage / 100))}\n`;
        feeInfo += `└─ 10.000.000 → Fee: ${formatCurrency(10000000 * (feePercentage / 100))}\n`;
      }
      
      feeInfo += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      feeInfo += `💡 Ketik: ${config.commandPrefix}fee <jumlah> untuk menghitung fee spesifik.\n\n`;
      feeInfo += `🤝 Aman • Terpercaya • 24 Jam`;
      
      await sock.sendMessage(chatId, {
        text: feeInfo
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in fee command:', error);
      return { success: false, message: error.message };
    }
  }
};

