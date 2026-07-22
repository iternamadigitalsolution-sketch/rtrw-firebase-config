import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAkGcRfWmUeXR4kN2vsRLAg6QbwiKUxyuQ",
  authDomain: "rtrwdigital.firebaseapp.com",
  databaseURL: "https://rtrwdigital-default-rtdb.firebaseio.com",
  projectId: "rtrwdigital",
  storageBucket: "rtrwdigital.firebasestorage.app",
  messagingSenderId: "647039540586",
  appId: "1:647039540586:web:efee23227cc0b310d7d913"
};
// Catatan: measurementId/Analytics sengaja TIDAK dipakai di sini
// (sama seperti pola TreeNet) — tidak dibutuhkan untuk Auth +
// Realtime Database, dan menghindari beban script tambahan.

import { initializeApp as initializeAppSecondary } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth as getAuthSecondary } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// App KEDUA — khusus dipakai admin saat membuat akun Firebase Auth
// baru untuk warga, supaya sesi login Admin yang sedang aktif TIDAK
// ikut tertimpa/logout (sama pola dengan TreeNet).
const secondaryApp = initializeAppSecondary(firebaseConfig, 'Secondary');
export const authSecondary = getAuthSecondary(secondaryApp);

// App KETIGA — khusus dipakai WargaView.html (Portal Warga), supaya
// sesi loginnya benar-benar terpisah dari sesi Admin di Index.html,
// walau dibuka di browser yang sama.
import { getDatabase as getDatabaseCustomer } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const customerApp = initializeAppSecondary(firebaseConfig, 'Customer');
export const authCustomer = getAuthSecondary(customerApp);
export const dbCustomer = getDatabaseCustomer(customerApp);
