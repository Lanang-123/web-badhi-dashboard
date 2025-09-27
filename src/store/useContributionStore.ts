// src/store/useContributionStore.ts
import { create } from "zustand";
import useAuthStore from "./useAuthStore";

export interface Contribution {
  tx_contribution_id: number;
  md_temples_id: number;
  user_id: number;
  name: string;
  description: string;
  level_area: string;
  file_path: string;
  thumbnail: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  license_type: number;
  avatar: string;
  user_name: string;
  category: string; // Tambahkan properti ini
  privacy_setting: string; // Tambahkan properti ini
}

interface ContributionState {
  contributions: Contribution[];
  count: number;
  loading: boolean;
  error: string | null;
  isNext: boolean;
  fetchContributions: () => Promise<void>;
  fetchContributionsByTempleId: (
    templeId: number,
    page?: number,
    area?: string
  ) => Promise<void>;
}

const apiUrl = import.meta.env.VITE_API_URL as string;

const useContributionStore = create<ContributionState>((set, get) => ({
  contributions: [],
  count: 0,
  loading: false,
  error: null,
  isNext: true,

  fetchContributions: async () => {
    set({ loading: true, error: null });

    try {
      const token = useAuthStore.getState().token;
      let page = 1;
      const allContributions: Contribution[] = [];

      while (true) {
        const res = await fetch(`${apiUrl}/private/contributions?page=${page}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (!data.datas || !Array.isArray(data.datas)) {
          throw new Error("Invalid response structure");
        }

        const items: Contribution[] = data.datas.map((d: any) => ({
          tx_contribution_id: d.tx_contribution_id,
          md_temples_id: d.md_temples_id,
          user_id: d.user_id,
          name: d.name,
          description: d.description,
          level_area: d.level_area,
          file_path: d.file_path,
          thumbnail: d.thumbnail,
          lat: d.lat,
          lng: d.lng,
          created_at: d.created_at,
          updated_at: d.updated_at,
          deleted_at: d.deleted_at,
          license_type: d.license_type,
          avatar: d.avatar || "",
          user_name: d.user_name || "", // Tambahkan ini
        }));

        allContributions.push(...items);

        if (!data.is_next) break;
        page++;
      }
      console.log(allContributions);
      
      set({
        contributions: allContributions,
        count: allContributions.length,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to fetch contributions", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      set({
        error: `Failed to fetch contributions: ${message}`,
        loading: false,
      });
    }
  },

  fetchContributionsByTempleId: async (
    templeId: number,
    page = 1,
    area = ""
  ) => {
    if (page === 1) {
      set({ contributions: [], count: 0, isNext: true, error: null });
    }
    set({ loading: true });

    try {
      const token = useAuthStore.getState().token;
      const url = new URL(`${apiUrl}/private/contributions/list/${templeId}`);
      url.searchParams.append("page", page.toString());
      if (area) url.searchParams.append("area", area);

      const res = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const raw: any[] = Array.isArray(data.datas) ? data.datas : [];
      
      const pageItems: Contribution[] = raw.map((d) => ({
        tx_contribution_id: d.tx_contribution_id,
        md_temples_id: d.md_temples_id,
        user_id: d.user_id,
        name: d.name,
        description: d.description,
        level_area: d.level_area,
        file_path: d.file_path,
        thumbnail: d.thumbnail,
        lat: d.lat,
        lng: d.lng,
        created_at: d.created_at,
        updated_at: d.updated_at,
        deleted_at: d.deleted_at,
        license_type: d.license_type,
        avatar: d.avatar || "",
        user_name: d.user_name || "",
        category: d.level_area || 'other', // Gunakan level_area sebagai category
        privacy_setting: d.license_type === 1 ? 'public' : 'private' // Map license_type to privacy_setting
      }));

      if (page > 1) {
        set({
          contributions: [...get().contributions, ...pageItems],
          count: get().count + pageItems.length,
          isNext: data.is_next,
        });
      } else {
        set({
          contributions: pageItems,
          count: pageItems.length,
          isNext: data.is_next,
        });
      }
    } catch (err) {
      console.error("Failed to fetch by temple", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },
}));

export default useContributionStore;