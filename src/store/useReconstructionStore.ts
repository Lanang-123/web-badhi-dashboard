// src/store/useReconstructionStore.ts

import { UploadFile } from 'antd';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import useUserStore, { UserProfile } from './useUserStore';

// --- Interface dan Tipe Data ---
export interface Contribution {
  contribution_id: number;
  contribution_name: string;
  temple_name: string;
  share_link: string;
  privacy_setting: string;
  category?: string;
  temple_id?: number;
  groupName?: string; 
  user_id: number;
}
export interface ConfigItem {
  id: string;
  key: string;
  value: string;
}
export type NewConfigPayload = Omit<ConfigItem, 'id'>;
export type ReconstructionStatus = 'idle' | 'saving' | 'created' | 'ready';

export interface AuxData {
  temple_id?: number;
  name: string[];
  avatar: string[];
}

export interface Group {
  group_id: string;
  name: string;
  contributions: Contribution[];
  model: string | { model_id: string; [key: string]: any } | null; 
  status: 'pending' | 'processing' | 'success' | 'failed';
  aux?: AuxData;
}

export interface ReconstructionMetadata {
  reconstruction_id: string;
  temple_ids: number[];
  label: string;
  groups: Group[];
  user: number;
  created_at: string;
  configuration: ConfigItem | null;
  status: ReconstructionStatus;
  contributions: Contribution[];
  deleted_at: string | null;
}

export interface UploadStatus {
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

const apiRecons = import.meta.env.VITE_API_RECONSTRUCTION_URL;
const apiConfig = import.meta.env.VITE_API_CONFIG;
const apiModel = import.meta.env.VITE_API_MODEL;

const getTokenFromStorage = (): string | null => {
  try {
    const authRaw = localStorage.getItem('auth-storage');
    if (authRaw) {
      const authData = JSON.parse(authRaw);
      return authData?.state?.token ?? null;
    }
  } catch (error) {
    console.error("Gagal mengambil token dari localStorage:", error);
  }
  return null;
};

const generateAuxData = (
  groupContributions: Contribution[],
  userCache: Record<number, UserProfile>
): AuxData => {
  const userMap = new Map<number, { name: string; avatar: string }>();

  groupContributions.forEach(c => {
    const userDetail = userCache[c.user_id];
    if (userDetail && !userMap.has(c.user_id)) {
      userMap.set(c.user_id, { name: userDetail.name, avatar: userDetail.avatar || '' });
    }
  });

  const names: string[] = [];
  const avatars: string[] = [];
  userMap.forEach(user => {
    names.push(user.name);
    avatars.push(user.avatar);
  });
  
  const temple_id = groupContributions.length > 0 ? groupContributions[0].temple_id : undefined;

  return { temple_id, name: names, avatar: avatars };
};

export interface ReconstructionState {
  reconstructions: ReconstructionMetadata[];
  configs: ConfigItem[];
  uploadStatuses: Record<string, UploadStatus>;
  setReconstructions: (recons: ReconstructionMetadata[]) => void;
  postReconstructionForAPI: (reconstructionId: string) => Promise<ReconstructionMetadata>;
  fetchConfigs: () => Promise<void>;
  addConfig: (config: NewConfigPayload) => Promise<void>;
  updateConfig: (key: string, value: string, id: string) => Promise<void>;
  removeConfig: (id: string) => Promise<void>;
  setUploadStatus: (groupId: string, status: UploadStatus) => void;
  clearUploadStatus: (groupId: string) => void;
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
    date: string,
    signal: AbortSignal
  ) => Promise<boolean>;
  addReconstruction: (label: string, creator: number, templeIds: number[]) =>  Promise<ReconstructionMetadata>;
  removeReconstruction: (reconstructionId: string, date: string) => void;
  updateReconstructionContributions: (reconstructionId: string, contributions: Contribution[]) => void;
  updateReconstructionData: (data: ReconstructionMetadata) => void;
  addGroup: (reconstructionId: string, groupName: string) => Promise<ReconstructionMetadata>,
  removeGroup: (reconstructionId: string, groupId: string) => Promise<ReconstructionMetadata>;
  addContributionsToGroup: (reconstructionId: string, groupId: string, contributions: Contribution[]) => Promise<ReconstructionMetadata>;
  updateGroupName: (reconstructionId: string, groupId: string, newName: string) => Promise<ReconstructionMetadata>;
  setReconstructionConfig: (reconstructionId: string, config: ConfigItem) => void;
  updateStatus: (reconstructionId: string, status: ReconstructionStatus) => void;
  addGroupWithContributions: (
    reconstructionId: string, 
    groupId: string, 
    groupName: string, 
    contributions: Contribution[]
  ) =>  Promise<ReconstructionMetadata>
  mergeGroups: (
    reconstructionId: string, 
    groupIds: string[], 
    newGroupName: string,
    selectedModel: Group['model'] // <-- PERUBAHAN DI SINI
  ) => Promise<ReconstructionMetadata>;
  removeContributionsFromGroup: (
    reconstructionId: string, 
    groupId: string, 
    contributions: Contribution[]
  ) => Promise<ReconstructionMetadata>;
  setGroups: (reconstructionId: string, groups: Group[]) => Promise<ReconstructionMetadata>;
  getSelectedContributions: (reconstructionId: string) => Contribution[];
  toggleContribution: (reconstructionId: string, contribution: Contribution) => void;
}

function omitUnnecessaryFields(rec: ReconstructionMetadata) {
  const { temple_ids, contributions: rootContribs, ...rest } = rec;
  const { configuration, ...finalRest } = rest;
  return {
    ...finalRest,
    configuration: configuration?.value,
    groups: rec.groups.map(group => ({
      ...group,
      contributions: group.contributions,
    })),
  };
}

async function syncRecToApi(rec: ReconstructionMetadata): Promise<ReconstructionMetadata> {
  const token = getTokenFromStorage();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const payload = omitUnnecessaryFields(rec);
  try {
    const res = await fetch(`${apiRecons}/${rec.reconstruction_id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API status ${res.status}`);
  } catch (err) {
    console.error('API sync error:', err);
  }
  return rec;
}

const useReconstructionStore = create<ReconstructionState>()(
  persist(
    (set, get) => ({
      reconstructions: [],
      configs: [],
      uploadStatuses: {},

      setReconstructions: (recons) => set({ reconstructions: recons }),
      
      fetchConfigs: async () => {
        const token = getTokenFromStorage();
        try {
          const response = await fetch(`${apiConfig}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (!response.ok) throw new Error('Network response was not ok');
          
          const responseData = await response.json();
          const configsArray = Array.isArray(responseData) ? responseData : responseData.datas || [];
          set({ configs: configsArray });

        } catch (error) {
          console.error("Failed to fetch configs:", error);
          set({ configs: [] });
        }
      },

      addConfig: async (config) => {
        const token = getTokenFromStorage();
        if (!token) return console.error("Token tidak ditemukan");

        try {
          const response = await fetch(`${apiConfig}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config),
          });
          if (!response.ok) throw new Error('Gagal membuat config');
          await get().fetchConfigs();
        } catch (error) {
          console.error("Gagal menambah config:", error);
        }
      },
      
      updateConfig: async (_key, value, id) => {
          const token = getTokenFromStorage();
          if (!token) return console.error("Token tidak ditemukan");

          try {
            const response = await fetch(`${apiConfig}/${id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ value }),
            });
            if (!response.ok) throw new Error('Gagal mengupdate config');
            await get().fetchConfigs();
          } catch (error) {
            console.error("Gagal mengupdate config:", error);
          }
      },

      removeConfig: async (id) => {
        const token = getTokenFromStorage();
        if (!token) return console.error("Token tidak ditemukan");

        try {
          const response = await fetch(`${apiConfig}/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) throw new Error('Gagal menghapus config');
          await get().fetchConfigs();
        } catch (error) {
          console.error("Gagal menghapus config:", error);
        }
      },

      setUploadStatus: (groupId, status) => {
        set(state => ({
          uploadStatuses: {
            ...state.uploadStatuses,
            [groupId]: status,
          }
        }));
      },

      clearUploadStatus: (groupId) => {
        set(state => {
          const newStatuses = { ...state.uploadStatuses };
          delete newStatuses[groupId];
          return { uploadStatuses: newStatuses };
        });
      },

      getSelectedContributions: (reconstructionId: string) => {
        const recon = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        return recon?.contributions ?? [];
      },
      
      toggleContribution: (reconstructionId, contribution) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec => {
            if (rec.reconstruction_id === reconstructionId) {
              const currentContributions = rec.contributions ?? [];
              const isSelected = currentContributions.some(
                c => c.contribution_id === contribution.contribution_id
              );
              
              const newContributions = isSelected
                ? currentContributions.filter(c => c.contribution_id !== contribution.contribution_id)
                : [...currentContributions, contribution];
              return { ...rec, contributions: newContributions };
            }
            return rec;
          })
        }));
      },

      uploadGroupModel: async (reconstructionId, groupId, modelID, files, date, signal) => {
        const { setUploadStatus, clearUploadStatus } = get();
        setUploadStatus(groupId, { progress: 0, status: 'uploading' });
        const formData = new FormData();
        formData.append('model_id', modelID);
        files.model_files?.forEach(uf => {
          if (uf.originFileObj) formData.append('model_files', uf.originFileObj as Blob);
        });
        if (files.log?.originFileObj) formData.append('log', files.log.originFileObj as Blob);
        if (files.eval?.originFileObj) formData.append('eval', files.eval.originFileObj as Blob);
        if (files.nerfstudio_data?.originFileObj) formData.append('nerfstudio_data', files.nerfstudio_data.originFileObj as Blob);
        if (files.nerfstudio_model?.originFileObj) formData.append('nerfstudio_model', files.nerfstudio_model.originFileObj as Blob);
        const token = getTokenFromStorage();
        try {
            const response = await axios.put(
                `${apiModel}/model/${reconstructionId}?groupID=${groupId}&month=${date}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    onUploadProgress: (progressEvent) => {
                        const { loaded, total } = progressEvent;
                        if (total) {
                            const percentCompleted = Math.round((loaded * 100) / total);
                            setUploadStatus(groupId, { progress: percentCompleted, status: 'uploading' });
                        }
                    },
                    signal: signal
                }
            );
            console.log(response.data);
            
            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`Server error: ${response.status}`);
            }
            setUploadStatus(groupId, { progress: 100, status: 'success' });
            const newReconstructions = get().reconstructions.map(rec => {
                if (rec.reconstruction_id !== reconstructionId) return rec;
                const updatedGroups: Group[] = rec.groups.map(g => {
                    if (g.group_id !== groupId) return g;
                    const updatedModel: Group['model'] = {
                        model_id: modelID,
                        model_files: files.model_files?.map(f => f.name) ?? [],
                        log: files.log?.name,
                        eval: files.eval?.name,
                        nerfstudio_data: files.nerfstudio_data?.name,
                        nerfstudio_model: files.nerfstudio_model?.name,
                        date,
                    };
                    return { ...g, status: 'success', model: updatedModel };
                });
                const updatedRec: ReconstructionMetadata = { ...rec, status: 'ready', groups: updatedGroups };
                return updatedRec;
            });
            set({ reconstructions: newReconstructions });
            setTimeout(() => clearUploadStatus(groupId), 5000);
            return true;
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request dibatalkan oleh pengguna:', error.message);
                clearUploadStatus(groupId);
                throw new Error('CanceledError');
            } else {
                console.error('Upload error:', error);
                setUploadStatus(groupId, { progress: 0, status: 'error' });
                setTimeout(() => clearUploadStatus(groupId), 5000);
            }
            return false;
        }
      },

      postReconstructionForAPI: async (reconstructionId) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const prevStatus = rec.status;
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? { ...r, status: 'ready' } : r)
        }));
        const updatedRec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId)!;
        const payload = omitUnnecessaryFields(updatedRec);
        const token = getTokenFromStorage();
        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
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
          return updatedRec;
        } catch (err) {
          console.error('Sync failed:', err);
          set(s => ({
            reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? { ...r, status: prevStatus } : r)
          }));
          throw err;
        }
      },

      addReconstruction: async (label, creator, templeIds) => {
        const newId = `rec-${Date.now()}`;
        const newRec: ReconstructionMetadata = {
          reconstruction_id: newId,
          label,
          temple_ids: templeIds,
          groups: [],
          user: creator,
          created_at: new Date().toISOString(),
          configuration: null,
          status: 'idle',
          contributions: [],
          deleted_at: null,
        };
        set(state => ({ reconstructions: [...state.reconstructions, newRec] }));
        const token = getTokenFromStorage();
        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${apiRecons}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newRec),
        });
        if (!response.ok) {
          const text = await response.text();
          console.error('Failed to create reconstruction:', text);
          set(state => ({ reconstructions: state.reconstructions.filter(r => r.reconstruction_id !== newId) }));
          throw new Error(`API status ${response.status}`);
        }
        return newRec;
      },

      updateReconstructionData: (data) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === data.reconstruction_id ? { ...rec, ...data } : rec
          )
        }));
      },

      removeReconstruction: async (reconstructionId, date) => {
        const token = getTokenFromStorage();
        const headers: Record<string,string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        try {
          const res = await fetch(`${apiRecons}/${reconstructionId}?month=${date}`, { method: 'DELETE', headers });
          const result = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(result.message || `Failed to delete (status ${res.status})`);
          }
          set(state => ({
            reconstructions: state.reconstructions.filter(rec => rec.reconstruction_id !== reconstructionId)
          }));
        } catch (err: any) {
          console.error('Error deleting reconstruction:', err);
        }
      },

      updateReconstructionContributions: (reconstructionId, contributions) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId ? { ...rec, contributions } : rec
          )
        }));
      },

      addGroup: async (reconstructionId, groupName) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const newGroup: Group = {
          group_id: `group-${Date.now()}`, name: groupName, model: null, status: 'success', contributions: [],
          aux: { name: [], avatar: [] }
        };
        const updatedRec: ReconstructionMetadata = { ...rec, groups: [...rec.groups, newGroup], status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },

      removeGroup: async (reconstructionId, groupId) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const updatedRec: ReconstructionMetadata = { ...rec, groups: rec.groups.filter(g => g.group_id !== groupId), status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },

      addContributionsToGroup: async (reconstructionId, groupId, contributions) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const userCache = useUserStore.getState().users;
        const updatedGroups = rec.groups.map(g => {
          if (g.group_id === groupId) {
            const merged = [...g.contributions, ...contributions.filter(c => !g.contributions.some(x => x.contribution_id === c.contribution_id))];
            return { ...g, contributions: merged, aux: generateAuxData(merged, userCache) };
          }
          const filtered = g.contributions.filter(c => !contributions.some(x => x.contribution_id === c.contribution_id));
          return { ...g, contributions: filtered, aux: generateAuxData(filtered, userCache) };
        });
        const updatedRec: ReconstructionMetadata = { ...rec, groups: updatedGroups, status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },

      updateGroupName: async (reconstructionId, groupId, newName) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const updatedRec: ReconstructionMetadata = { ...rec, groups: rec.groups.map(g => g.group_id === groupId ? { ...g, name: newName } : g), status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },

      setGroups: async (reconstructionId, groups) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const updatedRec: ReconstructionMetadata = { ...rec, groups, status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },

      addGroupWithContributions: async (reconstructionId, groupId, groupName, contributions) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const userCache = useUserStore.getState().users;
        const newGroup: Group = { 
          group_id: groupId, 
          name: groupName, 
          contributions, 
          model: null, 
          status: 'success',
          aux: generateAuxData(contributions, userCache)
        };
        const updatedRec: ReconstructionMetadata = { ...rec, groups: [...rec.groups, newGroup], status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },
    
      mergeGroups: async (reconstructionId, groupIds, newGroupName, selectedModel) => { // <-- PERUBAHAN DI SINI
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const userCache = useUserStore.getState().users;
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
          group_id: `group-${Date.now()}`, 
          name: newGroupName, 
          contributions: contributionsToMerge, 
          model: selectedModel, // <-- PERUBAHAN DI SINI
          status: 'success',
          aux: generateAuxData(contributionsToMerge, userCache)
        };
        const updatedRec: ReconstructionMetadata = { ...rec, groups: [...groupsToKeep, newGroup], status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },
    
      removeContributionsFromGroup: async (reconstructionId, groupId, contributions) => {
        const rec = get().reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (!rec) throw new Error('Reconstruction not found');
        const userCache = useUserStore.getState().users;
        const updatedGroups = rec.groups.map(g => {
          if (g.group_id !== groupId) return g;
          const filtered = g.contributions.filter(c => !contributions.some(cont => cont.contribution_id === c.contribution_id));
          return { ...g, contributions: filtered, aux: generateAuxData(filtered, userCache) };
        });
        const updatedRec: ReconstructionMetadata = { ...rec, groups: updatedGroups, status: 'created' };
        set(s => ({
          reconstructions: s.reconstructions.map(r => r.reconstruction_id === reconstructionId ? updatedRec : r)
        }));
        return syncRecToApi(updatedRec);
      },

      setReconstructionConfig: (reconstructionId, config) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId ? { ...rec, configuration: config } : rec
          )
        }));
      },

      updateStatus: (reconstructionId, status) => {
        set(state => ({
          reconstructions: state.reconstructions.map(rec =>
            rec.reconstruction_id === reconstructionId ? { ...rec, status } : rec
          )
        }));
      },

    }),
    {
      name: 'reconstruction-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { configs, uploadStatuses, ...restOfState } = state;
        return {
          ...restOfState,
          reconstructions: restOfState.reconstructions.map(rec => {
            const { contributions, ...restOfRec } = rec;
            return restOfRec;
          })
        };
      }
    }
  )
);

export default useReconstructionStore;