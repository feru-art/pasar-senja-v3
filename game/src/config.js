// PASAR SENJA — a night-market time-management game. Every tuning number and
// colour in one place. The playfield is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, hudHeight: 64 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How many nights stand between the keeper and the festival. */
export const TOTAL_NIGHTS = 7;

/** Seconds a night lasts (night 7, the festival, runs longer). */
export const NIGHT_SECONDS = 75;
export const FESTIVAL_SECONDS = 90;

/** Reputation hearts: lose one per angry walkout or missed night target. */
export const MAX_HEARTS = 5;

/** Seats customers can sit on (row across the upper zone). */
export const SEATS = [
  { x: 150, y: 215 },
  { x: 330, y: 215 },
  { x: 510, y: 215 },
  { x: 690, y: 215 },
  { x: 870, y: 215 },
  { x: 1050, y: 215 },
];
export const START_SEATS = 4;

/** The serving counter between seats and stalls: finished dishes wait here. */
export const COUNTER = { x: 100, y: 348, width: 1080, height: 32, dishY: 336 };
/** The cook stands behind the counter at the centre of the market. */
export const COOK = { x: 640, y: 348 };

/** The three stalls along the bottom zone (x = counter centre). */
export const STALLS = [
  { id: 'sate', name: 'Sate Ayam', x: 240, y: 520, color: '#e63946', roof: '#d62828', locked: false },
  { id: 'teh', name: 'Es Teh', x: 640, y: 520, color: '#2a9d8f', roof: '#2a9d8f', locked: false },
  { id: 'goreng', name: 'Gorengan', x: 1040, y: 520, color: '#f4a261', roof: '#e76f51', locked: true },
];

/** Dishes: name, stall, cook seconds, price in coins, plate colour, order glyph. */
export const DISHES = {
  sate: { name: 'Sate', stall: 'sate', cook: 4.0, price: 25, color: '#e63946', glyph: '🍢' },
  teh: { name: 'Es Teh', stall: 'teh', cook: 2.5, price: 12, color: '#2a9d8f', glyph: '🥤' },
  tehmanis: { name: 'Es Teh Manis', stall: 'teh', cook: 3.0, price: 20, color: '#ffb703', glyph: '🧋', locked: true },
  goreng: { name: 'Gorengan', stall: 'goreng', cook: 3.5, price: 18, color: '#f4a261', glyph: '🍤' },
  pisang: { name: 'Pisang Goreng', stall: 'goreng', cook: 4.0, price: 28, color: '#ffd166', glyph: '🍌', locked: true },
};

/** Customer kinds: patience seconds, pay multiplier, orders count, colour. */
export const CUSTOMERS = {
  sabar: { name: 'Sabar', patience: 42, pay: 1.0, orders: 1, color: '#7ee081', blurb: 'Santai menunggu' },
  buru: { name: 'Buru-buru', patience: 22, pay: 1.5, orders: 1, color: '#ffd166', blurb: 'Terburu-buru, bayar lebih' },
  boros: { name: 'Boros', patience: 34, pay: 2.0, orders: 2, color: '#c4b5fd', blurb: 'Pesan dua hidangan' },
  kritikus: { name: 'Kritikus', patience: 20, pay: 3.0, orders: 2, color: '#ff5964', blurb: 'Kritikus festival!' },
};

/** The shop between nights: id, name, price, blurb. */
export const UPGRADES = [
  { id: 'goreng', name: 'Stan Gorengan Baru', price: 300, blurb: 'Buka stan Gorengan + resep Gorengan' },
  { id: 'kompor', name: 'Kompor Cepat', price: 200, blurb: 'Semua masakan 40% lebih cepat' },
  { id: 'kursi', name: 'Kursi Tambahan', price: 250, blurb: '+2 kursi pelanggan' },
  { id: 'tehmanis', name: 'Resep Es Teh Manis', price: 150, blurb: 'Es Teh punya hidangan kedua' },
  { id: 'pisang', name: 'Resep Pisang Goreng', price: 150, blurb: 'Gorengan punya hidangan kedua' },
  { id: 'pelayan', name: 'Pelayan Pembantu', price: 350, blurb: 'Antar 1 hidangan otomatis tiap 15 detik' },
];

/** Income target per night (missing it costs one heart at night end). */
export function nightTarget(night) {
  return 120 + night * 90;
}

/** Seconds between customer arrivals (shrinks as nights pass). */
export function spawnInterval(night) {
  return Math.max(2.6, 6.5 - night * 0.55);
}

/** The rush + rain events that can bend a night. */
export const NIGHT_EVENTS = [
  { id: 'tenang', name: 'Malam Tenang', blurb: 'Pasar berjalan biasa.', patience: 1.0, spawn: 1.0 },
  { id: 'rombongan', name: 'Rombongan Datang!', blurb: 'Tiga pelanggan datang sekaligus.', patience: 1.0, spawn: 1.0, burst: 3 },
  { id: 'hujan', name: 'Hujan Gerimis', blurb: 'Pelanggan lebih sabar, tapi datang lebih jarang.', patience: 1.35, spawn: 1.3 },
];

/** Combo: consecutive serves without an angry walkout. */
export const COMBO = { step: 0.1, cap: 2.0 };

/** Helper (Pelayan Pembantu): auto-serves one ready dish this often. */
export const HELPER_SECONDS = 15;

export const PALETTE = {
  dusk: '#16213e',
  duskDeep: '#0f1830',
  street: '#1c2b4d',
  stallFloor: '#27395f',
  awning: '#ff9f1c',
  amber: '#ffb703',
  ember: '#fb8500',
  teal: '#2a9d8f',
  red: '#e63946',
  green: '#7ee081',
  cream: '#fff3d6',
  text: '#f8f4e8',
  muted: '#aab3d0',
  danger: '#ff5964',
  panel: '#1a2440',
  panelEdge: '#3a4a75',
  coin: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best income is kept between visits (this browser only). */
export const BEST_KEY = 'pasarsenja.best';
