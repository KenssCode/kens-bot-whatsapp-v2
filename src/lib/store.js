/**
 * Store Management untuk Baileys
 * Mengelola session dan state bot
 */

// Ganti dari @adiwajshing ke @whiskeysockets
const { makeInMemoryStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('../config/config');

// Create logger
const logger = pino({
  level: config.logLevel || 'silent'
});

// Create in-memory store
const store = makeInMemoryStore({
  logger: logger
});

/**
 * Bind store ke socket
 */
function bindSocket(sock) {
  // Baileys v6+ menggunakan bind langsung untuk mempermudah sinkronisasi data
  store.bind(sock.ev);

  // Event handler manual tetap dipertahankan jika diperlukan untuk log/debug
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
      messages.forEach(msg => {
        if (msg.key && msg.key.remoteJid) {
          // Store otomatis menghandle ini lewat .bind(), tapi kita bisa tambahkan log di sini
        }
      });
    }
  });
}

/**
 * Helper functions
 */
function getChat(jid) { return store.chats.get(jid); }
function getContact(jid) { return store.contacts.get(jid); }
function getGroup(jid) { return store.groups.get(jid); }

function getGroupParticipants(jid) {
  const group = getGroup(jid);
  return group ? group.participants : [];
}

function getAllGroups() {
  return Object.values(store.groups).filter(g => g.id.endsWith('@g.us'));
}

function saveMessage(message) {
  if (message.key && message.key.remoteJid) {
    store.messages.upsert(message.key.remoteJid, [message], message.key);
  }
}

function getMessages(jid, limit = 50) {
  const messages = store.messages.get(jid);
  return messages ? messages.slice(-limit) : [];
}

module.exports = {
  store,
  bindSocket,
  getChat,
  getContact,
  getGroup,
  getGroupParticipants,
  getAllGroups,
  saveMessage,
  getMessages,
  logger
};