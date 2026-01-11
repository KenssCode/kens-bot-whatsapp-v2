const pino = require('pino');
const config = require('../config/config');

let store = null;
const logger = pino({ level: config.logLevel || 'silent' });

async function getStoreInstance() {
  if (!store) {
    // Perbaikan cara import di Node.js v22
    const baileys = await import('@whiskeysockets/baileys');
    // Cari makeInMemoryStore di dalam object baileys
    const createStore = baileys.default?.makeInMemoryStore || baileys.makeInMemoryStore;
    
    store = createStore({ logger });
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