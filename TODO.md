# Bot WhatsApp Jual Beli - Rencana Pengembangan

## Fitur yang akan dibuat:

1. ✅ .help - Melihat semua command bot
2. ✅ .fee - Melihat harga rekber
3. ✅ .admin - Melihat daftar admin di grup
4. ✅ .h - Hidetag pesan yang di-reply (hanya admin)
5. ✅ .tagall - Tag semua member (hanya admin)

## Struktur Project:

```
bot-wa1/
├── package.json
├── railway.json
├── .gitignore
├── README.md
├── src/
│   ├── index.js
│   ├── lib/
│   │   ├── connect.js
│   │   ├── store.js
│   │   └── utils.js
│   ├── config/
│   │   └── config.js
│   └── commands/
│       ├── help.js
│       ├── fee.js
│       ├── admin.js
│       ├── hidetag.js
│       └── tagall.js
└── .env.example
```

## Langkah Selanjutnya:

1. [x] Buat package.json dengan dependencies
2. [x] Buat file konfigurasi Railway (railway.json)
3. [x] Buat file konfigurasi environment (.env.example)
4. [x] Buat sistem koneksi database PostgreSQL
5. [x] Buat file utama bot (index.js)
6. [x] Buat utilitas dan helper functions
7. [x] Buat command-handler system
8. [x] Implementasi setiap command (.help, .fee, .admin, .h, .tagall)
9. [x] Buat README.md dengan panduan deployment
10. [x] Inisialisasi Git dan push ke GitHub
11. [x] Deploy ke Railway
12. [ ] Scan QR code untuk login
