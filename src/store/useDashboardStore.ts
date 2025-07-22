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
  users: number;
  onReview: number;
  regions: string[];
  puraList: Pura[];
  fetchTemples: () => Promise<void>;
  fetchContributions: () => Promise<void>;
}

const apiUrl = import.meta.env.VITE_API_URL;

const useDashboardStore = create<StoreState>((set) => ({
  temples: 0,
  contributions: 0,
  users: 0,
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
          console.log(data);
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
  }
}));

export default useDashboardStore;
