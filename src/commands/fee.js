/**
 * Command: .fee
 * Menampilkan harga/rekber fee untuk transaksi (Fixed Tiered Logic)
 */

const config = require('../config/config');
const { formatCurrency, createInfoMessage } = require('../lib/utils');

module.exports = {
  name: 'fee',
  description: 'Menampilkan informasi biaya rekber (fee)',
  usage: '[jumlah_transaksi]',
  example: '150000',
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      let feeInfo = `💰 *INFORMASI FEE REKBER* 💰\n\n`;
      feeInfo += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      if (args.length > 0) {
        // AMBIL ANGKA SAJA (Auto kalkulator)
        const amount = parseInt(args[0].replace(/[^0-9]/g, ''));
        
        if (isNaN(amount) || amount <= 0) {
          return { 
            success: false, 
            message: createInfoMessage('Masukkan jumlah yang valid. Contoh: .fee 150000') 
          };
        }
        
        // --- LOGIKA TIERING SESUAI REQUEST ---
        let fee = 0;
        if (amount >= 1000 && amount <= 99000) {
          fee = 2000;
        } else if (amount >= 100000 && amount <= 499000) {
          fee = 5000;
        } else if (amount >= 500000 && amount <= 999000) {
          fee = 10000;
        } else if (amount >= 1000000) {
          fee = 20000;
        } else {
          fee = 0; // Di bawah 1.000 gratis
        }

        const total = amount + fee;
        
        feeInfo += `*RINCIAN TRANSAKSI:*\n\n`;
        feeInfo += `├─ Harga Barang: ${formatCurrency(amount)}\n`;
        feeInfo += `├─ Biaya Admin: ${formatCurrency(fee)}\n`;
        feeInfo += `├─ *Total Bayar: ${formatCurrency(total)}*\n\n`;
        feeInfo += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        feeInfo += `*Detail Pembayaran:*\n`;
        feeInfo += `• Buyer bayar ke Admin: ${formatCurrency(total)}\n`;
        feeInfo += `• Seller terima dari Admin: ${formatCurrency(amount)}\n`;
      } else {
        // JIKA HANYA KETIK .FEE (DAFTAR HARGA)
        feeInfo += `*Daftar Biaya Rekber:*\n\n`;
        feeInfo += `🔸 1.000 - 99.000 = ${formatCurrency(2000)}\n`;
        feeInfo += `🔸 100.000 - 499.000 = ${formatCurrency(5000)}\n`;
        feeInfo += `🔸 500.000 - 999.000 = ${formatCurrency(10000)}\n`;
        feeInfo += `🔸 1.000.000++ = ${formatCurrency(20000)}\n\n`;
        feeInfo += `💡 Ketik: *.fee <jumlah>* untuk langsung menghitung total bayar.`;
      }
      
      feeInfo += `\n\n🤝 Aman • Terpercaya • 24 Jam`;
      
      await sock.sendMessage(chatId, {
        text: feeInfo
      }, { quoted: message });
      
      return { success: true };
    } catch (error) {
      console.error('Error in fee command:', error);
      return { success: false, message: error.message };
    }
  }
};