// src/utils/auth.ts

// Ambil token dari localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Hapus token dari localStorage
export const clearToken = (): void => {
  localStorage.removeItem('token');
};

// Cek apakah token sudah expired
export const isTokenExpired = (token: string): boolean => {
  try {
    // Decode payload JWT
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Bandingkan waktu expiration dengan waktu sekarang
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    // Anggap token invalid jika terjadi error parsing
    return true;
  }
};