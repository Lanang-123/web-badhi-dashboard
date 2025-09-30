// src/pages/GroupManagement.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import UUID
import {
  Card,
  Button,
  Typography,
  Input,
  Row,
  Col,
  Tag,
  Checkbox,
  Modal,
  Select,
  Empty,
  Spin,
  Popover,
  Divider,
  Progress,
  message,
  notification,
  Upload,
  UploadProps,
  UploadFile,
  Tooltip,
  List as AntdList,
  Avatar
} from 'antd';
import {
  PlusOutlined,
  DragOutlined,
  FolderOutlined,
  UserOutlined,
  MergeCellsOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  LinkOutlined,
  DisconnectOutlined,
  UploadOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import useReconstructionStore, { Group } from '../../store/useReconstructionStore';
import useUserStore from '../../store/useUserStore';
import styles from './GroupManagement.module.css';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Dayjs } from 'dayjs';

import 'antd/dist/reset.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface GroupManagementProps {
  reconstructionId: string;
  filterDate: Dayjs | null;
  onBack: () => void;
  onGoToConfiguration: () => void;
  reconstructionStatus: string | undefined;
}

interface Contribution {
  contribution_id: number;
  contribution_name: string;
  temple_name: string;
  temple_description?: string;
  share_link: string;
  privacy_setting: string;
  category?: string;
  temple_id?: number;
  groupName?: string;
  user_id: number;
}

interface FilterState {
  category: string[];
  privacy: string[];
  temple: string[];
  search: string;
}

interface AutoSizerParams {
  height: number;
  width: number;
}

interface FileUploadState {
  model_files?: UploadFile[];
  log?: UploadFile;
  eval?: UploadFile;
  nerfstudio_data?: UploadFile;
  nerfstudio_model?: UploadFile;
}

interface MergeableModelInfo {
  model: NonNullable<Group['model']>;
  groupName: string;
}

const CONTRIB_ITEM_HEIGHT = 100;

const ContribItem = React.memo(({
  c,
  selectedContribs,
  toggleSelectContrib,
  recon,
  reconstructionId,
  addContributionsToGroup,
  style,
  onViewDetail
}: {
  c: Contribution;
  selectedContribs: number[];
  toggleSelectContrib: (id: number) => void;
  recon: any;
  reconstructionId: string;
  addContributionsToGroup: (reconstructionId: string, groupId: string, contributions: Contribution[]) => void;
  style: React.CSSProperties;
  onViewDetail: (contribution: Contribution) => void;
}) => {
  const isGrouped = !!c.groupName;

  return (
    <div
      key={c.contribution_id}
      className={styles.contribItem}
      draggable={!isGrouped}
      onDragStart={e => {
        if (isGrouped) {
          e.preventDefault();
          return;
        }
        const data = { type: 'contribution', ids: [c.contribution_id] };
        e.dataTransfer.setData('application/json', JSON.stringify(data));
      }}
      style={{
        ...style,
        marginBottom: 8,
        padding: 12,
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        opacity: isGrouped ? 0.6 : 1,
        cursor: isGrouped ? 'not-allowed' : 'grab'
      }}
    >
      <Checkbox
        disabled={isGrouped}
        checked={selectedContribs.includes(c.contribution_id)}
        onChange={() => toggleSelectContrib(c.contribution_id)}
        style={{ marginRight: 12 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong ellipsis={{ tooltip: c.contribution_name }} style={{ fontSize: 14 }}>
          {c.contribution_name}
        </Text>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {isGrouped && (
            <Tag color="cyan" style={{ margin: 0 }}>
              In Group: {c.groupName}
            </Tag>
          )}
          <Tag color="purple" style={{ margin: 0 }}>
            ID: {c.contribution_id}
          </Tag>
          <Tag color="blue" style={{ margin: 0 }}>
            Area: {c.category || 'N/A'}
          </Tag>
          <Tag color={c.privacy_setting === 'public' ? 'green' : 'red'} style={{ margin: 0 }}>
            {c.privacy_setting}
          </Tag>
          {c.temple_name && (
            <Tag color="orange" style={{ margin: 0 }}>
              Temple: {c.temple_name}
            </Tag>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Select
          size="small"
          placeholder={isGrouped ? "Already Grouped" : "Choose Group"}
          style={{ width: 140 }}
          disabled={isGrouped}
          onChange={(groupId) => {
            if (groupId) {
              const item = recon?.contributions.find((cont: Contribution) => cont.contribution_id === c.contribution_id);
              if (item) {
                try {
                  addContributionsToGroup(reconstructionId, groupId, [item]);
                  message.success(`Contribution moved to group`);
                } catch (error) {
                  message.error('Failed to move contribution: ' + (error as Error).message);
                }
              }
            }
          }}
        >
          {recon?.groups.map((g: Group) => (
            <Option key={g.group_id} value={g.group_id}>
              {g.name}
            </Option>
          ))}
        </Select>
        <Button
          size="small"
          onClick={() => onViewDetail(c)}
          style={{ marginLeft: 4, color: 'grey' }}
        >
          View <EyeOutlined />
        </Button>
      </div>
    </div>
  );
});

const GroupItem = React.memo(({ g, selectedGroups, toggleSelectGroup, editingGroup, tempGroupName, setTempGroupName, saveEditing, startEditing, handleDeleteGroup, handleRemoveContribution, handleDrop, style, onUploadModel, reconstructionStatus, uploadStatus }: any) => {
  const inputRef = useRef<any>(null);
  const isEditing = editingGroup?.id === g.group_id;
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const users = useUserStore(state => state.users);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const closeModalDetail = useCallback(() => {
    setIsModalVisible(false);
  },[]);
  
  const isUploading = uploadStatus?.status === 'uploading';

  return (
    <div
      style={{
        ...style,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        position: 'relative',
        border: selectedGroups.includes(g.group_id) ? '2px solid #1890ff' : '1px solid #e0e0e0',
        backgroundColor: selectedGroups.includes(g.group_id) ? '#e6f7ff' : '#fff',
        opacity: isUploading ? 0.7 : 1,
      }}
      data-group-id={g.group_id}
      onClick={(e) => {
        if (isUploading || e.target instanceof HTMLInputElement) return;
        setIsModalVisible(true);
      }}
      onDrop={e => {
        if (isUploading) return;
        e.preventDefault();
        handleDrop(e, g.group_id);
        e.currentTarget.closest('[data-group-id]')?.removeAttribute('data-drag-over');
      }}
      onDragOver={e => {
        if (isUploading) return;
        e.preventDefault();
        e.currentTarget.closest('[data-group-id]')?.setAttribute('data-drag-over', 'true');
      }}
      onDragLeave={e => {
        e.currentTarget.closest('[data-group-id]')?.removeAttribute('data-drag-over');
      }}
    >
      <Checkbox
        checked={selectedGroups.includes(g.group_id)}
        disabled={isUploading}
        onChange={(e) => {
          e.stopPropagation();
          toggleSelectGroup(g.group_id);
        }}
        style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
      />
      <FolderOutlined style={{ fontSize: 48, color: '#1890ff' }} />
      <Text
        strong
        ellipsis={{ tooltip: g.name }}
        style={{ marginTop: 8, textAlign: 'center', maxWidth: '100%' }}
      >
        {g.name}
      </Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {g.contributions.length} items
      </Text>
      {uploadStatus ? (
        <div style={{ marginTop: 4, width: '90%' }}>
          {uploadStatus.status === 'uploading' && <Progress percent={uploadStatus.progress} size="small" />}
          {uploadStatus.status === 'success' && <Tag icon={<CheckCircleOutlined />} color="success">Berhasil</Tag>}
          {uploadStatus.status === 'error' && <Tag icon={<CloseCircleOutlined />} color="error">Gagal</Tag>}
        </div>
      ) : (
        <Tag
          color={g.status === 'success' ? 'green' : g.status === 'failed' ? 'red' : 'orange'}
          style={{ marginTop: 4 }}
        >
          {g.status}
        </Tag>
      )}

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isEditing ? (
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                <Input
                  ref={inputRef}
                  value={tempGroupName}
                  onChange={e => setTempGroupName(e.target.value)}
                  placeholder="Group name"
                  style={{ flex: 1 }}
                  onPressEnter={saveEditing}
                  onBlur={saveEditing}
                />
              </div>
            ) : (
              <div
                style={{ flex: 1, cursor: 'pointer', padding: '4px 8px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(g.group_id, g.name);
                }}
              >
                <Text ellipsis={{ tooltip: g.name }}>{g.name}</Text>
              </div>
            )}
          </div>
        }
        open={isModalVisible}
        onCancel={e => {
          e.stopPropagation();
          closeModalDetail();
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Divider orientation="left" dashed>Contributions ({g.contributions.length})</Divider>
          <div style={{ maxHeight: 400, overflowY: 'auto', padding: 8 }}>
            {g.contributions.length > 0 ? (
              <AntdList
                itemLayout="horizontal"
                dataSource={g.contributions}
                renderItem={(item: Contribution) => {
                  const userDetail = users[item.user_id];
                  return (
                    <AntdList.Item
                      actions={[
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveContribution(g.group_id, item.contribution_id)}
                        />
                      ]}
                    >
                      <AntdList.Item.Meta
                        avatar={<Avatar src={`${userDetail?.avatar}/preview`} icon={<UserOutlined />} />}
                        title={<Text strong ellipsis={{ tooltip: item.contribution_name }}>{item.contribution_name}</Text>}
                        description={
                          <>
                            <Tag color="purple">ID: {item.contribution_id}</Tag>
                            <Text type="secondary" style={{ marginRight: 8 }}>Contributor: {userDetail?.name || 'Loading...'}</Text>
                          </>
                        }
                      />
                    </AntdList.Item>
                  );
                }}
              />
            ) : (
              <Text type="secondary">Drag contributions here</Text>
            )}
          </div>
          <Divider dashed style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">{g.contributions.length} contributions</Text>
            <Tag color={g.status === 'success' ? 'green' : g.status === 'failed' ? 'red' : 'orange'}>
              Status: {g.status}
            </Tag>
          </div>
          <Tooltip
            placement="topLeft"
            overlayStyle={{ maxWidth: 450 }}
            overlayInnerStyle={{
              padding: 12,
              backgroundColor: '#ffffff',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: 12,
              lineHeight: 1.4,
              color: '#003a8c',
            }}
            title={
              g.model
                ? (<pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#772d2f' }}>
                    {typeof g.model === 'object' ? JSON.stringify(g.model, null, 2) : g.model}
                   </pre>)
                : '—'
            }
          >
            <div style={{ marginTop: 8, background: '#f0f0f0', padding: 8, borderRadius: 4, cursor: g.model ? 'pointer' : 'default', opacity: g.model ? 1 : 0.6 }}>
              <Text type="secondary" style={{ display: 'block' }}>Model:</Text>
              <Text ellipsis style={{ fontSize: 12 }}>
                {g.model ? (typeof g.model === 'object' ? `Object (${Object.keys(g.model).length} keys)` : g.model) : '-'}
              </Text>
            </div>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={(e) => { e.stopPropagation(); closeModalDetail(); onUploadModel(g.group_id); }}
              disabled={reconstructionStatus !== 'ready' || isUploading}
              title={isUploading ? "Proses unggah untuk grup ini sedang berlangsung" : ""}
            >
              {isUploading ? "Uploading..." : "Upload Model"}
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); closeModalDetail(); handleDeleteGroup(g.group_id, g.name); }} >
              Delete Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

const GroupManagement: React.FC<GroupManagementProps> = ({
  reconstructionId, onBack, onGoToConfiguration, reconstructionStatus
}) => {
  const recon = useReconstructionStore(state => state.reconstructions.find(r => r.reconstruction_id === reconstructionId));
  const uploadStatuses = useReconstructionStore(state => state.uploadStatuses);
  const uploadGroupModel = useReconstructionStore(state => state.uploadGroupModel);
  const users = useUserStore(state => state.users);
  const fetchUsersByIds = useUserStore(state => state.fetchUsersByIds);

  const apiUrl = import.meta.env.VITE_API_URL as string;
  const storeRef = useRef(useReconstructionStore.getState());

  useEffect(() => {
    const unsubscribe = useReconstructionStore.subscribe(state => storeRef.current = state);
    return () => unsubscribe();
  }, []);

  const [newGroupName, setNewGroupName] = useState('');
  const [selectedContribs, setSelectedContribs] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergedGroupName, setMergedGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setIsDraggingOverGroups] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{id: string; name: string} | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');
  const [contribFilters, setContribFilters] = useState<FilterState>({ category: [], privacy: [], search: '', temple: [] });
  const [groupFilters, setGroupFilters] = useState({ search: '' });
  const [bulkMoveVisible, setBulkMoveVisible] = useState(false);
  const [targetGroup, setTargetGroup] = useState<string | null>(null);
  const [viewingContribution, setViewingContribution] = useState<Contribution | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ groupId: string; groupName: string } | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileUploadState>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const [mergeableModels, setMergeableModels] = useState<MergeableModelInfo[]>([]);
  const [selectedModelForMerge, setSelectedModelForMerge] = useState<Group['model'] | null>(null);

  const temple_ids = recon?.temple_ids;

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!temple_ids || temple_ids.length === 0) {
        storeRef.current.updateReconstructionContributions(reconstructionId, []);
        setLoading(false);
        return;
      }
      setLoading(true);
      let token: string | null = null;
      try {
        const authRaw = localStorage.getItem('auth-storage');
        if (authRaw) token = JSON.parse(authRaw).state?.token ?? null;
      } catch (error) { console.error("Gagal parse auth-storage", error); }
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      try {
        const allContributions: any[] = [];
        const fetchPromises = temple_ids.map(async (templeId) => {
          let page = 1;
          let hasNextPage = true;
          const templeContributions: any[] = [];
          while (hasNextPage) {
            const url = `${apiUrl}/private/contributions/list/${templeId}?page=${page}`;
            const res = await fetch(url, { headers });
            if (!res.ok) { hasNextPage = false; continue; }
            const data = await res.json();
            if (data.datas && Array.isArray(data.datas)) {
              templeContributions.push(...data.datas);
            }
            hasNextPage = data.is_next === true;
            page++;
          }
          return templeContributions;
        });
        const results = await Promise.all(fetchPromises);
        results.forEach(contribs => allContributions.push(...contribs));
        
        const mappedContributions = allContributions.map((c: any) => ({
          contribution_id: c.tx_contribution_id,
          contribution_name: c.name,
          temple_name: c.temple_name || `Temple ${c.md_temples_id}`,
          share_link: c.file_path,
          privacy_setting: c.license_type === 1 ? 'public' : 'private',
          category: c.level_area || 'other',
          temple_id: c.md_temples_id,
          user_id: c.user_id,
        }));

        storeRef.current.updateReconstructionContributions(reconstructionId, mappedContributions);
        
        const currentRecon = storeRef.current.reconstructions.find(r => r.reconstruction_id === reconstructionId);
        if (currentRecon && currentRecon.groups) {
          const fullContributionsMap = new Map(mappedContributions.map(c => [c.contribution_id, c]));
          const enrichedGroups = currentRecon.groups.map(group => {
            const enrichedContributions = group.contributions.map(incompleteContrib => {
              const fullContribData = fullContributionsMap.get(incompleteContrib.contribution_id);
              return fullContribData ? { ...incompleteContrib, ...fullContribData } : incompleteContrib;
            });
            return { ...group, contributions: enrichedContributions };
          });
          storeRef.current.setGroups(reconstructionId, enrichedGroups);
        }

        if (mappedContributions.length > 0) {
          const uniqueUserIds = [...new Set(mappedContributions.map(c => c.user_id))];
          await fetchUsersByIds(uniqueUserIds);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui";
        message.error('Gagal memuat data kontribusi: ' + errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [reconstructionId, apiUrl, temple_ids, fetchUsersByIds]);
  
  const handleDropOnGroupsArea = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverGroups(false);
    if (!recon) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as any;
      if (data.type === 'contribution') {
        const targetElement = e.target as HTMLElement;
        const groupCard = targetElement.closest('[data-group-id]');
        if (groupCard) return;
        const items = recon.contributions.filter(c => (data.ids as number[]).includes(c.contribution_id));
        if (items.length === 0) return;
        const newGroupName = `Group ${recon.groups.length + 1}`;
        const newGroupId = `group-${Date.now()}`;
        try {
          storeRef.current.addGroupWithContributions(reconstructionId, newGroupId, newGroupName, items);
          message.success(`Created new group "${newGroupName}" with ${items.length} contributions`);
        } catch (error) {
          message.error('Failed to create group: ' + (error as Error).message);
        }
      }
    } catch (err) { console.error('Failed to parse drag data:', err); }
  }, [recon, reconstructionId]);

  useEffect(() => {
    setSelectedGroups([]);
    setContribFilters({ category: [], privacy: [], search: '', temple: [] });
    setGroupFilters({ search: '' });
    setEditingGroup(null);
  }, [reconstructionId]);

  const filteredContributions = useMemo(() => {
    if (!recon) return [];
    const groupedContribMap = new Map<number, string>();
    (recon.groups || []).forEach(group => {
      (group.contributions || []).forEach(c => {
        groupedContribMap.set(c.contribution_id, group.name);
      });
    });
    return (recon.contributions || []).map(c => ({ ...c, groupName: groupedContribMap.get(c.contribution_id) }))
      .filter(c => {
        if (contribFilters.category.length > 0 && (!c.category || !contribFilters.category.includes(c.category))) return false;
        if (contribFilters.temple.length > 0 && (!c.temple_name || !contribFilters.temple.includes(c.temple_name))) return false;
        if (contribFilters.privacy.length > 0 && !contribFilters.privacy.includes(c.privacy_setting)) return false;
        if (contribFilters.search && !c.contribution_name.toLowerCase().includes(contribFilters.search.toLowerCase()) && !c.category?.toLowerCase().includes(contribFilters.search.toLowerCase()) && !c.privacy_setting.toLowerCase().includes(contribFilters.search.toLowerCase())) return false;
        return true;
      });
  }, [recon, contribFilters]);

  const filteredGroups = useMemo(() => {
    if (!recon) return [];
    return recon.groups.filter(g => groupFilters.search ? g.name.toLowerCase().includes(groupFilters.search.toLowerCase()) : true);
  }, [recon, groupFilters]);

  const categories = useMemo(() => {
    if (!recon) return [];
    return Array.from(new Set(recon.contributions.map(c => c.category).filter(Boolean))) as string[];
  }, [recon]);

  const privacySettings = useMemo(() => {
    if (!recon) return [];
    return Array.from(new Set(recon.contributions.map(c => c.privacy_setting)));
  }, [recon]);
  
  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    try {
      storeRef.current.addGroup(reconstructionId, newGroupName.trim());
      setNewGroupName('');
      message.success(`Group "${newGroupName.trim()}" created`);
    } catch (error) {
      message.error('Failed to create group: ' + (error as Error).message);
    }
  }, [newGroupName, reconstructionId]);

  const handleDragStart = useCallback((e: React.DragEvent, type: 'contribution' | 'group', ids: number[] | string[]) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, ids }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (!recon) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as any;
      if (data.type === 'contribution') {
        const items = recon.contributions.filter(c => (data.ids as number[]).includes(c.contribution_id));
        if (!items.length) return;
        try {
          storeRef.current.addContributionsToGroup(reconstructionId, groupId, items);
          message.success(`${items.length} contributions moved to group`);
        } catch (error) {
          message.error('Failed to move contributions: ' + (error as Error).message);
        }
      }
    } catch (err) { console.error('Failed to parse drag data:', err); }
  }, [recon, reconstructionId]);

  const toggleSelectContrib = useCallback((id: number) => {
    setSelectedContribs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);
  
  const toggleSelectGroup = useCallback((groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  }, []);

  const selectAllContribs = useCallback(() => {
    const unGroupedContributions = filteredContributions.filter(c => !c.groupName);
    if (unGroupedContributions.length > 0 && unGroupedContributions.length === selectedContribs.length) {
      setSelectedContribs([]);
    } else {
      setSelectedContribs(unGroupedContributions.map(c => c.contribution_id));
    }
  }, [filteredContributions, selectedContribs]);

  const selectAllGroups = useCallback(() => {
    if (filteredGroups.length === selectedGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(g => g.group_id));
    }
  }, [filteredGroups, selectedGroups]);

  const handleMergeGroups = useCallback(() => {
    if (selectedGroups.length < 2) {
      message.warning('Please select at least 2 groups to merge');
      return;
    }

    const selectedGroupDetails = selectedGroups
      .map(id => recon?.groups.find(g => g.group_id === id))
      .filter((g): g is Group => !!g);

    const groupNames = selectedGroupDetails.map(g => g.name);
    setMergedGroupName(`Merged: ${groupNames.join(' + ')}`);

    const models: MergeableModelInfo[] = selectedGroupDetails
      .filter(g => g.model)
      .map(g => ({
        model: g.model!,
        groupName: g.name,
      }));
    
    setMergeableModels(models);

    if (models.length === 1) {
      setSelectedModelForMerge(models[0].model);
    } else {
      setSelectedModelForMerge(null);
    }

    setMergeModalVisible(true);
  }, [selectedGroups, recon]);

  const confirmMergeGroups = useCallback(() => {
    if (!recon || selectedGroups.length < 2) return;
    
    if (mergeableModels.length > 1 && !selectedModelForMerge) {
      message.error("Please select a model to use for the merged group.");
      return;
    }

    const newGroupName = mergedGroupName.trim() || 'Merged Group';
    try {
      storeRef.current.mergeGroups(reconstructionId, selectedGroups, newGroupName, selectedModelForMerge);
      message.success(`Merged ${selectedGroups.length} groups into "${newGroupName}"`);
      
      setSelectedGroups([]);
      setMergeModalVisible(false);
      setMergedGroupName('');
      setMergeableModels([]);
      setSelectedModelForMerge(null);
    } catch (error) {
      message.error('Failed to merge groups: ' + (error as Error).message);
    }
  }, [recon, selectedGroups, mergedGroupName, reconstructionId, mergeableModels, selectedModelForMerge]);

  const moveSelectedContribs = useCallback(() => {
    if (!targetGroup || selectedContribs.length === 0) {
      message.warning('Please select a target group and at least one contribution');
      return;
    }
    const items = recon?.contributions.filter(c => selectedContribs.includes(c.contribution_id)) || [];
    if (items.length) {
      try {
        storeRef.current.addContributionsToGroup(reconstructionId, targetGroup, items);
        message.success(`${items.length} contributions moved to group`);
        setSelectedContribs([]);
        setBulkMoveVisible(false);
      } catch (error) {
        message.error('Failed to move contributions: ' + (error as Error).message);
      }
    }
  }, [targetGroup, selectedContribs, recon, reconstructionId]);
  
  const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
    setGroupToDelete({ groupId, groupName });
    setDeleteModalVisible(true);
  }, []);

  const confirmDeleteGroup = useCallback(() => {
    if (!groupToDelete) return;
    try {
      storeRef.current.removeGroup(reconstructionId, groupToDelete.groupId);
      message.success(`Group "${groupToDelete.groupName}" deleted`);
      setDeleteModalVisible(false);
      setGroupToDelete(null);
    } catch (error) {
      message.error('Failed to delete group: ' + (error as Error).message);
    }
  }, [groupToDelete, reconstructionId]);

  const handleRemoveContribution = useCallback((groupId: string, contributionId: number) => {
    if (!recon) return;
    const group = recon.groups.find(g => g.group_id === groupId);
    if (!group) return;
    const contribution = group.contributions.find(c => c.contribution_id === contributionId);
    if (!contribution) return;
    try {
      storeRef.current.removeContributionsFromGroup(reconstructionId, groupId, [contribution]);
      message.success('Contribution removed from group');
    } catch (error) {
      message.error('Failed to remove contribution: ' + (error as Error).message);
    }
  }, [recon, reconstructionId]);

  const startEditing = useCallback((groupId: string, groupName: string) => {
    setEditingGroup({ id: groupId, name: groupName });
    setTempGroupName(groupName);
  }, []);

  const saveEditing = useCallback(() => {
    if (!editingGroup || !tempGroupName.trim()) return;
    try {
      storeRef.current.updateGroupName(reconstructionId, editingGroup.id, tempGroupName.trim());
      setEditingGroup(null);
      message.success(`Group renamed to "${tempGroupName.trim()}"`);
    } catch (error) {
      message.error('Failed to rename group: ' + (error as Error).message);
    }
  }, [editingGroup, tempGroupName, reconstructionId]);

  const initializeOneToOne = useCallback(() => {
    if (!recon) return;
    setLoading(true);
    setTimeout(() => {
      try {
        const { removeGroup, addGroupWithContributions } = storeRef.current;
        recon.groups.filter(g => g.name.startsWith('Group ')).forEach(g => {
          try { removeGroup(reconstructionId, g.group_id); } catch (error) { console.error('Failed to remove group:', error); }
        });
        recon.contributions.forEach((contrib) => {
          if (contrib.groupName) return;
          const groupName = `Group ${contrib.contribution_id}`;
          const groupId = `group-${reconstructionId}-${contrib.contribution_id}`;
          try { addGroupWithContributions(reconstructionId, groupId, groupName, [contrib]); } catch (error) { console.error('Failed to add group:', error); }
        });
        message.success('Groups initialized 1:1 successfully');
      } catch (error) { message.error('Initialization failed: ' + (error as Error).message); } finally { setLoading(false); }
    }, 500);
  }, [recon, reconstructionId]);

  const initializeByArea = useCallback(() => {
    if (!recon) return;
    setLoading(true);
    setTimeout(() => {
      try {
        const { removeGroup, addGroupWithContributions } = storeRef.current;
        const areaGroups = recon.groups.filter(g => g.name.startsWith('Area:'));
        areaGroups.forEach(group => {
          try { removeGroup(reconstructionId, group.group_id); } catch (error) { console.error('Failed to remove area group:', error); }
        });
        const uniqueAreas = Array.from(new Set(recon.contributions.map(c => c.category).filter((area): area is string => !!area)));
        uniqueAreas.forEach(area => {
          const groupName = `Area: ${area}`;
          const groupId = `area-group-${reconstructionId}-${area}`;
          const areaContributions = recon.contributions.filter(c => c.category === area && !c.groupName);
          if (areaContributions.length > 0) {
            try { addGroupWithContributions(reconstructionId, groupId, groupName, areaContributions); } catch (error) { console.error('Failed to add area group:', error); }
          }
        });
        message.success('Groups initialized by area successfully');
      } catch (error) { message.error('Area initialization failed: ' + (error as Error).message); } finally { setLoading(false); }
    }, 500);
  }, [recon, reconstructionId]);

  const temples = useMemo(() => {
      if (!recon) return [];
      return Array.from(new Set(recon.contributions.map(c => c.temple_name).filter((temple): temple is string => !!temple)));
    }, [recon]);

  const renderMediaContent = (contribution: Contribution) => {
    if (!contribution.share_link) return <Text type="secondary">No media available</Text>;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    const isVideo = videoExtensions.some(ext => contribution.share_link.toLowerCase().endsWith(ext));
    if (isVideo) return <video controls style={{ width: '100%', maxHeight: '400px' }}><source src={contribution.share_link} />Your browser does not support the video tag.</video>;
    if (contribution.share_link) return <iframe title="media-content" width="100%" height="315" src={`${contribution.share_link}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ borderRadius: '8px' }}></iframe>;
    return <Button type="primary" href={contribution.share_link} target="_blank" rel="noopener noreferrer">View Content</Button>;
  };

  const handleOpenUploadModal = (groupId: string) => {
    setCurrentGroupId(groupId);
    setUploadModalVisible(true);
    setFiles({});
  };
  
  const handleCancelAndAbortUpload = () => {
    abortControllerRef.current?.abort();
    setUploadModalVisible(false);
  };

  const handleDismissToBackground = () => {
    setUploadModalVisible(false);
  };

  const handleUploadFiles = async () => {
    abortControllerRef.current = new AbortController();
    const dateParam = new Date().toISOString().slice(0, 7).replace('-', '');
    const newModelId = uuidv4(); // Generate UUID here

    try {
      if (!recon || !currentGroupId) throw new Error('Data rekonstruksi atau grup tidak ditemukan');
      const success = await uploadGroupModel(recon.reconstruction_id, currentGroupId, newModelId, files, dateParam, abortControllerRef.current.signal);
      if (success) {
        notification.success({ message: 'Unggah Berhasil', description: `Model dengan ID "${newModelId}" telah berhasil diunggah.` });
        setUploadModalVisible(false);
      }
    } catch (err: any) {
      if (err.message === 'CanceledError') {
        message.warning('Proses unggah telah dibatalkan.');
      } else {
        notification.error({ message: 'Unggah Gagal', description: err.message || 'Terjadi kesalahan saat mengunggah file.' });
      }
    }
  };

  const uploadProps: UploadProps = { beforeUpload: () => false, showUploadList: true };

  const isUploading = currentGroupId ? uploadStatuses[currentGroupId!]?.status === 'uploading' : false;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '20px' }}><Spin size="large" /><Text>Loading...</Text></div>;
  if (!recon) return <div style={{ padding: 40, textAlign: 'center' }}><Empty description="Reconstruction data not found. Please go back and try again." /><Button onClick={onBack} style={{ marginTop: 16 }}>Go Back</Button></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3} style={{ margin: 0 }}>Group Management</Title>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button type="primary" onClick={onGoToConfiguration} disabled={!recon.groups.length} style={{ backgroundColor: "#772d2f", marginBottom: '15px' }}>
            Next: Configuration
          </Button>
        </div>
      </div>
      <Card className={styles.newGroupCard} style={{ marginBottom: 16 }} bodyStyle={{ display: 'flex', gap: 8 }}>
        <Input placeholder="New Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} style={{ flex: 1 }} />
        <Button icon={<PlusOutlined />} onClick={handleCreateGroup} type="primary" disabled={!newGroupName.trim()}>
          Create Group
        </Button>
      </Card>
      <Row gutter={24} style={{ height: 'calc(110vh - 100px)', marginTop: 32, marginBottom: 30,overflow:'auto' }}>
        <Col span={14}>
           <div style={{ display: 'flex', gap: 8 }}>
            <Search placeholder="Search contributions..." allowClear enterButton={<SearchOutlined />} size="middle" style={{ width: 270, marginRight: 8, marginBottom: 12 }}
              value={contribFilters.search}
              onChange={e => setContribFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Popover placement="bottomRight" title="Filter Contributions" content={
                <div style={{ minWidth: 250 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Temple</Text>
                    <Select mode="multiple" style={{ width: '100%' }} placeholder="Select temples" value={contribFilters.temple} onChange={value => setContribFilters(prev => ({ ...prev, temple: value }))} options={temples.map(t => ({ value: t, label: t }))} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Area</Text>
                    <Select mode="multiple" style={{ width: '100%' }} placeholder="Select area" value={contribFilters.category} onChange={value => setContribFilters(prev => ({ ...prev, category: value }))} options={categories.map(c => ({ value: c, label: c }))} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Privacy</Text>
                    <Select mode="multiple" style={{ width: '100%' }} placeholder="Select privacy settings" value={contribFilters.privacy} onChange={value => setContribFilters(prev => ({ ...prev, privacy: value }))} options={privacySettings.map(p => ({ value: p, label: p }))} />
                  </div>
                  <Button type="primary" block onClick={() => setContribFilters({ category: [], privacy: [], search: '', temple: [] })}> Clear Filters </Button>
                </div>
              } trigger="click"
            >
              <Button icon={<FilterOutlined />}>Filters</Button>
            </Popover>
          </div>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Contributions ({filteredContributions.length})</span>
                <div>
                  <Checkbox
                    indeterminate={selectedContribs.length > 0 && selectedContribs.length < filteredContributions.filter(c => !c.groupName).length}
                    checked={selectedContribs.length > 0 && selectedContribs.length === filteredContributions.filter(c => !c.groupName).length && filteredContributions.filter(c => !c.groupName).length > 0}
                    onChange={selectAllContribs} style={{ marginRight: 8 }}
                  > Select All Staged </Checkbox>
                  <Button type="dashed" onDragStart={e => handleDragStart(e, 'contribution', selectedContribs)} draggable={selectedContribs.length > 0} disabled={selectedContribs.length === 0} icon={<DragOutlined />} style={{ marginRight: 8 }}> Drag Selected </Button>
                  <Button type="primary" icon={<ArrowDownOutlined />} disabled={selectedContribs.length === 0} onClick={() => setBulkMoveVisible(true)}> Move Selected </Button>
                </div>
              </div>
            }
            className={styles.card} style={{ height: '100%' }} bodyStyle={{ padding: 0, height: 'calc(100% - 60px)', overflow: 'hidden' }}
          >
            {filteredContributions.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No contributions found for this reconstruction" style={{ padding: 40 }} />
            ) : (
              <AutoSizer>
                {({ height, width }: AutoSizerParams) => (
                  <List height={height} itemCount={filteredContributions.length} itemSize={CONTRIB_ITEM_HEIGHT} width={width} itemKey={index => filteredContributions[index]?.contribution_id || index}>
                    {({ index, style }) => (
                      <ContribItem c={filteredContributions[index]} selectedContribs={selectedContribs} toggleSelectContrib={toggleSelectContrib} recon={recon} reconstructionId={reconstructionId} addContributionsToGroup={storeRef.current.addContributionsToGroup} style={style} onViewDetail={setViewingContribution} />
                    )}
                  </List>
                )}
              </AutoSizer>
            )}
          </Card>
        </Col>
        <Col span={10}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Search placeholder="Search groups..." allowClear enterButton={<SearchOutlined />} size="middle" style={{ width: 200 }} value={groupFilters.search} onChange={e => setGroupFilters(prev => ({ ...prev, search: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button icon={<UserOutlined />} onClick={initializeOneToOne} loading={loading}> 1:1 Groups </Button>
              <Button icon={<FolderOutlined />} onClick={initializeByArea} loading={loading}> By Area </Button>
            </div>
          </div>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Groups ({filteredGroups.length})</span>
                <div>
                  <Checkbox indeterminate={selectedGroups.length > 0 && selectedGroups.length < filteredGroups.length} checked={selectedGroups.length > 0 && selectedGroups.length === filteredGroups.length} onChange={selectAllGroups} style={{ marginRight: 8 }}> Select All </Checkbox>
                  <Button icon={<MergeCellsOutlined />} onClick={handleMergeGroups} type="primary" disabled={selectedGroups.length < 2}> Merge Groups </Button>
                </div>
              </div>
            }
            className={styles.card} style={{ height: '100%' }} bodyStyle={{ padding:0, height: 'calc(100% - 60px)', overflow: 'auto' }}
            onDrop={handleDropOnGroupsArea} onDragOver={(e) => { e.preventDefault(); setIsDraggingOverGroups(true); }} onDragLeave={() => setIsDraggingOverGroups(false)}
          >
            {filteredGroups.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No groups found" style={{ padding: 40 }} />
            ) : (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', padding: '16px' }}>
                {filteredGroups.map((g) => (
                  <GroupItem key={g.group_id} g={g} selectedGroups={selectedGroups} toggleSelectGroup={toggleSelectGroup} editingGroup={editingGroup} tempGroupName={tempGroupName} setTempGroupName={setTempGroupName} saveEditing={saveEditing} startEditing={startEditing} handleDeleteGroup={handleDeleteGroup} handleRemoveContribution={handleRemoveContribution} setViewingGroup={()=>{}} reconstructionId={reconstructionId} handleDrop={handleDrop} onUploadModel={handleOpenUploadModal} reconstructionStatus={reconstructionStatus} recon={recon} uploadStatus={uploadStatuses[g.group_id]}
                    style={{ height: '150px', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', padding: '16px', backgroundColor: '#fff', transition: 'all 0.3s', cursor: 'pointer', overflow: 'hidden' }}
                  />
                ))}
               </div>
            )}
          </Card>
        </Col>
      </Row>
      <Modal
        title={ <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}> <UploadOutlined style={{ fontSize: 20, color: '#772d2f', flexShrink: 0 }} /> <Text style={{ fontSize: 'clamp(16px, 2vw, 18px)', fontWeight: 600, color: '#772d2f' }}> Upload Model Files for Group </Text> </div> }
        open={uploadModalVisible} onCancel={handleCancelAndAbortUpload} closable={false} maskClosable={false} width="50vw" style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 'clamp(16px, 3vw, 32px)', background: 'linear-gradient(135deg, #fffafa, #f2e8e9)', borderRadius: 12 }}
        footer={[ <Button key="cancel" onClick={handleCancelAndAbortUpload}> Batal & Hentikan </Button>, <Button key="dismiss" onClick={handleDismissToBackground}> Sembunyikan </Button>, <Button key="submit" type="primary" loading={isUploading} onClick={handleUploadFiles} disabled={isUploading} style={{ backgroundColor: '#772d2f', borderColor: '#772d2f' }}> {isUploading ? 'Sedang Mengunggah...' : 'Unggah'} </Button>, ]}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'stretch' }}>
          <div style={{ gridColumn: '1 / -1', backgroundColor: '#f9e8e9', padding: 16, borderRadius: 8, boxShadow: '0 2px 6px rgba(119, 45, 47, 0.15)' }}> <Text strong style={{ display: 'block', marginBottom: 8, color: '#772d2f' }}> Model Files (multiple) </Text> <Upload {...uploadProps} multiple fileList={files.model_files} disabled={isUploading} onChange={({ fileList }) => setFiles(prev => ({ ...prev, model_files: fileList }))} itemRender={(originNode, _file) => (<div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}> {originNode} </div>)} > <Button icon={<UploadOutlined />} type="primary" style={{ backgroundColor: '#772d2f', borderColor: '#772d2f' }} block disabled={isUploading}> Select Model Files </Button> </Upload> </div>
          {[ { key: 'log', title: 'Log File', color: '#a03e3f', bgColor: '#faecec' }, { key: 'eval', title: 'Eval File', color: '#8f3536', bgColor: '#fcebea' }, { key: 'nerfstudio_data', title: 'Nerfstudio Data', color: '#7d2e2f', bgColor: '#fcebea' }, { key: 'nerfstudio_model', title: 'Nerfstudio Model', color: '#6b292a', bgColor: '#fbeaea' } ].map(item => { const uploadKey = item.key as keyof FileUploadState; const fileValue = files[uploadKey]; const fileList = fileValue ? [fileValue] : []; return ( <div key={uploadKey} style={{ backgroundColor: item.bgColor, padding: 16, borderRadius: 8, boxShadow: '0 2px 6px rgba(119, 45, 47, 0.10)', minWidth: 0 }}> <Text strong style={{ display: 'block', marginBottom: 8, color: item.color, fontSize: 'clamp(14px, 1.5vw, 16px)' }}> {item.title} </Text> <Upload {...uploadProps} fileList={fileList as UploadFile[]} disabled={isUploading} onChange={({ fileList }) => { setFiles(prev => ({ ...prev, [uploadKey]: fileList.length > 0 ? fileList[0] : undefined })); }} itemRender={(originNode, _file) => ( <div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}> {originNode} </div>)} > <Button icon={<UploadOutlined />} style={{ color: '#772d2f', borderColor: '#dba3a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} block disabled={isUploading}> Select {uploadKey.replace('_', ' ')} </Button> </Upload> </div> ); })}
        </div>
        {isUploading && ( <div style={{ marginTop: 24 }}> <Text strong style={{ color: '#772d2f' }}>Proses unggah sedang berjalan...</Text> <Progress percent={uploadStatuses[currentGroupId!]?.progress ?? 0} strokeColor={{ from: '#a03e3f', to: '#772d2f' }} status="active" /> </div> )}
      </Modal>
      <Modal title="Delete Group" open={deleteModalVisible} onOk={confirmDeleteGroup} onCancel={() => { setDeleteModalVisible(false); setGroupToDelete(null); }} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }} > <Text>Are you sure you want to delete "</Text> <Text strong>{groupToDelete?.groupName || ''}</Text> <Text>"?</Text> </Modal>
      <Modal
        title="Merge Groups"
        open={mergeModalVisible}
        onOk={confirmMergeGroups}
        onCancel={() => setMergeModalVisible(false)}
        okText="Merge"
        cancelText="Cancel"
        width={600}
        okButtonProps={{
          disabled: mergeableModels.length > 1 && !selectedModelForMerge
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Selected Groups:</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
            {selectedGroups.map(groupId => {
              const group = recon?.groups.find(g => g.group_id === groupId);
              return group ? (
                <Tag key={groupId} color="blue" style={{ marginBottom: 4 }}> {group.name} ({group.contributions.length} items) </Tag>
              ) : null;
            })}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>New Group Name:</Text>
          <Input value={mergedGroupName} onChange={e => setMergedGroupName(e.target.value)} placeholder="Enter new group name" style={{ marginTop: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>Resulting Model:</Text>
          {mergeableModels.length > 1 ? (
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select a model to use"
              onChange={(value) => {
                setSelectedModelForMerge(mergeableModels[value].model);
              }}
            >
              {mergeableModels.map((info, index) => {
                let label = '';
                const modelId = (info.model && typeof info.model === 'object' && info.model.model_id) 
                                ? info.model.model_id 
                                : null;

                if (modelId) {
                  label = `Model ID: "${modelId}" (from: ${info.groupName})`;
                } else {
                  label = `Model (Not available model) - (from: ${info.groupName})`;
                }
                return (
                  <Option key={index} value={index}>
                    {label}
                  </Option>
                );
              })}
            </Select>
          ) : (
            <Input.TextArea
              readOnly
              style={{ marginTop: 8, cursor: 'default', backgroundColor: '#f5f5f5' }}
              value={
                selectedModelForMerge 
                  ? JSON.stringify(selectedModelForMerge, null, 2) 
                  : 'No model will be assigned to the new group.'
              }
              rows={4}
            />
          )}
        </div>
      </Modal>

      <Modal title="Move Selected Contributions" open={bulkMoveVisible} onOk={moveSelectedContribs} onCancel={() => setBulkMoveVisible(false)} okText="Move" cancelText="Cancel" okButtonProps={{ disabled: !targetGroup }} > <div style={{ marginBottom: 16 }}> <Text> You are about to move <Text strong>{selectedContribs.length}</Text> contributions </Text> </div> <div style={{ marginBottom: 16 }}> <Text strong>Target Group:</Text> <Select style={{ width: '100%', marginTop: 8 }} placeholder="Select a group" value={targetGroup} onChange={setTargetGroup} showSearch optionFilterProp="label"> {recon?.groups.map(g => ( <Option key={g.group_id} value={g.group_id} label={g.name}> {g.name} ({g.contributions.length} items) </Option> ))} </Select> </div> </Modal>
      {viewingContribution && ( <Modal title={`Contribution Details: ${viewingContribution.contribution_name}`} open={!!viewingContribution} onCancel={() => setViewingContribution(null)} footer={null} width={800} style={{ borderRadius: '16px', overflow: 'hidden', padding: 0 }} bodyStyle={{ padding: 0, background: '#ffffff', color: '#333' }} > <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)', background: '#ffffff' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}> <div> <Text style={{ display: 'block', fontSize: '20px', fontWeight: 600, marginBottom: '4px', color: '#222' }}> {viewingContribution.contribution_name} </Text> <Tag color="blue">ID: {viewingContribution.contribution_id}</Tag> </div> <Tag color={viewingContribution.privacy_setting === 'public' ? 'green' : 'red'}> {viewingContribution.privacy_setting?.toUpperCase()} </Tag> </div> <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}> <div style={{ borderRadius: '12px', padding: '16px', border: '1px solid #e0e0e0' }}> <Text strong style={{ display: 'block', marginBottom: '12px', color: '#1976d2', fontSize: '16px' }}> Temple Information </Text> {viewingContribution.temple_id && ( <div style={{ marginBottom: '12px' }}> <Text type="secondary" style={{ fontSize: '15px' }}>ID :</Text> <Text style={{ fontSize: '14px', marginLeft: '8px' }}>{viewingContribution.temple_id}</Text> </div> )} {viewingContribution.temple_name && ( <div> <Text type="secondary" style={{ fontSize: '12px' }}>Name :</Text> <Text style={{ fontSize: '14px', marginLeft: '8px' }}>{viewingContribution.temple_name}</Text> </div> )} </div> <div style={{ borderRadius: '12px', padding: '16px', border: '1px solid #e0e0e0' }}> <Text strong style={{ display: 'block', marginBottom: '12px', color: '#1976d2', fontSize: '16px' }}> Contributor </Text> {users[viewingContribution.user_id] ? ( <div style={{ display: 'flex', alignItems: 'center' }}> <Avatar src={`${users[viewingContribution.user_id].avatar}/preview`} icon={<UserOutlined />} style={{ marginRight: 12 }} /> <div> <Text strong style={{ display: 'block' }}>{users[viewingContribution.user_id].name}</Text> <Text type="secondary">User ID: {viewingContribution.user_id}</Text> </div> </div> ) : <Spin size="small" />} </div> </div> <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #e0e0e0' }}> <Text strong style={{ display: 'block', marginBottom: '16px', color: '#1976d2', fontSize: '16px' }}> Media Content </Text> <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '8px', border: '1px dashed #ccc' }}> {renderMediaContent(viewingContribution)} </div> </div> <div style={{ borderRadius: '12px', padding: '16px', border: '1px solid #e0e0e0' }}> <Text strong style={{ display: 'block', marginBottom: '16px', color: '#1976d2', fontSize: '16px' }}> Share Link </Text> {viewingContribution.share_link ? ( <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '8px', padding: '10px 15px', border: '1px solid #d0d0ff' }}> <LinkOutlined style={{ marginRight: '10px', color: '#1976d2', fontSize: '18px' }} /> <a href={viewingContribution.share_link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', color: '#1976d2', textDecoration: 'none', transition: 'all 0.3s', flex: 1, fontFamily: 'monospace', fontSize: '13px' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0d47a1'} onMouseLeave={(e) => e.currentTarget.style.color = '#1976d2'} > {viewingContribution.share_link} </a> </div> ) : ( <div style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}> <DisconnectOutlined style={{ marginRight: '10px', color: '#999', fontSize: '18px' }} /> <Text type="secondary" style={{ fontStyle: 'italic' }}>No share link available</Text> </div> )} </div> </div> </Modal> )}
    </div>
  );
};

export default GroupManagement;