const pino = require('pino');
const config = require('../config/config');

// Kita buat store jadi object kosong saja
let store = {
  chats: { all: () => [], get: () => null, insert: () => {} },
  contacts: { all: () => [], get: () => null, upsert: () => {} },
  messages: { get: () => null, upsert: () => {} },
  groups: { get: () => null, update: () => {} }
};

const logger = pino({ level: config.logLevel || 'silent' });

// Fungsi bindSocket dibuat supaya tidak melakukan apa-apa
async function bindSocket(sock) {
  console.log("ℹ️ Store sementara dinonaktifkan untuk menghindari error library.");
  return true;
}

module.exports = {
  bindSocket,
  logger,
  store,
  getChat: () => null,
  getContact: () => null,
  getGroup: () => null,
  getGroupParticipants: () => [],
  getAllGroups: () => [],
  saveMessage: () => {},
  getMessages: () => []
};