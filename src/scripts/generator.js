/**
 * Address Generator - 1 to 100
 * Menghasilkan 100 alamat unik dengan koordinat X,Y berbeda
 * Setiap alamat memiliki 2-3 jalur (routes)
 * Menggunakan Math.random() dan Simplex/Perlin Noise
 */

// ─────────────────────────────────────────────
// SIMPLEX NOISE (2D) — implementasi ringan
// ─────────────────────────────────────────────
class SimplexNoise {
  constructor(seed = 42) {
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Shuffle dengan seed LCG
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = ((s >>> 0) % (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
  }

  dot(g, x, y) { return g[0]*x + g[1]*y; }

  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0*t0 * this.dot(this.grad3[gi0], x0, y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1*t1 * this.dot(this.grad3[gi1], x1, y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2*t2 * this.dot(this.grad3[gi2], x2, y2); }
    return 70 * (n0 + n1 + n2); // rentang ~[-1, 1]
  }
}

// ─────────────────────────────────────────────
// DATA SUMBER: nama jalan, kota, provinsi, dll.
// ─────────────────────────────────────────────
const streetNames = [
  "Jl. Merdeka","Jl. Sudirman","Jl. Gatot Subroto","Jl. Diponegoro","Jl. Hayam Wuruk",
  "Jl. Veteran","Jl. Pahlawan","Jl. Pemuda","Jl. Imam Bonjol","Jl. Cut Nyak Dien",
  "Jl. Ahmad Yani","Jl. Sisingamangaraja","Jl. Raya Darmo","Jl. Basuki Rahmat",
  "Jl. Pangeran Antasari","Jl. Teuku Umar","Jl. Sultan Agung","Jl. Kartini",
  "Jl. Jendral Sudirman","Jl. Letjen Suprapto","Jl. Ir. H. Juanda","Jl. A. Rivai",
  "Jl. Gajah Mada","Jl. Hang Tuah","Jl. Tuanku Tambusai","Jl. Riau",
  "Jl. Sumatra","Jl. Kalimantan","Jl. Jawa","Jl. Sulawesi","Jl. Bali","Jl. Lombok",
  "Jl. Flores","Jl. Timor","Jl. Papua","Jl. Nusa Indah","Jl. Bougenville",
  "Jl. Cempaka Putih","Jl. Mawar","Jl. Melati","Jl. Anggrek","Jl. Dahlia",
  "Jl. Kenanga","Jl. Flamboyan","Jl. Akasia","Jl. Mangga","Jl. Jeruk",
  "Jl. Durian","Jl. Rambutan","Jl. Salak","Jl. Duku","Jl. Nangka",
  "Jl. Sawit","Jl. Pinus","Jl. Cemara","Jl. Beringin","Jl. Bambu",
  "Jl. Tanjung","Jl. Selat","Jl. Pantai","Jl. Laut","Jl. Pulau",
  "Jl. Gunung","Jl. Bukit","Jl. Danau","Jl. Sungai","Jl. Hutan",
  "Jl. Sawah","Jl. Ladang","Jl. Kebun","Jl. Taman","Jl. Industri",
  "Jl. Perdagangan","Jl. Niaga","Jl. Pasar","Jl. Terminal","Jl. Stasiun",
  "Jl. Bandara","Jl. Pelabuhan","Jl. Masjid","Jl. Gereja","Jl. Sekolah",
  "Jl. Rumah Sakit","Jl. Puskesmas","Jl. Kantor","Jl. Bank","Jl. Plaza",
  "Jl. Boulevard","Jl. Bypass","Jl. Lingkar","Jl. Tol","Jl. Trans",
  "Jl. Poros","Jl. Utama","Jl. Raya Besar","Jl. Protokol","Jl. Nasional",
  "Jl. Provinsi","Jl. Kabupaten","Jl. Kecamatan","Jl. Kelurahan","Jl. Desa",
  "Jl. Rukun Tetangga","Jl. Rukun Warga","Jl. Gang Makmur","Jl. Gang Damai","Jl. Lorong Baru"
];

const routeTypes = ["Jl.","Gg.","Lorong","Boulevard","Bypass","Ring Road","Jalan Tol","Koridor"];

const kelurahan = [
  "Menteng","Gambir","Tanah Abang","Senen","Kemayoran","Sawah Besar","Cempaka Putih",
  "Pademangan","Tanjung Priok","Koja","Penjaringan","Penjagalan","Pluit","Kalideres",
  "Cengkareng","Grogol","Tambora","Palmerah","Kebon Jeruk","Kembangan","Duri Kosambi",
  "Pesanggrahan","Kebayoran Lama","Kebayoran Baru","Mampang","Pancoran","Tebet","Setiabudi",
  "Kuningan","Kramat Jati","Pasar Rebo","Cipayung","Ciracas","Makasar","Duren Sawit",
  "Jatinegara","Pulogadung","Cakung","Cilincing","Sukmajaya","Beji","Pancoran Mas",
  "Cimanggis","Tapos","Sawangan","Limo","Cinere","Bojong Sari"
];

const kecamatan = [
  "Gambir","Tanah Abang","Menteng","Senen","Cempaka Putih","Johar Baru",
  "Kemayoran","Sawah Besar","Penjaringan","Tanjung Priok","Koja","Cilincing",
  "Pademangan","Kelapa Gading","Ciracas","Cipayung","Pasar Rebo","Kramat Jati",
  "Makasar","Duren Sawit","Jatinegara","Pulogadung","Cakung","Kebayoran Baru",
  "Kebayoran Lama","Pesanggrahan","Cilandak","Mampang Prapatan","Pancoran",
  "Pasar Minggu","Jagakarsa","Tebet","Setiabudi","Grogol Petamburan",
  "Tambora","Taman Sari","Palmerah","Kembangan","Kebon Jeruk","Cengkareng"
];

const kotaKab = [
  "Jakarta Pusat","Jakarta Utara","Jakarta Barat","Jakarta Selatan","Jakarta Timur",
  "Kota Bogor","Kabupaten Bogor","Kota Depok","Kota Tangerang","Tangerang Selatan",
  "Kota Bekasi","Kabupaten Bekasi","Kota Bandung","Kabupaten Bandung","Kota Cimahi",
  "Kota Semarang","Kota Surabaya","Kota Yogyakarta","Kota Medan","Kota Makassar",
  "Kota Palembang","Kota Pekanbaru","Kota Banjarmasin","Kota Samarinda","Kota Manado"
];

const provinsi = [
  "DKI Jakarta","Jawa Barat","Jawa Tengah","Jawa Timur","DI Yogyakarta",
  "Banten","Sumatera Utara","Sumatera Barat","Sumatera Selatan","Riau",
  "Kalimantan Timur","Kalimantan Selatan","Sulawesi Selatan","Sulawesi Utara","Bali"
];

// ─────────────────────────────────────────────
// SEEDED PRNG — LCG sederhana untuk reproducibility
// ─────────────────────────────────────────────
class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

// ─────────────────────────────────────────────
// GENERATOR KOORDINAT UNIK DENGAN NOISE
// ─────────────────────────────────────────────
function generateUniqueCoordinates(count, noise, rng) {
  const usedKeys = new Set();
  const coords = [];

  // Bagi grid 10x10 untuk distribusi merata
  const gridSize = Math.ceil(Math.sqrt(count));
  const cellW = 1000 / gridSize;
  const cellH = 1000 / gridSize;

  let idx = 0;
  for (let row = 0; row < gridSize && coords.length < count; row++) {
    for (let col = 0; col < gridSize && coords.length < count; col++) {
      // Base posisi di dalam cell
      const baseX = col * cellW;
      const baseY = row * cellH;

      // Tambahkan noise untuk variasi organik
      const noiseVal = noise.noise2D(col * 0.3, row * 0.3); // ~[-1,1]
      const jitterX = rng.next() * cellW * 0.8 + noiseVal * cellW * 0.1;
      const jitterY = rng.next() * cellH * 0.8 + noiseVal * cellH * 0.1;

      let x = Math.round(baseX + jitterX);
      let y = Math.round(baseY + jitterY);

      // Clamp ke [0, 999]
      x = Math.max(0, Math.min(999, x));
      y = Math.max(0, Math.min(999, y));

      // Pastikan unik
      let key = `${x},${y}`;
      let attempts = 0;
      while (usedKeys.has(key) && attempts < 50) {
        x = Math.max(0, Math.min(999, x + rng.nextInt(-5, 5)));
        y = Math.max(0, Math.min(999, y + rng.nextInt(-5, 5)));
        key = `${x},${y}`;
        attempts++;
      }

      usedKeys.add(key);
      coords.push({ x, y });
      idx++;
    }
  }

  return coords;
}

// ─────────────────────────────────────────────
// GENERATOR JALUR (ROUTES) PER ALAMAT
// ─────────────────────────────────────────────
function generateRoutes(addressIndex, baseX, baseY, rng, noise) {
  const numRoutes = rng.nextInt(2, 3); // 2 atau 3 jalur
  const routes = [];

  for (let r = 0; r < numRoutes; r++) {
    // Noise untuk nama jalan — lebih organik
    const nv = noise.noise2D(addressIndex * 0.15 + r * 1.7, r * 0.9);
    const streetIdx = Math.floor(((nv + 1) / 2) * streetNames.length) % streetNames.length;
    const streetBase = streetNames[streetIdx];

    // Nomor rumah: gunakan noise + random
    const noiseOffset = noise.noise2D(addressIndex * 0.2, r * 2.1);
    const houseNum = Math.round(Math.abs(noiseOffset) * 150 + rng.nextInt(1, 100));

    // RT/RW
    const rt = String(rng.nextInt(1, 20)).padStart(3, "0");
    const rw = String(rng.nextInt(1, 15)).padStart(3, "0");

    // Jarak tempuh (meter) — dipengaruhi noise
    const distNoise = (noise.noise2D(addressIndex * 0.4 + r, r * 0.5) + 1) / 2;
    const distance = Math.round(distNoise * 2000 + rng.nextInt(100, 500));

    // Estimasi waktu (menit) berdasarkan jarak
    const speedKmh = rng.nextInt(20, 60);
    const durationMin = Math.round((distance / 1000) / speedKmh * 60);

    routes.push({
      route_id: `R${addressIndex}-${r + 1}`,
      nama_jalan: `${streetBase} No. ${houseNum}`,
      rt: `RT ${rt}`,
      rw: `RW ${rw}`,
      jarak_meter: distance,
      estimasi_menit: Math.max(1, durationMin),
      arah: ["Utara","Selatan","Timur","Barat","Timur Laut","Tenggara","Barat Daya","Barat Laut"][rng.nextInt(0, 7)]
    });
  }

  return routes;
}

// ─────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────
function generateAddresses() {
  const SEED = 20250530;
  const rng = new SeededRandom(SEED);
  const noise = new SimplexNoise(SEED);

  const coords = generateUniqueCoordinates(100, noise, rng);
  const addresses = [];

  for (let i = 0; i < 100; i++) {
    const id = i + 1;
    const { x, y } = coords[i];

    // Pilih data wilayah dengan noise
    const nv = noise.noise2D(i * 0.25, 3.7);
    const kelIdx  = Math.floor(((nv + 1) / 2) * kelurahan.length) % kelurahan.length;
    const kecIdx  = Math.floor(rng.next() * kecamatan.length);
    const kotaIdx = Math.floor(rng.next() * kotaKab.length);
    const provIdx = Math.floor(rng.next() * provinsi.length);

    // Kode pos: 5 digit
    const kodePos = String(10000 + rng.nextInt(0, 89999)).padStart(5, "0");

    // Nomor utama
    const nomorUtama = rng.nextInt(1, 999);

    // Jalur (Akan diisi setelah semua koordinat digenerate)
    const routes = [];

    addresses.push({
      id,
      koordinat: { x, y },
      nomor_alamat: nomorUtama,
      kelurahan: kelurahan[kelIdx],
      kecamatan: kecamatan[kecIdx],
      kota_kabupaten: kotaKab[kotaIdx],
      provinsi: provinsi[provIdx],
      kode_pos: kodePos,
      jalur: routes
    });
  }

  // Hubungkan setiap node ke 3 tetangga terdekat untuk membentuk graf
  for (let i = 0; i < addresses.length; i++) {
    const nodeA = addresses[i];
    const distances = [];
    
    for (let j = 0; j < addresses.length; j++) {
      if (i === j) continue;
      const nodeB = addresses[j];
      const dist = Math.sqrt(
        Math.pow(nodeA.koordinat.x - nodeB.koordinat.x, 2) +
        Math.pow(nodeA.koordinat.y - nodeB.koordinat.y, 2)
      );
      distances.push({ id: nodeB.id, dist });
    }
    
    // Sort berdasarkan jarak dan ambil 3 terdekat
    distances.sort((a, b) => a.dist - b.dist);
    const neighbors = distances.slice(0, 3);
    
    neighbors.forEach((neigh, idx) => {
      const neighborNode = addresses.find(n => n.id === neigh.id);
      const streetBase = streetNames[rng.nextInt(0, streetNames.length - 1)];
      const houseNum = rng.nextInt(1, 200);
      
      nodeA.jalur.push({
        target_id: neigh.id,
        route_id: `R${nodeA.id}-${neigh.id}`,
        nama_jalan: `${streetBase} No. ${houseNum}`,
        rt: `RT ${String(rng.nextInt(1, 20)).padStart(3, "0")}`,
        rw: `RW ${String(rng.nextInt(1, 15)).padStart(3, "0")}`,
        jarak_meter: Math.round(neigh.dist * 10), // Konversi koordinat ke meter (asumsi 1 unit = 10m)
        estimasi_menit: Math.max(1, Math.round(neigh.dist / 5)),
        arah: getDirection(nodeA.koordinat, neighborNode.koordinat)
      });
    });
  }

  return addresses;
}

function getDirection(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return "Timur";
  if (angle >= 22.5 && angle < 67.5) return "Tenggara";
  if (angle >= 67.5 && angle < 112.5) return "Selatan";
  if (angle >= 112.5 && angle < 157.5) return "Barat Daya";
  if (angle >= 157.5 || angle < -157.5) return "Barat";
  if (angle >= -157.5 && angle < -112.5) return "Barat Laut";
  if (angle >= -112.5 && angle < -67.5) return "Utara";
  if (angle >= -67.5 && angle < -22.5) return "Timur Laut";
  return "Utara";
}

// ─────────────────────────────────────────────
// JALANKAN & OUTPUT JSON
// ─────────────────────────────────────────────
const fs = require('fs');
const result = generateAddresses();
const output = JSON.stringify(result, null, 2);

// Tulis ke file secara langsung untuk menghindari masalah encoding powershell
const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
fs.writeFileSync(path.join(dataDir, 'address.json'), output, 'utf8');
console.log("address.json generated successfully in /data directory.");

// Export untuk browser / modul
if (typeof module !== "undefined" && module.exports) {
  module.exports = result;
}