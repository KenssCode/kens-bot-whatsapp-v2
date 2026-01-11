const pino = require('pino');
const config = require('../config/config');

let store = null;
const logger = pino({ level: config.logLevel || 'silent' });

async function getStoreInstance() {
  if (!store) {
    const baileys = await import('@whiskeysockets/baileys');
    
    // Logika pencarian fungsi yang lebih kuat
    let makeInMemoryStore = baileys.makeInMemoryStore || 
                            baileys.default?.makeInMemoryStore || 
                            (baileys.default && baileys.default.default ? baileys.default.default.makeInMemoryStore : null);
    
    // Jika masih gagal, kita ambil dari properti manapun yang bernama makeInMemoryStore
    if (!makeInMemoryStore) {
        const keys = Object.keys(baileys);
        for (const key of keys) {
            if (baileys[key]?.makeInMemoryStore) {
                makeInMemoryStore = baileys[key].makeInMemoryStore;
                break;
            }
        }
    }

    if (typeof makeInMemoryStore !== 'function') {
      console.error("Struktur Baileys yang diterima:", Object.keys(baileys));
      throw new Error("Gagal mengambil fungsi makeInMemoryStore dari Baileys. Pastikan versi library benar.");
    }
    
    store = makeInMemoryStore({ logger });
  }
  return store;
}

async function bindSocket(sock) {
  const currentStore = await getStoreInstance();
  if (currentStore && typeof currentStore.bind === 'function') {
    currentStore.bind(sock.ev);
  }
}

module.exports = {
  bindSocket,
  logger,
  get store() { return store; }
};