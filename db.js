// ============================================================
// db.js — RT/RW Digital
// Fondasi akses data langsung dari browser lewat Firebase JS SDK,
// menggantikan seluruh Code.gs (Apps Script) lama. Pola sama
// persis dengan project TreeNet.
//
// Dipakai di Index.html (Admin) dan WargaView.html (Warga) dengan:
//   import { getAll, addRecord, updateRecord, deleteRecord, ... } from './db.js';
// ============================================================

import { auth, db } from './firebase-config.js';
import {
  ref, get, set, remove
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ============================================================
// Cloudinary — isi cloud name & preset SETELAH kamu bikin akun
// Cloudinary khusus project ini (Settings → Account → Cloud name).
// Buat 2 upload preset di Cloudinary Dashboard:
//   - Preset privat (mis. untuk foto KTP/dokumen sensitif warga):
//     Signing Mode = Unsigned, Delivery type = Authenticated
//   - Preset publik (mis. untuk foto kegiatan/pengumuman/inventaris):
//     Signing Mode = Unsigned, Delivery type = Upload
// ============================================================
const CLOUDINARY_CLOUD_NAME = 'ISI_CLOUD_NAME_DI_SINI'; // TODO
const CLOUDINARY_PRESET_PRIVAT = 'rtrw_privat_preset';   // TODO sesuaikan nama preset
const CLOUDINARY_PRESET_PUBLIK = 'rtrw_publik_preset';   // TODO sesuaikan nama preset

// Folder yang dianggap PRIVAT (pakai preset Authenticated). Tambah
// nama folder lain di sini kalau ada dokumen sensitif baru.
const FOLDER_PRIVAT = ['ktp', 'dokumen_warga'];

function pilihPreset(folder) {
  if (FOLDER_PRIVAT.indexOf(folder) > -1) return CLOUDINARY_PRESET_PRIVAT;
  return CLOUDINARY_PRESET_PUBLIK;
}

// ============================================================
// GENERIC CRUD (setara fbGet/fbSet/fbPatch/fbDelete di Code.gs
// lama, tapi sekarang tiap record punya key/ID sendiri — BUKAN
// lagi array baris/kolom ala Spreadsheet).
// ============================================================

// Bikin ID unik. Prefix disesuaikan per modul, contoh: 'WRG', 'KK', 'IUR', dst.
export function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Ambil semua record dalam satu node
export async function getAll(node) {
  const snap = await get(ref(db, node));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map(function (key) {
    const obj = val[key];
    if (obj && typeof obj === 'object' && !obj.ID) obj.ID = key;
    return obj;
  });
}

// Ambil satu record berdasarkan ID
export async function getOne(node, id) {
  const snap = await get(ref(db, node + '/' + id));
  if (!snap.exists()) return null;
  const obj = snap.val();
  obj.ID = obj.ID || id;
  return obj;
}

// Tambah record baru
export async function addRecord(node, dataObj, prefix) {
  if (!dataObj.ID) {
    dataObj.ID = generateId(prefix || node.substring(0, 3).toUpperCase());
  }
  await set(ref(db, node + '/' + dataObj.ID), dataObj);
  return dataObj;
}

// Update sebagian field record (merge, bukan timpa total)
export async function updateRecord(node, id, dataObj) {
  const current = await getOne(node, id);
  if (!current) throw new Error('Data tidak ditemukan.');
  const merged = Object.assign({}, current, dataObj);
  await set(ref(db, node + '/' + id), merged);
  return merged;
}

// Hapus record
export async function deleteRecord(node, id) {
  const current = await getOne(node, id);
  if (!current) throw new Error('Data tidak ditemukan.');
  await remove(ref(db, node + '/' + id));
  return true;
}

// ============================================================
// UPLOAD FOTO/DOKUMEN — Cloudinary
// ============================================================
export async function uploadToCloudinary(file, folder) {
  const url = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', pilihPreset(folder));
  if (folder) formData.append('folder', folder);

  const res = await fetch(url, { method: 'POST', body: formData });
  const json = await res.json();
  if (!json.secure_url) {
    throw new Error(json.error && json.error.message ? json.error.message : 'Upload ke Cloudinary gagal.');
  }
  return json.secure_url;
}

// ============================================================
// AUTH GUARD — dipanggil di Index.html (Admin)
// User harus login via Firebase Auth DAN punya Users/{uid}/role = "admin"
// ============================================================
export function requireAdmin(onReady) {
  onAuthStateChanged(auth, async function (user) {
    if (!user) { window.location.href = '/'; return; }
    try {
      const roleSnap = await get(ref(db, 'Users/' + user.uid + '/role'));
      const role = roleSnap.exists() ? roleSnap.val() : null;
      if (role !== 'admin') {
        alert('Akun ini belum punya akses Admin. Hubungi pengurus RT/RW.');
        await signOut(auth);
        window.location.href = '/';
        return;
      }
      onReady(user);
    } catch (err) {
      alert('Gagal memeriksa akses: ' + err.message);
      window.location.href = '/';
    }
  });
}

export function doLogout() {
  return signOut(auth).then(function () {
    window.location.href = '/';
  });
}

// ============================================================
// HELPER: No HP & Password default (dd/mm/yyyy jadi email sintetis
// + password) — pola sama seperti TreeNet, disesuaikan penamaan
// domain sintetisnya jadi '@warga.rtrwdigital'.
// ============================================================

// Bersihkan No HP: selalu diawali 0, hanya angka (dipindah dari
// normalizeNoHP() di Code.gs lama)
export function normalizeNoHP(noHP) {
  if (!noHP) return '';
  var cleaned = String(noHP).replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('62') && cleaned.length > 10) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (!cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

// Email sintetis dari No HP, dipakai untuk daftar/login Firebase Auth
export function emailSintetisDariNoHP(noHP) {
  return normalizeNoHP(noHP) + '@warga.rtrwdigital';
}

// Password default dari tanggal lahir (format input date: yyyy-mm-dd)
// -> ddMMyyyy, sama persis pola TreeNet.
export function generatePasswordFromTGL(tanggalLahir) {
  var parts = String(tanggalLahir).split('-'); // [yyyy, mm, dd]
  if (parts.length !== 3) throw new Error('Format tanggal lahir tidak valid (harus yyyy-mm-dd).');
  return parts[2] + parts[1] + parts[0];
}

// ============================================================
// FORMAT HELPERS
// ============================================================
export function formatRupiah(num) {
  num = Number(num) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
}

export function formatTanggal(tgl) {
  if (!tgl) return '-';
  var d = new Date(tgl);
  if (isNaN(d.getTime())) return tgl;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const BULAN_NAMA = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
