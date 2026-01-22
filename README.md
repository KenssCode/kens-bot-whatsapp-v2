# 🤖 Bot WhatsApp

## ✨ Fitur

| Command      | Deskripsi                          | Akses        |
| ------------ | ---------------------------------- | ------------ |
| `.help`      | Menampilkan daftar lengkap command | Semua Member |
| `.fee`       | Melihat informasi fee rekber       | Semua Member |
| `.admin`     | Menampilkan daftar admin di grup   | Semua Member |
| `.h`         | Hidetag pesan yang di-reply        | Admin Only   |
| `.tagall`    | Mention semua member di grup       | Admin Only   |
| `.close`     | Menutup grup                       | Admin Only   |
| `.open`      | Membuka grup                       | Admin Only   |
| `.antilink`  | Automation delete link in group    | Admin Only   |
| `.autoreply` | Automation reply with              | Admin Only   |

## 🚀 Cara Deployment ke Railway via GitHub

### Prerequisites

- Github Account
- Railway Account (railway.app)
- Node.js 18+ installed

### Langkah 1: Persiapan Lokal

1. **Clone repository ini:**

```bash
git clone https://github.com/your-username/bot-wa-jualbeli.git
cd bot-wa-jualbeli
```

2. **Install dependencies:**

```bash
npm install
```

3. **Buat file `.env`:**

```bash
cp .env.example .env
```

4. **Edit file `.env` dengan konfigurasi Anda:**

```env
# Database PostgreSQL (dari Railway)
DATABASE_URL=postgresql://postgres:password@localhost:5432/botwa

# Session Name
SESSION_NAME=bot-jualbeli

# Command Prefix
COMMAND_PREFIX=.

# Fee Rekber (dalam persentase)
FEE_PERCENTAGE=1

# Nama Grup
GROUP_NAME=Jual Beli
```

### Langkah 2: Push ke GitHub

1. **Buat repository baru di GitHub:**
   - Buka [GitHub](https://github.com)
   - Klik "New Repository"
   - Nama: `bot-wa-jualbeli`
   - Buat repository (publik atau privat)

2. **Push kode ke GitHub:**

```bash
# Inisialisasi git
git init
git add .
git commit -m "Initial commit: Bot WhatsApp Jual Beli"

# Tambahkan remote
git remote add origin https://github.com/your-username/bot-wa-jualbeli.git

# Push ke GitHub
git push -u origin main
```

### Langkah 3: Deployment di Railway

1. **Buka Railway:**
   - Buka [railway.app](https://railway.app)
   - Login dengan akun GitHub

2. **Buat project baru:**
   - Klik "New Project"
   - Pilih "Deploy from GitHub repo"
   - Pilih repository `bot-wa-jualbeli`

3. **Configure service:**

   a. **Tambah variabel environment:**
   - Klik pada service bot
   - Pilih "Variables" tab
   - Tambah variabel:
     - `DATABASE_URL` - PostgreSQL connection string
     - `SESSION_NAME` - Nama session bot
     - `COMMAND_PREFIX` - Prefix command (default: `.`)
     - `FEE_PERCENTAGE` - Persentase fee (default: `1`)
     - `GROUP_NAME` - Nama grup

   b. **Tambah PostgreSQL database:**
   - Klik "New" → "Database" → "PostgreSQL"
   - Database akan otomatis dibuat
   - Copy connection string dari database
   - Paste ke variabel `DATABASE_URL` di service bot

4. **Deploy:**
   - Railway akan otomatis deploy dari GitHub
   - Tunggu hingga proses selesai (~2-5 menit)
   - Klik "View Logs" untuk melihat status

### Langkah 4: Menghubungkan Bot ke WhatsApp

1. **Buka Railway logs:**
   - Di dashboard Railway, klik service bot
   - Pilih "Logs" tab
   - Tunggu hingga QR code muncul

2. **Scan QR Code:**
   - Buka WhatsApp di HP
   - Klik 三点 (menu) → "Linked Devices"
   - Scan QR code dari Railway logs

3. **Bot sudah terhubung!**
   - Bot akan online 24 jam
   - Kirim `.help` di grup untuk test

## 📁 Struktur Project

```
bot-wa1/
├── .env.example          # Template environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Node.js dependencies
├── railway.json          # Railway configuration
├── README.md             # Documentation
├── src/
│   ├── index.js          # Main entry point
│   ├── commands/
│   │   ├── admin.js      # Command .admin
│   │   ├── fee.js        # Command .fee
│   │   ├── help.js       # Command .help
│   │   ├── hidetag.js    # Command .h
│   │   └── tagall.js     # Command .tagall
│   ├── config/
│   │   └── config.js     # Configuration loader
│   └── lib/
│       ├── connect.js    # Database connection
│       ├── handler.js    # Command handler
│       ├── store.js      # Baileys store
│       └── utils.js      # Utility functions
└── sessions/             # Session files (auto-generated)
```

## ⚙️ Konfigurasi

### Variabel Environment

| Variabel         | Wajib | Default        | Deskripsi                    |
| ---------------- | ----- | -------------- | ---------------------------- |
| `DATABASE_URL`   | Ya    | -              | PostgreSQL connection string |
| `SESSION_NAME`   | Tidak | `bot-jualbeli` | Nama session bot             |
| `COMMAND_PREFIX` | Tidak | `.`            | Prefix untuk command         |
| `FEE_PERCENTAGE` | Tidak | `1`            | Persentase fee rekber        |
| `GROUP_NAME`     | Tidak | `Jual Beli`    | Nama grup                    |

## 🔧 Troubleshooting

### Bot tidak merespons?

1. Cek Railway logs untuk error
2. Pastikan bot sudah scan QR code
3. Restart service di Railway

### Database error?

1. Pastikan `DATABASE_URL` sudah benar
2. Cek PostgreSQL service di Railway
3. Tunggu database selesai provisioning

### QR Code tidak muncul?

1. Hapus folder `sessions/` lokal
2. Restart bot
3. Scan QR code lagi

## 📝 Catatan Penting

- Bot berjalan 24 jam di Railway (gratis sampai limits)
- Session WhatsApp tersimpan di Railway volume
- Database PostgreSQL juga berjalan 24 jam
- Jangan share `DATABASE_URL` dengan orang lain

## 🐛 Laporkan Bug

Jika menemukan bug, buat issue di GitHub repository.

## 📄 Lisensi

MIT License - Free to use and modify.

---

Made with ❤️ for Indonesian WhatsApp Communities
