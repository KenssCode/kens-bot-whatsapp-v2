/**
 * Store Management untuk Baileys - Fixed for ESM
 */

const pino = require('pino');
const config = require('../config/config');

// Inisialisasi variabel di luar agar bisa diakses fungsi lain
let store = null;

const logger = pino({
  level: config.logLevel || 'silent'
});

/**
 * Fungsi pembungkus untuk menangani Dynamic Import
 */
async function getStoreInstance() {
  if (!store) {
    // Trik dynamic import untuk fix ERR_REQUIRE_ESM
    const { makeInMemoryStore } = await import('@whiskeysockets/baileys');
    store = makeInMemoryStore({ logger });
  }
  return store;
}

/**
 * Bind store ke socket
 */
async function bindSocket(sock) {
  const currentStore = await getStoreInstance();
  currentStore.bind(sock.ev);
}

/**
 * Helper functions - Dibuat async agar bisa menunggu store siap
 */
async function getAllGroups() {
  const currentStore = await getStoreInstance();
  return Object.values(currentStore.groups).filter(g => g.id.endsWith('@g.us'));
}

// Export fungsi
module.exports = {
  bindSocket,
  getAllGroups,
  logger,
  // Karena kodingan lamamu mungkin memanggil .store, kita buat getter
  get store() { return store; } 
};