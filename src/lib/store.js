/**
 * Store Management untuk Baileys
 * Mengelola session dan state bot
 */

const { proto, makeInMemoryStore } = require('@adiwajshing/baileys');
const pino = require('pino');
const config = require('../config/config');

// Create logger
const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Create in-memory store
const store = makeInMemoryStore({
  logger: logger
});

/**
 * Bind store ke socket
 */
function bindSocket(sock) {
  sock.ev.on('chats.set', ({ chats }) => {
    store.chats.insert(chats);
  });

  sock.ev.on('contacts.set', ({ contacts }) => {
    store.contacts.insert(contacts);
  });

  sock.ev.on('messages.set', ({ messages }) => {
    store.messages.insert(messages);
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
      messages.forEach(msg => {
        if (msg.key && msg.key.remoteJid) {
          store.messages.upsert(msg.key.remoteJid, [msg], msg.key);
        }
      });
    }
  });

  sock.ev.on('messages.update', ({ updates }) => {
    updates.forEach(update => {
      if (update.key && update.key.remoteJid) {
        store.messages.update(update.key.remoteJid, [update]);
      }
    });
  });

  sock.ev.on('contacts.upsert', (contacts) => {
    store.contacts.upsert(contacts);
  });

  sock.ev.on('groups.update', (groupUpdates) => {
    groupUpdates.forEach(update => {
      if (update.id) {
        store.groups.update([update]);
      }
    });
  });

  sock.ev.on('group-participants.update', ({ id, participants, action }) => {
    const group = store.groups.get(id);
    if (group) {
      if (action === 'add') {
        group.participants.push(...participants.map(p => ({
          id: p,
          admin: null
        })));
      } else if (action === 'remove') {
        group.participants = group.participants.filter(p => 
          !participants.includes(p.id)
        );
      }
      store.groups.update([group]);
    }
  });
}

/**
 * Get chat by JID
 */
function getChat(jid) {
  return store.chats.get(jid);
}

/**
 * Get contact by JID
 */
function getContact(jid) {
  return store.contacts.get(jid);
}

/**
 * Get group by JID
 */
function getGroup(jid) {
  return store.groups.get(jid);
}

/**
 * Get group participants
 */
function getGroupParticipants(jid) {
  const group = getGroup(jid);
  return group ? group.participants : [];
}

/**
 * Get all groups
 */
function getAllGroups() {
  return Array.from(store.groups.values()).filter(g => 
    g.id.endsWith('@g.us')
  );
}

/**
 * Save message to store
 */
function saveMessage(message) {
  if (message.key && message.key.remoteJid) {
    store.messages.upsert(message.key.remoteJid, [message], message.key);
  }
}

/**
 * Get message by JID
 */
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

