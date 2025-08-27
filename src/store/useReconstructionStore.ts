import { UploadFile } from 'antd';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Tipe Contribution
export interface Contribution {
  contribution_id: number;
  contribution_name: string;
  temple_name: string;
  share_link: string;
  privacy_setting: string;
  category?: string;     // jadikan optional
  temple_id?: number;    // jadikan optional
  groupName?: string; 
}

// Tipe Config untuk Reconstruction
export interface ConfigItem {
  key: string;
  value: string;
}

export type ReconstructionStatus = 'idle' | 'saving' | 'created' | 'ready';

export interface Group {
  group_id: string;
  name: string;
  contributions: Contribution[];
  model: string | { model_id: string; [key: string]: any } | null; 
  status: 'pending' | 'processing' | 'success' | 'failed';
}

export interface ReconstructionMetadata {
  reconstruction_id: string;
  temple_ids: number[];
  label: string;
  groups: Group[];
  user: number;
  created_at: string;
  configuration: ConfigItem | null; // Ubah dari ConfigItem menjadi string
  status: ReconstructionStatus;
  contributions: Contribution[];
  deleted_at: string | null; // Tambahkan properti baru
}

const apiRecons = import.meta.env.VITE_API_RECONSTRUCTION_URL;

export interface ReconstructionState {
  reconstructions: ReconstructionMetadata[];
  setReconstructions: (recons: ReconstructionMetadata[]) => void;

   postReconstructionForAPI: (reconstructionId: string) => Promise<ReconstructionMetadata>;

  // Global configuration list (untuk Settings)
  configs: ConfigItem[];
  addConfig: (config: ConfigItem) => void;
  updateConfig: (key: string, value: string) => void;
  removeConfig: (key: string) => void;

  // Reconstruction actions
  addReconstruction: (label: string, creator: number, templeIds: number[]) =>  Promise<ReconstructionMetadata>;
  removeReconstruction: (reconstructionId: string,date: string) => void;
  updateReconstructionContributions: (reconstructionId: string, contributions: Contribution[]) => void;
  toggleContribution: (reconstructionId: string, contribution: Contribution) => void;
  getSelectedContributions: (reconstructionId: string) => Contribution[];
  getAllReconstructions: () => ReconstructionMetadata[];
  updateReconstructionData: (data: ReconstructionMetadata) => void;

  // Group management
  addGroup: (reconstructionId: string, groupName: string) => Promise<ReconstructionMetadata>,
  removeGroup: (reconstructionId: string, groupId: string) => void;
  addContributionsToGroup: (reconstructionId: string, groupId: string, contributions: Contribution[]) => void;
  updateGroupName: (reconstructionId: string, groupId: string, newName: string) => void;
    uploadGroupModel: (
    reconstructionId: string,
    groupId: string,
    modelID:string,
    files: {
      model_files?: UploadFile<any>[];
      log?: UploadFile<any>;
      eval?: UploadFile<any>;
      nerfstudio_data?: UploadFile<any>;
      nerfstudio_model?: UploadFile<any>;
    },
    date: string
  ) => Promise<boolean>;

  
  
  // New functions for group management
  moveContributionsBetweenGroups: (
    reconstructionId: string,
    sourceGroupId: string,
    targetGroupId: string,
    contributionIds: number[]
  ) => void;
  
  bulkUpdateContributions: (
    reconstructionId: string,
    updates: Array<{
      contribution_id: number;
      changes: Partial<Contribution>;
    }>
  ) => void;

  // Configuration per-reconstruction (single ConfigItem)
  setReconstructionConfig: (reconstructionId: string, config: ConfigItem) => void;
  clearReconstructionConfig: (reconstructionId: string) => void;

  // Status update
  updateStatus: (reconstructionId: string, status: ReconstructionStatus) => void;
  
  // Additional functions we've added
  addGroupWithContributions: (
    reconstructionId: string, 
    groupId: string, 
    groupName: string, 
    contributions: Contribution[]
  ) =>  Promise<ReconstructionMetadata>
  
  mergeGroups: (
    reconstructionId: string, 
    groupIds: string[], 
    newGroupName: string
  ) => void;
  
  removeContributionsFromGroup: (
    reconstructionId: string, 
    groupId: string, 
    contributions: Contribution[]
  ) => void;

  setGroups: (reconstructionId: string, groups: Group[]) => void;
}

// --- Helper: Omit contributions from payload ---
function omitUnnecessaryFields(rec: ReconstructionMetadata) {
  // Keluarkan hanya temple_ids & contributions di root
  const { temple_ids, contributions: rootContribs, ...rest } = rec;

  return {
    ...rest,                          // semua properti lain di root (kecuali temple_ids & rootContribs)
    groups: rec.groups.map(group => ({
      ...group,                       // semua field group lainnya
      contributions: group.contributions, // pastikan nested contributions ikut terkirim
    })),
  };
}


// --- Sync to API ---
async function syncRecToApi(rec: ReconstructionMetadata): Promise<ReconstructionMetadata> {
  // 1. Ambil token dari localStorage
  let token: string | null = null;
  try {
    const authRaw = localStorage.getItem('auth-storage');
    if (authRaw) {
      const auth = JSON.parse(authRaw);
      token = auth.state?.token ?? null;
    }
  } catch {
    token = null;
  }

  // 2. Siapkan headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Omit contributions sebelum send
  const payload = omitUnnecessaryFields(rec);

  try {
    const res = await fetch(`${apiRecons}/${rec.reconstruction_id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API status ${res.status}`);
    console.log('sinkron berhasil');
  } catch (err) {
    console.error('API sync error:', err);
    // Optional: rollback atau set error flag di rec.status
  }

  return rec;
}


const useReconstructionStore = create<ReconstructionState>()(
  persist(
    (set, get) => ({
      
      reconstructions: [],
      setReconstructions: (recons) =>
        set(state => {
          const oldRecons = state.reconstructions

          const merged = recons.map(rec => {
            const prev = oldRecons.find(r => r.reconstruction_id === rec.reconstruction_id)
            return {
              ...rec,
              contributions: prev?.contributions?.length
                ? prev.contributions
                : rec.contributions ?? [],
              groups: rec.groups.map(g => ({
                ...g,
                contributions: g.contributions.map(c => ({
                  ...c,
                  category: c.category ?? 'other',
                  temple_id: c.temple_id ?? 0,
                  privacy_setting: c.privacy_setting ?? 'public'
                }))
              }))
            } as ReconstructionMetadata
          })

          // **HANYA** return properti yang mau di‑update
          return { reconstructions: merged }
        }),
      configs: [],

    uploadGroupModel: async (
      reconstructionId: string,
      groupId: string,
      modelID: string,
      files: {
        model_files?: UploadFile<any>[];
        log?: UploadFile<any>;
        eval?: UploadFile<any>;
        nerfstudio_data?: UploadFile<any>;
        nerfstudio_model?: UploadFile<any>;
      },
      date: string
    ): Promise<boolean> => {
      const formData = new FormData();
      formData.append('model_id', modelID);

      files.model_files?.forEach(uf => {
        if (uf.originFileObj) formData.append('model_files', uf.originFileObj);
      });
      if (files.log?.originFileObj) formData.append('log', files.log.originFileObj);
      if (files.eval?.originFileObj) formData.append('eval', files.eval.originFileObj);
      if (files.nerfstudio_data?.originFileObj)
        formData.append('nerfstudio_data', files.nerfstudio_data.originFileObj);
      if (files.nerfstudio_model?.originFileObj)
        formData.append('nerfstudio_model', files.nerfstudio_model.originFileObj);

      // Token
      let token: string | null = null;
      try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const auth = JSON.parse(raw);
          token = auth.state?.token ?? null;
        }
      } catch {}

      const response = await fetch(
        `${apiRecons}/model/${reconstructionId}?groupID=${groupId}&month=${date}`,
        {
          method: 'PUT',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!response.ok) {
        console.error('Upload failed:', await response.text());
        return false;
      }

     
  // ✅ Update state dengan tipe yang eksplisit
  const newReconstructions = get().reconstructions.map(rec => {
    if (rec.reconstruction_id !== reconstructionId) {
      return rec;
    }

    // Eksplisit tipe untuk group yang di-update
    const updatedGroups: Group[] = rec.groups.map(g => {
      if (g.group_id !== groupId) {
        return g;
      }
      
      // Pastikan modelInfo sesuai dengan tipe Group['model']
      const updatedModel: Group['model'] = {
        model_id: modelID,
        model_files: files.model_files?.map(f => f.name) ?? [],
        log: files.log?.name,
        eval: files.eval?.name,
        nerfstudio_data: files.nerfstudio_data?.name,
        nerfstudio_model: files.nerfstudio_model?.name,
        date,
      };

      return {
        ...g,
        status: 'success',
        model: updatedModel,
      };
    });

    // Eksplisit tipe untuk reconstruction yang di-update
          const updatedRec: ReconstructionMetadata = {
            ...rec,
            status: 'ready',
            groups: updatedGroups,
          };

          return updatedRec;
        });

        set({ reconstructions: newReconstructions });
        return true;
    },




      postReconstructionForAPI: async (reconstructionId) => {
  const state = get();
  const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
  if (!rec) throw new Error('Reconstruction not found');

  // Simpan status lama untuk rollback
  const prevStatus = rec.status;

  // 1. Set status root jadi 'ready' di local state
  set(s => ({
    reconstructions: s.reconstructions.map(r =>
      r.reconstruction_id === reconstructionId
        ? { ...r, status: 'ready' }
        : r
    )
  }));

  // 2. Ambil kembali rec yang sudah status='ready'
  const updatedRec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId)!;

  // 3. Bangun payload secara manual:
  //    - omit temple_ids & root.contributions
  //    - set root.configuration = configuration.value
  //    - set root.status = 'ready'
  //    - include groups[].contributions
  const { temple_ids, contributions: rootContribs, ...base } = updatedRec;
  const payload = {
    ...base,
    configuration: updatedRec.configuration?.value,
    status: 'ready',
    groups: updatedRec.groups.map(g => ({
      ...g,
      contributions: g.contributions,  // keep nested contributions
    })),
  };

  // 4. Ambil token dan headers seperti biasa
  let token: string | null = null;
  try {
    const authRaw = localStorage.getItem('auth-storage');
    if (authRaw) {
      const auth = JSON.parse(authRaw);
      token = auth.state?.token || null;
    }
  } catch {
    console.warn('Failed to parse auth-storage');
  }
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // 5. Panggil API dengan payload di atas
  try {
    const response = await fetch(`${apiRecons}/${reconstructionId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API status ${response.status}: ${errText}`);
    }
    console.log('Sync berhasil');
    return updatedRec;
  } catch (err) {
    console.error('Sync gagal:', err);
    // rollback status kalau perlu
    set(s => ({
      reconstructions: s.reconstructions.map(r =>
        r.reconstruction_id === reconstructionId
          ? { ...r, status: prevStatus }
          : r
      )
    }));
    throw err;
  }
      },

      addReconstruction: async (label, creator, templeIds) => {
        const newId = `rec-${Date.now()}`;
        const now = new Date().toISOString();
        const newRec: ReconstructionMetadata = {
          reconstruction_id: newId,
          label,
          temple_ids: templeIds,
          groups: [],
          user: creator,
          created_at: now,
          configuration: null,
          status: 'idle',
          contributions: [],
          deleted_at: null,
        };

        // Simpan di local state terlebih dahulu
        set(state => ({
          reconstructions: [...state.reconstructions, newRec]
        }));

        // Ambil token
        let token: string | null = null;
        try {
          const authRaw = localStorage.getItem('auth-storage');
          if (authRaw) token = JSON.parse(authRaw).state?.token || null;
        } catch {}

        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Kirim ke API
        const response = await fetch(`${apiRecons}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newRec),
        });
        if (!response.ok) {
          const text = await response.text();
          console.error('Failed to create reconstruction:', text);
          throw new Error(`API status ${response.status}`);
        }

        console.log('Reconstruction created successfully');
        return newRec;
      },


      updateReconstructionData: (data) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => 
            rec.reconstruction_id === data.reconstruction_id
              ? { ...rec, ...data }
              : rec
          )
        }));
      },

      // Hapus reconstruction
      removeReconstruction: async (reconstructionId: string, date: string) => {
        // 1. Ambil JWT dari localStorage
        let token: string | null = null;
        try {
          const authRaw = localStorage.getItem('auth-storage');
          if (authRaw) {
            const auth = JSON.parse(authRaw);
            token = auth.state?.token || null;
          }
        } catch {
          console.warn('Failed to parse auth-storage');
        }

        // 2. Siapkan headers, sertakan Authorization bila ada token
        const headers: Record<string,string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        try {
          // 3. Panggil API DELETE dengan header Bearer
          const res = await fetch(
            `${apiRecons}/${reconstructionId}?month=${date}`,
            { method: 'DELETE', headers }
          );

          // 4. Baca body JSON (jika ada)
          const result = await res.json().catch(() => ({}));

          if (!res.ok) {
            // Kalau HTTP status bukan 2xx, lempar error
            throw new Error(result.message || `Failed to delete (status ${res.status})`);
          }

          // 5. Kalau server menjawab sukses, update local state
          if (result.message === 'Successfully delete reconstruction') {
            set(state => ({
              reconstructions: state.reconstructions.filter(
                rec => rec.reconstruction_id !== reconstructionId
              )
            }));
          }
        } catch (err: any) {
          console.error('Error deleting reconstruction:', err);
        }
      },


      // Update list contributions
      updateReconstructionContributions: (reconstructionId, contributions) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId
              ? { ...rec, contributions }
              : rec
          )
        }));
      },

      // Toggle satu contribution
      toggleContribution: (reconstructionId, contribution) => {
        set(state => {
          const updated = state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            const exists = rec.contributions.some(
              c => c.contribution_id === contribution.contribution_id
            );
            const newList = exists
              ? rec.contributions.filter(
                  c => c.contribution_id !== contribution.contribution_id
                )
              : [...rec.contributions, contribution];
            return { ...rec, contributions: newList };
          });
          return { reconstructions: updated };
        });
      },

      // Ambil contributions terpilih
      getSelectedContributions: (reconstructionId) => {
        const rec = get().reconstructions.find(
          r => r.reconstruction_id === reconstructionId
        );
        return rec?.contributions || [];
      },

      // Ambil semua reconstruction
      getAllReconstructions: () => get().reconstructions,

      // Group management
      addGroup: async (reconstructionId, groupName): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        const newGroupId = `group-${Date.now()}`;
        const newGroup: Group = {
          group_id:    newGroupId,
          name:        groupName,
          model:       null,
          status:      'success',
          contributions: []
        };

        // 1) Beri tahu TS bahwa ini adalah ReconstructionMetadata
        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: [...rec.groups, newGroup],
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        try {
          const res = await fetch(`${apiRecons}/${reconstructionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRec),
          });
          if (!res.ok) throw new Error('API failed');
          console.log('update rec with add group');
          
        } catch (e) {
          console.error(e);
        }

        return updatedRec;  // sekarang cocok dengan Promise<ReconstructionMetadata>
      },

     removeGroup: async (
        reconstructionId: string,
        groupId: string
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        // 1) Hitung updatedRec
        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: rec.groups.filter(g => g.group_id !== groupId),
          status: 'created'
        };

        // 2) Update state lokal
        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        // 3) Sinkron ke API
        return syncRecToApi(updatedRec);
      },


      addContributionsToGroup: async (
          reconstructionId: string,
          groupId: string,
          contributions: Contribution[]
        ): Promise<ReconstructionMetadata> => {
          const state = get();
          const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
          if (!rec) throw new Error('Reconstruction not found');

          const updatedGroups = rec.groups.map(g => {
            if (g.group_id === groupId) {
              // merge baru
              const merged = [
                ...g.contributions,
                ...contributions.filter(c => !g.contributions.some(x => x.contribution_id === c.contribution_id))
              ];
              return { ...g, contributions: merged };
            }
            // hapus jika di-group lain
            const filtered = g.contributions.filter(c =>
              !contributions.some(x => x.contribution_id === c.contribution_id)
            );
            return { ...g, contributions: filtered };
          });

          const updatedRec: ReconstructionMetadata = {
            ...rec,
            groups: updatedGroups,
            status: 'created'
          };

          set(s => ({
            reconstructions: s.reconstructions.map(r =>
              r.reconstruction_id === reconstructionId ? updatedRec : r
            )
          }));

          return syncRecToApi(updatedRec);
        },


      updateGroupName: async (
        reconstructionId: string,
        groupId: string,
        newName: string
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: rec.groups.map(g =>
            g.group_id === groupId ? { ...g, name: newName } : g
          ),
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        return syncRecToApi(updatedRec);
      },

      setGroups: async (
        reconstructionId: string,
        groups: Group[]
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups,
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        return syncRecToApi(updatedRec);
      },

      // New function: Move contributions between groups
      moveContributionsBetweenGroups: async (
        reconstructionId: string,
        sourceGroupId: string,
        targetGroupId: string,
        contributionIds: number[]
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        // hitung baru seperti sebelumnya…
        const sourceGroup = rec.groups.find(g => g.group_id === sourceGroupId);
        const contributionsToMove = sourceGroup
          ? sourceGroup.contributions.filter(c => contributionIds.includes(c.contribution_id))
          : [];

        if (contributionsToMove.length === 0) return rec;

        const updatedGroups = rec.groups.map(g => {
          if (g.group_id === sourceGroupId) {
            return {
              ...g,
              contributions: g.contributions.filter(c => !contributionIds.includes(c.contribution_id))
            };
          } else if (g.group_id === targetGroupId) {
            const existingIds = new Set(g.contributions.map(c => c.contribution_id));
            const toAdd = contributionsToMove.filter(c => !existingIds.has(c.contribution_id));
            return { ...g, contributions: [...g.contributions, ...toAdd] };
          }
          return g;
        });

        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: updatedGroups,
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        return syncRecToApi(updatedRec);
      },


      // Additional functions we've added
      addGroupWithContributions: async (
        reconstructionId: string,
        groupId: string,
        groupName: string,
        contributions: Contribution[]
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        const newGroup: Group = {
          group_id:      groupId,
          name:          groupName,
          contributions,
          model:         null,
          status:        'success'
        };

        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: [...rec.groups, newGroup],
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        return syncRecToApi(updatedRec);
      },

      
      mergeGroups: async (
        reconstructionId: string,
        groupIds: string[],
        newGroupName: string
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        // kumpulkan kontribusi dari grup yang di-merge
        const contributionsToMerge: Contribution[] = [];
        const groupsToKeep: Group[] = [];

        rec.groups.forEach(g => {
          if (groupIds.includes(g.group_id)) {
            contributionsToMerge.push(...g.contributions);
          } else {
            groupsToKeep.push(g);
          }
        });

        const newGroup: Group = {
          group_id:      `group-${Date.now()}-${reconstructionId}`,
          name:          newGroupName,
          contributions: contributionsToMerge,
          model:         null,
          status:        'success'
        };

        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: [...groupsToKeep, newGroup],
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        return syncRecToApi(updatedRec);
      },

      
      removeContributionsFromGroup: async (
        reconstructionId: string,
        groupId: string,
        contributions: Contribution[]
      ): Promise<ReconstructionMetadata> => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        const updatedGroups = rec.groups.map(g => {
          if (g.group_id !== groupId) return g;
          const filtered = g.contributions.filter(
            c => !contributions.some(cont => cont.contribution_id === c.contribution_id)
          );
          return { ...g, contributions: filtered };
        });

        const updatedRec: ReconstructionMetadata = {
          ...rec,
          groups: updatedGroups,
          status: 'created'
        };

        set(s => ({
          reconstructions: s.reconstructions.map(r =>
            r.reconstruction_id === reconstructionId ? updatedRec : r
          )
        }));

        return syncRecToApi(updatedRec);
      },


      // New function: Bulk update contributions
      bulkUpdateContributions: (reconstructionId, updates) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            
            // Create a map of updates for quick lookup
            const updateMap = new Map(
              updates.map(u => [u.contribution_id, u.changes])
            );
            
            // Update contributions in main list
            const updatedContributions = rec.contributions.map(c => 
              updateMap.has(c.contribution_id)
                ? { ...c, ...updateMap.get(c.contribution_id) }
                : c
            );
            
            // Update contributions in groups
            const updatedGroups = rec.groups.map(g => ({
              ...g,
              contributions: g.contributions.map(c => 
                updateMap.has(c.contribution_id)
                  ? { ...c, ...updateMap.get(c.contribution_id) }
                  : c
              )
            }));
            
            return {
              ...rec,
              contributions: updatedContributions,
              groups: updatedGroups
            };
          })
        }));
      },

      // Set konfigurasi single
      setReconstructionConfig: (reconstructionId, config) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId
              ? { ...rec, configuration: config }
              : rec
          )
        }));
      },

      // Clear konfigurasi
      clearReconstructionConfig: (reconstructionId) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId
              ? { ...rec, configuration: null }
              : rec
          )
        }));
      },

      // Global configs
      addConfig: (config) => {
        set(state => {
          const exists = state.configs.findIndex(c => c.key === config.key);
          if (exists > -1) {
            const updated = [...state.configs];
            updated[exists] = config;
            return { configs: updated };
          }
          return { configs: [...state.configs, config] };
        });
      },

      updateConfig: (key, value) => {
        set(state => {
          const idx = state.configs.findIndex(c => c.key === key);
          if (idx > -1) {
            const updated = [...state.configs];
            updated[idx] = { ...updated[idx], value };
            return { configs: updated };
          }
          return { configs: [...state.configs, { key, value }] };
        });
      },

      removeConfig: (key) => {
        set(state => ({ configs: state.configs.filter(c => c.key !== key) }));
      },

      // Update status reconstruction
      updateStatus: (reconstructionId, status) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId
              ? { ...rec, status }
              : rec
          )
        }));
      },
      
      
    }),
    {
      name: 'reconstruction-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useReconstructionStore;