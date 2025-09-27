// src/store/useDashboardStore.ts

import { create } from "zustand";
import useAuthStore from "./useAuthStore";

export interface Pura {
  md_temples_id: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
  visibility: string;
  [key: string]: any;
}

interface StoreState {
  temples: number;
  contributions: number;
  users: number; // State ini sudah ada, kita akan menggunakannya
  onReview: number;
  regions: string[];
  puraList: Pura[];
  fetchTemples: () => Promise<void>;
  fetchContributions: () => Promise<void>;
  fetchTotalUsers: () => Promise<void>; // ++ TAMBAHKAN: Deklarasi fungsi baru
}

const apiUrl = import.meta.env.VITE_API_URL;

const useDashboardStore = create<StoreState>((set) => ({
  temples: 0,
  contributions: 0,
  users: 0, // Nilai awal adalah 0
  onReview: 0,
  regions: [
    "Buleleng","Gianyar","Karangasem","Klungkung",
    "Tabanan","Jembrana","Bangli","Badung","Denpasar"
  ],
  puraList: [],

  fetchTemples: async () => {
    try {
      const token = useAuthStore.getState().token;
      let page = 1;
      const allTemples: Pura[] = [];
      while (true) {
        const res = await fetch(`${apiUrl}/private/temples?page=${page}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        const data = await res.json();
        const items: Pura[] = data.datas.map((d: any) => ({
          md_temples_id: d.md_temples_id,
          name: d.name,
          region: d.area_id.Valid
            ? d.area_id.Int64.toString()
            : d.location_name,
          lat: d.lat,
          lng: d.lng,
          visibility: d.visibility
        }));
        allTemples.push(...items);
        if (!data.is_next) break;
        page++;
      }
      set({ puraList: allTemples, temples: allTemples.length });
    } catch (err) {
      console.error("Failed to fetch temples", err);
    }
  },

  fetchContributions: async () => {
    try {
      const token = useAuthStore.getState().token;
      let page = 1;
      let count = 0;
      while (true) {
        const res = await fetch(`${apiUrl}/private/contributions?page=${page}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        const data = await res.json();
        
        count += (data.datas as any[]).length;
        if (!data.is_next) break;
        page++;
      }
      set({ contributions: count });
    } catch (err) {
      console.error("Failed to fetch contributions", err);
    }
  },

  // ++ TAMBAHKAN: Fungsi baru untuk mengambil total pengguna
  fetchTotalUsers: async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) return; // Keluar jika tidak ada token

      // Endpoint API yang Anda berikan
      const res = await fetch(`${apiUrl}/auth/total-users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch total users, status: ${res.status}`);
      }

      const data = await res.json();
      
      // Simpan nilai 'total' dari response API ke state 'users'
      if (typeof data.total === 'number') {
        set({ users: data.total });
      }

    } catch (err) {
      console.error("Failed to fetch total users:", err);
    }
  }
}));

export default useDashboardStore;