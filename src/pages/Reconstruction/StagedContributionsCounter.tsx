// src/pages/StagedContributionsCounter.tsx
import React,{useState,useEffect} from 'react';
import { Tag, Spin } from 'antd';
import useAuthStore from '../../store/useAuthStore';
import { Group } from '../../store/useReconstructionStore';

interface Props {
  temple_ids: number[];
  groups: Group[];
}

const apiUrl = import.meta.env.VITE_API_URL as string;

// UBAH FUNGSI INI KEMBALI SEPERTI SEMULA UNTUK MENGHITUNG SEMUANYA
const fetchTotalContributionsForTemple = async (templeId: number, token: string | null): Promise<number> => {
  // PERINGATAN: Fungsi ini akan lambat jika data memiliki banyak halaman.
  let totalCount = 0;
  let page = 1;
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      const url = `${apiUrl}/private/contributions/list/${templeId}?page=${page}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        console.warn(`Gagal mengambil kontribusi untuk pura ${templeId}, halaman ${page}`);
        hasNextPage = false; // Hentikan loop jika ada error
        continue;
      }

      const data = await res.json();
      totalCount += data.datas?.length || 0;
      hasNextPage = data.is_next === true;
      page++;
    }
    return totalCount;
  } catch (error) {
    console.error(`Failed to fetch count for temple ${templeId}`, error);
    return 0; // Kembalikan 0 jika ada error
  }
};

const StagedContributionsCounter: React.FC<Props> = ({ temple_ids, groups }) => {
  // Ubah state kembali menjadi number atau null
  const [stagedCount, setStagedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    let isMounted = true;

    const calculateStagedCount = async () => {
      if (!temple_ids || temple_ids.length === 0) {
        setStagedCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Ambil TOTAL kontribusi dari semua temple secara paralel
      const promises = temple_ids.map(id => fetchTotalContributionsForTemple(id, token));
      const counts = await Promise.all(promises);
      const totalContributions = counts.reduce((sum, current) => sum + current, 0);

      // 2. Hitung jumlah kontribusi yang sudah ada di dalam grup
      const groupedContributions = groups.reduce((sum, group) => sum + group.contributions.length, 0);

      // 3. Hitung selisihnya
      const finalStagedCount = totalContributions - groupedContributions;

      if (isMounted) {
        // Pastikan tidak negatif
        setStagedCount(Math.max(0, finalStagedCount));
        setLoading(false);
      }
    };

    calculateStagedCount();

    return () => {
      isMounted = false;
    };
  }, [temple_ids, groups, token]);

  if (loading) {
    return <Spin size="small" />;
  }

  return (
    <Tag color="blue">
      {stagedCount ?? 0} contributions staged
    </Tag>
  );
};

export default StagedContributionsCounter;