module.exports = async function antiScamAutoReply(sock, message) {
  try {
    const chatId = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;
    
    // Cek apakah ini grup
    if (!chatId.endsWith('@g.us')) return;
    
    // Ambil metadata grup untuk cek admin
    const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
    if (!groupMetadata) return;
    
    // Cek apakah pengirim adalah admin
    const isAdmin = groupMetadata.participants.find(
      p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    
    // Jika pengirim admin, IGNORE (tidak reply)
    if (isAdmin) return;
    
    const text = (message.message?.conversation || '').toLowerCase();
    
    // Kata-kata scam trigger
    const scamTriggers = [
      '100% aman',
      'terpercaya',
      'legit pasti',
      'aman terjamin',
      'no tipu',
      'trust me',
      'garansi',
      'dijamin',
      'no scam'
    ];
    
    // Cek trigger
    const detected = scamTriggers.filter(trigger => text.includes(trigger));
    
    if (detected.length > 0) {
      // Delay reply
      setTimeout(() => {
        sock.sendMessage(chatId, {
          text: `⚠️ *PERINGATAN SCAM DETEKSI*\n\nPesan mengandung kata: "${detected[0]}"\n\nHati-hati dengan penawaran yang terlalu meyakinkan. Selalu gunakan middleman / MC untuk transaksi aman.`
        });
      }, 1500);
    }
  } catch (error) {
    console.error('Error in anti-scam auto-reply:', error);
  }
};