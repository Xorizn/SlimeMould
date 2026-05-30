# 🧪 Moldslime: Intelligent Pathfinding System

> **Navigasi cerdas yang terinspirasi dari pola pertumbuhan *Physarum polycephalum* (jamur lendir).**

Moldslime adalah sebuah platform pemetaan dan pencarian rute dinamis yang menggabungkan kecepatan **Node.js** di sisi *backend* dengan ketajaman algoritma graf **Python (NetworkX)**. Proyek ini dirancang untuk mensimulasikan pencarian jalur tercepat melalui 100 titik koordinat yang saling terhubung secara organik.

---

## ✨ Fitur Utama

-   **Interactive Map Canvas**: Visualisasi real-time dengan efek *glow* dan animasi *slime flow*.
-   **Dual-Engine Backend**: Menggunakan Node.js untuk orkestrasi API dan Python untuk komputasi graf yang berat.
-   **Organic Data Generation**: Algoritma generator menggunakan *Simplex Noise* untuk menciptakan persebaran alamat yang natural.
-   **Search Animation**: Simulasi eksplorasi jalur yang meniru perilaku pencarian sumber makanan jamur lendir.
-   **Fastest Path Algorithm**: Integrasi Dijkstra melalui NetworkX untuk akurasi rute maksimal.

---

## 🛠️ Persyaratan Sistem

Pastikan mesin Anda sudah terpasang:
-   **Node.js** (versi 18 ke atas)
-   **Python** (versi 3.8 ke atas)
-   **NPM** (biasanya sepaket dengan Node.js)

---

## 🚀 Memulai Instalasi

Ikuti langkah-langkah berikut untuk menjalankan Moldslime di lingkungan lokal Anda:

### 1. Persiapan Node.js
Masuk ke direktori `src` dan pasang dependensi yang dibutuhkan:
```bash
cd src
npm install
```

### 2. Persiapan Python
Pastikan pustaka pendukung Python tersedia:
```bash
pip install -r requirements.txt
```

---

## 📖 Penggunaan

### Menghasilkan Data Alamat
Jika Anda ingin me-reset atau membuat ulang 100 titik alamat baru dengan algoritma *Simplex Noise*:
```bash
npm run generate
```
*Data akan disimpan secara otomatis di `src/data/address.json`.*

### Menjalankan Server
Nyalakan mesin Moldslime:
```bash
npm start
```
Buka browser dan akses **`http://localhost:3000`**.

---

## 📂 Struktur Proyek

```text
Moldslime/
├── src/
│   ├── data/           # Penyimpanan address.json
│   ├── public/         # Frontend (HTML, CSS Modern, JS)
│   ├── scripts/        # Engine utama (Generator JS & Pathfinder Python)
│   └── index.js        # Entry point Express server
└── README.md
```

---

## 🔍 Referensi

[MoeBuTa/SlimeMould](https://github.com/MoeBuTa/SlimeMould/tree/master)

---

## 📝 Lisensi
Proyek ini dibuat untuk keperluan akademik/kuliah. Silakan dikembangkan lebih lanjut!

