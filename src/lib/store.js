const pino = require('pino');
const config = require('../config/config');

let store = null;
const logger = pino({ level: config.logLevel || 'silent' });

async function getStoreInstance() {
  if (!store) {
    const baileys = await import('@whiskeysockets/baileys');
    
    // Berdasarkan log kamu, kita ambil dari baileys.default
    // Karena di log tertulis ada 'default' di dalam list tersebut
    const makeInMemoryStore = baileys.makeInMemoryStore || 
                            (baileys.default && baileys.default.makeInMemoryStore) ? baileys.default.makeInMemoryStore : null;

    if (typeof makeInMemoryStore !== 'function') {
      // Jika masih gagal, kita paksa pakai require tapi khusus di baris ini saja
      try {
        const { makeInMemoryStore: mks } = require('@whiskeysockets/baileys');
        store = mks({ logger });
      } catch (e) {
        throw new Error("Gagal total mengambil makeInMemoryStore. Coba restart server Railway kamu.");
      }
    } else {
      store = makeInMemoryStore({ logger });
    }
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