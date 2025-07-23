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
  model: string | null;
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

  postReconstructionForAPI: (reconstructionId: string) => Promise<void>;

  // Global configuration list (untuk Settings)
  configs: ConfigItem[];
  addConfig: (config: ConfigItem) => void;
  updateConfig: (key: string, value: string) => void;
  removeConfig: (key: string) => void;

  // Reconstruction actions
  addReconstruction: (label: string, creator: number, templeIds: number[]) => ReconstructionMetadata;
  removeReconstruction: (reconstructionId: string,date: string) => void;
  updateReconstructionContributions: (reconstructionId: string, contributions: Contribution[]) => void;
  toggleContribution: (reconstructionId: string, contribution: Contribution) => void;
  getSelectedContributions: (reconstructionId: string) => Contribution[];
  getAllReconstructions: () => ReconstructionMetadata[];
  updateReconstructionData: (data: ReconstructionMetadata) => void;

  // Group management
  addGroup: (reconstructionId: string, groupName: string) => void;
  removeGroup: (reconstructionId: string, groupId: string) => void;
  addContributionsToGroup: (reconstructionId: string, groupId: string, contributions: Contribution[]) => void;
  updateGroupName: (reconstructionId: string, groupId: string, newName: string) => void;
  
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
  ) => void;
  
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

const useReconstructionStore = create<ReconstructionState>()(
  persist(
    (set, get) => ({
      
      reconstructions: [],
       setReconstructions: (recons) => 
        set({ 
          reconstructions: recons.map(rec => ({
            ...rec,
            contributions: rec.contributions || [], // Pastikan array contributions
            groups: rec.groups.map(group => ({
              ...group,
              contributions: group.contributions.map(contrib => ({
                ...contrib,
                category: contrib.category || 'other',
                temple_id: contrib.temple_id || 0,
                privacy_setting: contrib.privacy_setting || 'public'
              }))
            }))
          }))
        }),
      configs: [],

      postReconstructionForAPI: async (reconstructionId) => {
        const state = get();
        const rec = state.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');

        // --- Ubah di sini ---
        const payload = {
          reconstruction_id: rec.reconstruction_id,
          label: rec.label,
          user: rec.user,
          created_date: rec.created_at,
          configuration: rec.configuration?.value || "",
          status: 'ready',

          // sebelumnya:
          // groups: rec.groups.map(g => g.group_id),

          // sekarang kirim seluruh data grup:
          groups: rec.groups.map(g => ({
            group_id:    g.group_id,
            name:        g.name,
            model:       g.model,
            status:      g.status,
            contributions: g.contributions.map(c => ({
              contribution_id:   c.contribution_id,
              contribution_name: c.contribution_name,
              temple_name:       c.temple_name,
              share_link:        c.share_link,
              privacy_setting:   c.privacy_setting,
              category:          c.category,
              temple_id:         c.temple_id
            }))
          }))
          // —atau cukup groups: rec.groups, jika struktur objeknya sudah pas—
        };
        // ------------------

        try {
          // panggil API dengan `payload`
          const response = await fetch(`${apiRecons}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error('Failed to save reconstruction');
       
          state.updateStatus(reconstructionId, 'ready');
         
          
        } catch (error) {
          console.error('API Error:', error);
          throw error;
        }
      },


      // Tambah reconstruction baru
      addReconstruction: (label: string, creator: number, templeIds: number[]) => {
        
        


        const newId = `rec-${Date.now()}`;
        const now = new Date().toISOString();
        const newRec: ReconstructionMetadata = {
          reconstruction_id: newId,
          label,
          temple_ids: templeIds,  // Simpan SEMUA temple IDs
          groups: [],
          user: creator,
          created_at: now,
          configuration: null,
          status: 'idle',
          contributions: [], // Akan diisi nanti,
          deleted_at:null,
        };
        set(state => ({ reconstructions: [...state.reconstructions, newRec] }));
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
       removeReconstruction: async (reconstructionId,date) => {
          try {
            // 1) Panggil API untuk hapus data di server
            const res = await fetch(`${apiRecons}/${reconstructionId}?date=${date}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
            });
            const result = await res.json();
            if(result.message == "Successfully delete reconstruction") {
               // 2) Kalau sukses, baru update state
                set(state => ({
                  reconstructions: state.reconstructions.filter(
                    rec => rec.reconstruction_id !== reconstructionId
                  )
                }));
            }
            
            if (!res.ok) {
              // baca error dari body (jika ada)
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.message || 'Failed to delete reconstruction');
            }

           

           
          } catch (err: any) {
            console.error('Error deleting reconstruction:', err);
            console.log(err.message);
           
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
      addGroup: (reconstructionId, groupName) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            const newGroup: Group = {
              group_id: `group-${Date.now()}`,
              name: groupName,
              contributions: [],
              model: null,
              status: 'success'         // langsung sukses
            };
            return {
              ...rec,
              groups: [...rec.groups, newGroup],
              status: 'created'         // ubah status reconstruction
            };
          })
        }));
      },

      removeGroup: (reconstructionId, groupId) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            return { ...rec, groups: rec.groups.filter(g => g.group_id !== groupId) };
          })
        }));
      },

      addContributionsToGroup: (reconstructionId, groupId, contributions) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
          
            return {
              ...rec,
              groups: rec.groups.map(g => {
                // 1) Jika ini group target, tambahkan kontribusi yg belum ada
                if (g.group_id === groupId) {
                  const merged = [
                    ...g.contributions,
                    ...contributions.filter(
                      c => !g.contributions.some(x => x.contribution_id === c.contribution_id)
                    )
                  ];
                  return { ...g, contributions: merged };
                }
                // 2) Selain itu (group lain), pastikan kontribusi ini dikeluarkan
                const filtered = g.contributions.filter(
                  c => !contributions.some(x => x.contribution_id === c.contribution_id)
                );
                return { ...g, contributions: filtered };
              })
            };
          })

        }));
        return true;
      },

      updateGroupName: (reconstructionId, groupId, newName) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            return {
              ...rec,
              groups: rec.groups.map(g => 
                g.group_id === groupId ? { ...g, name: newName } : g
              )
            };
          })
        }));
      },
      setGroups: (reconstructionId, groups) =>
        set((state) => ({
          reconstructions: state.reconstructions.map((rec) =>
            rec.reconstruction_id === reconstructionId
              ? { ...rec, groups }
              : rec
          )
        })),
      // New function: Move contributions between groups
      moveContributionsBetweenGroups: (reconstructionId, sourceGroupId, targetGroupId, contributionIds) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            
            // Find contributions to move
            const sourceGroup = rec.groups.find(g => g.group_id === sourceGroupId);
            if (!sourceGroup) return rec;
            
            const contributionsToMove = sourceGroup.contributions.filter(c => 
              contributionIds.includes(c.contribution_id)
            );
            
            if (contributionsToMove.length === 0) return rec;
            
            return {
              ...rec,
              groups: rec.groups.map(g => {
                if (g.group_id === sourceGroupId) {
                  // Remove from source group
                  return {
                    ...g,
                    contributions: g.contributions.filter(c => 
                      !contributionIds.includes(c.contribution_id)
                    )}
                } else if (g.group_id === targetGroupId) {
                  // Add to target group (only if not already present)
                  const existingIds = new Set(g.contributions.map(c => c.contribution_id));
                  const newContributions = contributionsToMove.filter(c => 
                    !existingIds.has(c.contribution_id)
                  );
                  return {
                    ...g,
                    contributions: [...g.contributions, ...newContributions]
                  };
                }
                return g;
              })
            };
          })
        }));
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
      
      // Additional functions we've added
      addGroupWithContributions: (reconstructionId, groupId, groupName, contributions) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            
            const newGroup: Group = {
              group_id: groupId,
              name: groupName,
              contributions: contributions,
              model: null,
              status: 'success'
            };
            
            return {
              ...rec,
              groups: [...rec.groups, newGroup],
              status: 'created'
            };
          })
        }));
      },
      
      mergeGroups: (reconstructionId, groupIds, newGroupName) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            
            // Kumpulkan semua kontribusi dari grup yang akan di-merge
            const contributionsToMerge: Contribution[] = [];
            const groupsToKeep: Group[] = [];
            
            rec.groups.forEach(group => {
              if (groupIds.includes(group.group_id)) {
                contributionsToMerge.push(...group.contributions);
              } else {
                groupsToKeep.push(group);
              }
            });
            
            // Buat grup baru
            const newGroup: Group = {
              group_id: `group-${Date.now()}-${rec.reconstruction_id}`,
              name: newGroupName,
              contributions: contributionsToMerge,
              model: null,
              status: 'success'
            };
            
            return {
              ...rec,
              groups: [...groupsToKeep, newGroup]
            };
          })
        }));
      },
      
      removeContributionsFromGroup: (reconstructionId, groupId, contributions) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id !== reconstructionId) return rec;
            
            return {
              ...rec,
              groups: rec.groups.map(g => {
                if (g.group_id === groupId) {
                  const newContributions = g.contributions.filter(
                    c => !contributions.some(cont => cont.contribution_id === c.contribution_id)
                  );
                  return { ...g, contributions: newContributions };
                }
                return g;
              })
            };
          })
        }));
      }
    }),
    {
      name: 'reconstruction-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useReconstructionStore;