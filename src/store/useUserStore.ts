// src/store/useUserStore.ts
import { create } from 'zustand';
import useAuthStore from './useAuthStore';

// Interface untuk profil user yang akan kita fetch
export interface UserProfile {
  user_id: number; // ++ UBAH 'id' menjadi 'user_id' agar cocok dengan API ++
  name: string;
  avatar: string;
  // Anda bisa tambahkan field lain jika endpoint backend memberikannya
}

interface UserState {
  // Kita simpan user dalam bentuk object/map agar mudah dicari berdasarkan ID
  // Contoh: { 4: { user_id: 4, name: 'kadek angga', ... }, 10: { ... } }
  users: Record<number, UserProfile>;
  
  // Aksi untuk mengambil detail user berdasarkan array ID
  fetchUsersByIds: (ids: number[]) => Promise<void>;
}

const apiUrl = import.meta.env.VITE_API_URL as string;

const useUserStore = create<UserState>((set, get) => ({
  users: {},

  fetchUsersByIds: async (ids) => {
    const token = useAuthStore.getState().token;
    if (!token || ids.length === 0) {
      return;
    }

    const currentUserState = get().users;
    const idsToFetch = [...new Set(ids)].filter(id => !currentUserState[id]);

    if (idsToFetch.length === 0) {
      console.log("Semua data user sudah ada di cache.");
      return;
    }

    try {
      const fetchPromises = idsToFetch.map(id =>
        fetch(`${apiUrl}/auth/profile/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
      );

      const responses = await Promise.all(fetchPromises);

      const jsonPromises = responses.map(res => {
        if (!res.ok) {
          console.error(`Gagal mengambil detail untuk user (status: ${res.status})`);
          return null;
        }
        return res.json();
      });
      
      const results = await Promise.all(jsonPromises);

      const fetchedUsers: UserProfile[] = results
        .filter(result => result !== null)
        .map(result => result.datas);

      const usersMap: Record<number, UserProfile> = {};
      fetchedUsers.forEach(user => {
        if (user) {
            // ++ UBAH 'user.id' menjadi 'user.user_id' ++
            usersMap[user.user_id] = user;
        }
      });

      set(state => ({
        users: { ...state.users, ...usersMap },
      }));

    } catch (error) {
      console.error("Gagal saat proses fetch user:", error);
    }
  },
}));

export default useUserStore;