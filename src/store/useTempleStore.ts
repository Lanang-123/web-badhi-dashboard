// src/store/useTempleStore.ts

import { create } from "zustand";
import useAuthStore from "./useAuthStore";

// Definisi interface untuk objek Pura (temple)
export interface Pura {
  md_temples_id: number;
  md_temple_types_id: number;
  user_id: number;
  area_id: {
    Int64: number;
    Valid: boolean;
  };
  name: string;
  location_name: string;
  lat: number;
  lng: number;
  description: string;
  file_path: string;
  visibility: string;
  temple_type: string;
  total_contributions: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  [key: string]: any; // Untuk properti tambahan dinamis
}

// Struktur state dan action untuk store
interface TempleState {
  temples: Pura[];                      // Data array Pura
  count: number;                        // Jumlah item pada halaman ini
  loading: boolean;                     // Flag loading
  error: string | null;                 // Pesan error jika ada
  isNext: boolean;                      // Flag ada halaman selanjutnya
  fetchTemples: (page: number, searchText: string) => Promise<boolean>;
}

// Base URL dari .env
const apiUrl = import.meta.env.VITE_API_URL;

// Buat zustand store
const useTempleStore = create<TempleState>((set) => ({
  temples: [],     // inisialisasi array kosong
  count: 0,        // inisialisasi count 0
  loading: false,
  error: null,
  isNext: false,

  // Fungsi untuk mengambil data temples
  fetchTemples: async (page, searchText) => {
    set({ loading: true, error: null });

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ loading: false, error: "User belum login" });
      return false;
    }

    // 1) Fetch halaman yang diminta
    const urlPage = 
      `${apiUrl}/private/temples?page=${page}` +
      (searchText ? `&search=${encodeURIComponent(searchText)}` : "");

    try {
      const respPage = await fetch(urlPage, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!respPage.ok) throw new Error(`HTTP ${respPage.status}`);

      const jsonPage = (await respPage.json()) as {
        datas: Pura[];
        is_next: boolean;
        message: string;
      };

      // Simpan data halaman ini untuk set state temples & isNext
      const currentDatas = jsonPage.datas;
      const currentIsNext = jsonPage.is_next;

      // 2) Loop untuk menghitung total semua pages
      let runningTotal = currentDatas.length;
      let next = currentIsNext;
      let p = page + 1;

      while (next) {
        const resp = await fetch(
          `${apiUrl}/private/temples?page=${p}` +
            (searchText ? `&search=${encodeURIComponent(searchText)}` : ""),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const json = (await resp.json()) as {
          datas: Pura[];
          is_next: boolean;
          message: string;
        };

        runningTotal += json.datas.length;
        next = json.is_next;
        p++;
      }

      // 3) Set state dengan pola yang kamu inginkan
      set({
        temples: currentDatas,
        count: runningTotal,
        isNext: currentIsNext,
        loading: false,
      });

      return currentIsNext;
    } catch (err: any) {
      set({ error: err.message || "Unknown error", loading: false });
      return false;
    }
  },

}));

export default useTempleStore;
