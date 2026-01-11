const pino = require('pino');
const config = require('../config/config');

let store = null;
const logger = pino({ level: config.logLevel || 'silent' });

async function getStoreInstance() {
  if (!store) {
    const baileys = await import('@whiskeysockets/baileys');
    
    // Ini cara paling aman memanggil makeInMemoryStore di ESM
    const makeInMemoryStore = baileys.default?.makeInMemoryStore || baileys.makeInMemoryStore;
    
    if (typeof makeInMemoryStore !== 'function') {
      throw new Error("Gagal mengambil fungsi makeInMemoryStore dari Baileys");
    }
    
    store = makeInMemoryStore({ logger });
  }
  return store;
}

async function bindSocket(sock) {
  const currentStore = await getStoreInstance();
  currentStore.bind(sock.ev);
}

module.exports = {
  bindSocket,
  logger,
  get store() { return store; }
};