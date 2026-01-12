/**
 * Command: .shop
 * Menampilkan daftar barang yang dijual
 */

module.exports = {
  name: 'shop',
  description: 'Menampilkan daftar barang yang tersedia',
  usage: '',
  example: '',
  async execute(sock, message, args) {
    try {
      const chatId = message.key.remoteJid;
      
      const shopMessage = `🛒 *LIST BARANG JUAL* 🛒\n\n` +
                          `━━━━━━━━━━━━━━━━━━━━\n\n` +
                          `💰 *COIN*\n` +
                          `• Coin 1M = Rp 1.500\n\n` +
                          `👤 *AKUN*\n` +
                          `• Akun Ghostfinn = Rp 10.000\n` +
                          `• Akun Kraken = Rp 4.000\n` +
                          `• Akun Tumbal = Rp 1.800\n\n` +
                          `━━━━━━━━━━━━━━━━━━━━\n\n` +
                          `📞 *PEMBELIAN:*\n` +
                          `Chat owner untuk order!`;
      
      return { success: true, message: shopMessage };
    } catch (error) {
      console.error('Error in shop command:', error);
      return { success: false, message: 'Gagal menampilkan daftar shop.' };
    }
  }
};

