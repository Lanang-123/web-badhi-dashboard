import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  List as AntList,
  message,
  
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
  DisconnectOutlined
} from '@ant-design/icons';
import useReconstructionStore from '../../store/useReconstructionStore';
import styles from './GroupManagement.module.css';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Moment } from 'moment';
import { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface GroupManagementProps {
  reconstructionId: string;
  filterDate: Dayjs | null; // Tambahkan ini
  onBack: () => void;
  onGoToConfiguration: () => void;
}


interface Contribution {
  contribution_id: number;
  contribution_name: string;
  temple_name: string;
  share_link: string;
  privacy_setting: string;
  category?: string;
  temple_id?: number;
  groupName?: string;
}

interface Group {
  group_id: string;
  name: string;
  contributions: Contribution[];
}

interface DragItem {
  type: 'contribution' | 'group';
  ids: number[] | string[];
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

interface ViewingGroup {
  groupId: string;
  groupName: string;
  contributions: Contribution[];
}

const CONTRIB_ITEM_HEIGHT = 100; // Increased height for more details
const GROUP_ITEM_HEIGHT = 320;

// Enhanced Contribution Item with more details and view button
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
  return (
    <div
      key={c.contribution_id}
      className={styles.contribItem}
      draggable
      onDragStart={e => {
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
        backgroundColor: '#fff'
      }}
    >
      <Checkbox
        checked={selectedContribs.includes(c.contribution_id)}
        onChange={() => toggleSelectContrib(c.contribution_id)}
        style={{ marginRight: 12 }}
      />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong ellipsis={{ tooltip: c.contribution_name }} style={{ fontSize: 14 }}>
            {c.contribution_name}
          </Text>
          {/* <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            ID: {c.contribution_id}
          </Text> */}
        </div>
        
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {c.contribution_id && (
            <Tag color="purple" style={{ margin: 0 }}>
              Contribution ID: {c.contribution_id}
            </Tag>
          )}
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
          placeholder="Choose Group"
          style={{ width: 140 }}
          onChange={(groupId) => {
            if (groupId) {
              const item = recon?.contributions.find((cont: Contribution) => cont.contribution_id === c.contribution_id);
              if (item) {
                addContributionsToGroup(reconstructionId, groupId, [item]);
                message.success(`Contribution moved to group`);
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
          style={{ marginLeft: 4,color:'grey' }}
        >
          View <EyeOutlined />
        </Button>
      </div>
    </div>
  );
});

// Group Item component
const GroupItem = React.memo(({ 
  g,
  selectedGroups,
  toggleSelectGroup,
  editingGroup,
  tempGroupName,
  setTempGroupName,
  saveEditing,
  startEditing,
  handleDeleteGroup,
  handleRemoveContribution,
  setViewingGroup,
  reconstructionId,
  handleDrop,
  style
}: {
  g: Group;
  selectedGroups: string[];
  toggleSelectGroup: (groupId: string) => void;
  editingGroup: {id: string; name: string} | null;
  tempGroupName: string;
  setTempGroupName: React.Dispatch<React.SetStateAction<string>>;
  saveEditing: () => void;
  startEditing: (groupId: string, groupName: string) => void;
  handleDeleteGroup: (groupId: string, groupName: string) => void;
  handleRemoveContribution: (groupId: string, contributionId: number) => void;
  setViewingGroup: React.Dispatch<React.SetStateAction<ViewingGroup | null>>;
  reconstructionId: string;
  handleDrop: (e: React.DragEvent, groupId: string) => void;
  style: React.CSSProperties;
}) => {
  const inputRef = useRef<any>(null);
  const isEditing = editingGroup?.id === g.group_id;
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div style={{ ...style, padding: 12 }}  data-group-id={g.group_id}> 
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={selectedGroups.includes(g.group_id)}
              onChange={() => toggleSelectGroup(g.group_id)}
              style={{ marginRight: 8 }}
            />
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
                onClick={() => startEditing(g.group_id, g.name)}
              >
                <Text ellipsis={{ tooltip: g.name }}>{g.name}</Text>
              </div>
            )}
          </div>
        }
        className={styles.groupCard}
        onDrop={e => {
          e.preventDefault();
          handleDrop(e, g.group_id);
          // Remove drag-over indicator
          e.currentTarget.closest('[data-group-id]')?.removeAttribute('data-drag-over');
        }}
        onDragOver={e => {
          e.preventDefault();
          // Add visual indicator
          e.currentTarget.closest('[data-group-id]')?.setAttribute('data-drag-over', 'true');
        }}
        onDragLeave={e => {
          // Remove indicator
          e.currentTarget.closest('[data-group-id]')?.removeAttribute('data-drag-over');
        }}
        extra={
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteGroup(g.group_id, g.name)}
          />
        }
      >
        <div style={{ maxHeight: 150, overflowY: 'auto', padding: 8 }}>
          {g.contributions.length > 0 ? (
            <>
              {g.contributions.slice(0, 2).map(item => (
                <div 
                  key={`item-${item.contribution_id}-${g.group_id}`}
                  style={{
                    marginBottom: 8,
                    padding: 8,
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <Text strong ellipsis={{ tooltip: item.contribution_name }}>
                      {item.contribution_name}
                    </Text>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <Tag color="purple">Contribution ID: {item.contribution_id}</Tag>
                    </div>
                  </div>
                  <Button 
                    type="link" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveContribution(g.group_id, item.contribution_id)}
                  />
                </div>
              ))}
              {g.contributions.length > 2 && (
                <Button 
                  type="link" 
                  onClick={() => setViewingGroup({
                    groupId: g.group_id,
                    groupName: g.name,
                    contributions: g.contributions
                  })}
                  style={{ padding: 0 }}
                >
                  View All {g.contributions.length} contributions
                </Button>
              )}
            </>
          ) : (
            <Text type="secondary">Drag contributions here</Text>
          )}
        </div>
        
        <Divider dashed style={{ margin: '12px 0' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary">{g.contributions.length} contributions</Text>
        </div>
      </Card>
    </div>
  );
});

const GroupManagement: React.FC<GroupManagementProps> = ({ 
  reconstructionId, 
  filterDate, // Terima prop
  onBack, 
  onGoToConfiguration 

}) => {
  const recon = useReconstructionStore(state =>
    state.reconstructions.find(r => r.reconstruction_id === reconstructionId)
  );

  const apiRecons = import.meta.env.VITE_API_RECONSTRUCTION_URL;
  
  // Gunakan referensi untuk fungsi store
  const storeRef = useRef(useReconstructionStore.getState());
  useEffect(() => {
    useReconstructionStore.subscribe(state => storeRef.current = state);
  }, []);

  // Gunakan filterDate dalam query
  useEffect(() => {
    const fetchData = async () => {
      if (!reconstructionId || !filterDate) return;
      
      try {
        const dateParam = filterDate.format('YYYYMMDD');
        const response = await fetch(
          `${apiRecons}/reconstructions/${reconstructionId}?date=${dateParam}`
        );
        const data = await response.json();
        
        // Update store dengan data baru
        useReconstructionStore.getState().updateReconstructionData(data);
      } catch (error) {
        console.error('Failed to fetch reconstruction data:', error);
      }
    };

    fetchData();
  }, [reconstructionId, filterDate]);

  const [newGroupName, setNewGroupName] = useState('');
  const [selectedContribs, setSelectedContribs] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergedGroupName, setMergedGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDraggingOverGroups, setIsDraggingOverGroups] = useState(false);
  
  // State untuk edit mode
  const [editingGroup, setEditingGroup] = useState<{id: string; name: string} | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');

  // Pisahkan filter untuk contributions dan groups
  const [contribFilters, setContribFilters] = useState<FilterState>({
    category: [],
    privacy: [],
    search: '',
    temple: [],
  });
  
  const [groupFilters, setGroupFilters] = useState({
    search: ''
  });

  const [bulkMoveVisible, setBulkMoveVisible] = useState(false);
  const [targetGroup, setTargetGroup] = useState<string | null>(null);
  const [viewingGroup, setViewingGroup] = useState<ViewingGroup | null>(null);
  const [viewingContribution, setViewingContribution] = useState<Contribution | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ groupId: string; groupName: string } | null>(null);
  
  // State untuk menandai inisialisasi
  const [initializationFlags, setInitializationFlags] = useState({
    default: false,
    area: false
  });

  // Fungsi untuk menangani drop di area groups
  
  const handleDropOnGroupsArea = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverGroups(false);
    
    if (!recon) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragItem;
      
      if (data.type === 'contribution') {
        // Check if dropped on existing group card
        const targetElement = e.target as HTMLElement;
        const groupCard = targetElement.closest('[data-group-id]');
        
        if (groupCard) {
          // Handled by GroupItem's onDrop - do nothing
          return;
        }
        
        // Create new group only if not dropped on existing group
        const items = recon.contributions.filter(c =>
          (data.ids as number[]).includes(c.contribution_id)
        );
        
        if (items.length === 0) return;
        
        const newGroupName = `Group ${recon.groups.length + 1}`;
        const newGroupId = `group-${Date.now()}`;
        
        storeRef.current.addGroupWithContributions(
          reconstructionId,
          newGroupId,
          newGroupName,
          items
        );
        
        message.success(`Created new group "${newGroupName}" with ${items.length} contributions`);
      }
    } catch (err) {
      console.error('Failed to parse drag data:', err);
    }
  }, [recon, reconstructionId]);

  // Reset inisialisasi saat reconstruction berubah
  useEffect(() => {
    setInitializationFlags({
      default: false,
      area: false
    });
    setSelectedGroups([]);
    setContribFilters({ category: [], privacy: [], search: '',temple:[] });
    setGroupFilters({ search: '' });
    setEditingGroup(null);
  }, [reconstructionId]);

  // Filtered contributions
  const filteredContributions = useMemo(() => {
    if (!recon) return [];
    
    return recon.contributions.filter(c => {
      if (contribFilters.category.length > 0 && (!c.category || !contribFilters.category.includes(c.category))) {
        return false;
      }

      if (contribFilters.temple.length > 0 && 
          (!c.temple_name || !contribFilters.temple.includes(c.temple_name))) {
        return false;
      }
      
      if (contribFilters.privacy.length > 0 && !contribFilters.privacy.includes(c.privacy_setting)) {
        return false;
      }
      
      if (contribFilters.search && 
          !c.contribution_name.toLowerCase().includes(contribFilters.search.toLowerCase()) &&
          !c.category?.toLowerCase().includes(contribFilters.search.toLowerCase()) &&
          !c.privacy_setting.toLowerCase().includes(contribFilters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [
    recon?.contributions, 
    contribFilters.category, 
    contribFilters.privacy, 
    contribFilters.search,
    contribFilters.temple,
  ]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!recon) return [];
    
    return recon.groups.filter(g => {
      if (groupFilters.search && 
          !g.name.toLowerCase().includes(groupFilters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [recon, groupFilters]);

  // Available categories
  const categories = useMemo(() => {
    if (!recon) return [];
    return Array.from(new Set(recon.contributions.map(c => c.category).filter(Boolean))) as string[];
  }, [recon]);

  // Available privacy settings
  const privacySettings = useMemo(() => {
    if (!recon) return [];
    return Array.from(new Set(recon.contributions.map(c => c.privacy_setting)));
  }, [recon]);

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    storeRef.current.addGroup(reconstructionId, newGroupName.trim());
    setNewGroupName('');
    message.success(`Group "${newGroupName.trim()}" created`);
  }, [newGroupName, reconstructionId]);

  const handleDragStart = useCallback((e: React.DragEvent, type: 'contribution' | 'group', ids: number[] | string[]) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, ids }));
  }, []);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (!recon) {
      message.error('Data belum tersedia, silakan tunggu sebentar.');
      return;
    }

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragItem;
      if (data.type === 'contribution') {
        const items = recon.contributions.filter(c =>
          (data.ids as number[]).includes(c.contribution_id)
        );
        if (!items.length) return;

        storeRef.current.addContributionsToGroup(reconstructionId, groupId, items);
        message.success(`${items.length} kontribusi dipindahkan ke grup.`);
      }
    } catch (err) {
      console.error('Gagal parsing data drag:', err);
    }
  }, [recon, reconstructionId]);

  const toggleSelectContrib = useCallback((id: number) => {
    setSelectedContribs(prev =>
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  }, []);
  
  const toggleSelectGroup = useCallback((groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  }, []);

  const selectAllContribs = useCallback(() => {
    if (filteredContributions.length === selectedContribs.length) {
      setSelectedContribs([]);
    } else {
      setSelectedContribs(filteredContributions.map(c => c.contribution_id));
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
    
    const selectedGroupNames = selectedGroups
      .map(id => recon?.groups.find(g => g.group_id === id)?.name || '')
      .filter(name => name);
    
    if (selectedGroupNames.length > 0) {
      setMergedGroupName(`Merged: ${selectedGroupNames.join(' + ')}`);
    } else {
      setMergedGroupName('Merged Group');
    }
    
    setMergeModalVisible(true);
  }, [selectedGroups, recon]);

  const confirmMergeGroups = useCallback(() => {
    if (!recon || selectedGroups.length < 2) return;
    
    const newGroupName = mergedGroupName.trim() || 'Merged Group';
    storeRef.current.mergeGroups(reconstructionId, selectedGroups, newGroupName);
    
    message.success(`Merged ${selectedGroups.length} groups into "${newGroupName}"`);
    setSelectedGroups([]);
    setMergeModalVisible(false);
    setMergedGroupName('');
  }, [recon, selectedGroups, mergedGroupName, reconstructionId]);

  const moveSelectedContribs = useCallback(() => {
    if (!targetGroup || selectedContribs.length === 0) {
      message.warning('Please select a target group and at least one contribution');
      return;
    }
    
    const items = recon?.contributions.filter(c => 
      selectedContribs.includes(c.contribution_id)
    ) || [];
    
    if (items.length) {
      storeRef.current.addContributionsToGroup(reconstructionId, targetGroup, items);
      message.success(`${items.length} contributions moved to group`);
      setSelectedContribs([]);
      setBulkMoveVisible(false);
    }
  }, [targetGroup, selectedContribs, recon, reconstructionId]);

  const removeSelectedContribs = useCallback(() => {
    if (selectedContribs.length === 0) return;
    
    Modal.confirm({
      title: 'Confirm Removal',
      content: `Are you sure you want to remove ${selectedContribs.length} contributions from their groups?`,
      onOk: () => {
        const contribs = recon?.contributions.filter(c => 
          selectedContribs.includes(c.contribution_id)
        ) || [];
        
        recon?.groups.forEach(group => {
          const itemsInGroup = group.contributions.filter(c =>
            selectedContribs.includes(c.contribution_id)
          );

          if (itemsInGroup.length > 0) {
            storeRef.current.removeContributionsFromGroup(
              reconstructionId, 
              group.group_id, 
              itemsInGroup
            );
          }
        });

        message.success(`${contribs.length} contributions removed from groups`);
        setSelectedContribs([]);
      }
    });
  }, [selectedContribs, recon, reconstructionId]);

  const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
    setGroupToDelete({ groupId, groupName });
    setDeleteModalVisible(true);
  }, []);

  const confirmDeleteGroup = useCallback(() => {
    if (groupToDelete) {
      storeRef.current.removeGroup(reconstructionId, groupToDelete.groupId);
      message.success(`Group "${groupToDelete.groupName}" deleted`);
      setDeleteModalVisible(false);
      setGroupToDelete(null);
    }
  }, [groupToDelete, reconstructionId]);

  const handleRemoveContribution = useCallback((groupId: string, contributionId: number) => {
    if (!recon) return;

    const group = recon.groups.find(g => g.group_id === groupId);
    if (!group) return;

    const contribution = group.contributions.find(c => c.contribution_id === contributionId);
    if (!contribution) return;

    storeRef.current.removeContributionsFromGroup(
      reconstructionId, 
      groupId, 
      [contribution]
    );
    
    message.success('Contribution removed from group');
    
    if (viewingGroup && viewingGroup.groupId === groupId) {
      setViewingGroup(prev => ({
        ...prev!,
        contributions: prev!.contributions.filter(c => 
          c.contribution_id !== contributionId
        )
      }));
    }
  }, [recon, reconstructionId, viewingGroup]);

  const startEditing = useCallback((groupId: string, groupName: string) => {
    setEditingGroup({ id: groupId, name: groupName });
    setTempGroupName(groupName);
  }, []);

  const saveEditing = useCallback(() => {
    if (editingGroup && tempGroupName.trim()) {
      storeRef.current.updateGroupName(reconstructionId, editingGroup.id, tempGroupName.trim());
      setEditingGroup(null);
      message.success(`Group renamed to "${tempGroupName.trim()}"`);
    }
  }, [editingGroup, tempGroupName, reconstructionId]);

  // Fungsi untuk inisialisasi grup 1:1
  const initializeOneToOne = useCallback(() => {
    if (!recon) return;
    
    setLoading(true);
    
    setTimeout(() => {
      const { removeGroup, addGroupWithContributions } = storeRef.current;
      
      // Hapus grup default yang sudah ada
      recon.groups
        .filter(g => g.name.startsWith('Group '))
        .forEach(g => removeGroup(reconstructionId, g.group_id));

      // Buat grup baru untuk setiap kontribusi
      recon.contributions.forEach((contrib, index) => {
        const groupName = `Group ${index + 1}`;
        const groupId = `group-${reconstructionId}-${contrib.contribution_id}`;
        addGroupWithContributions(
          reconstructionId,
          groupId,
          groupName,
          [contrib]
        );
      });

      message.success('Groups initialized 1:1 successfully');
      setLoading(false);
    }, 500);
  }, [recon, reconstructionId]);

  // Fungsi untuk inisialisasi grup by area
  const initializeByArea = useCallback(() => {
    if (!recon) return;
    
    setLoading(true);
    
    setTimeout(() => {
      const { removeGroup, addGroupWithContributions } = storeRef.current;
      
      // Hapus grup area yang sudah ada
      const areaGroups = recon.groups.filter(g => g.name.startsWith('Area:'));
      areaGroups.forEach(group => {
        removeGroup(reconstructionId, group.group_id);
      });

      // Dapatkan area unik
      const uniqueAreas = Array.from(
        new Set(
          recon.contributions
            .map(c => c.category)
            .filter((area): area is string => !!area)
        )
      );
      
      // Buat grup untuk setiap area
      uniqueAreas.forEach(area => {
        const groupName = `Area: ${area}`;
        const groupId = `area-group-${reconstructionId}-${area}`;
        const areaContributions = recon.contributions.filter(
          c => c.category === area
        );
        
        addGroupWithContributions(
          reconstructionId, 
          groupId, 
          groupName, 
          areaContributions
        );
      });
      
      message.success('Groups initialized by area successfully');
      setLoading(false);
    }, 500);
  }, [recon, reconstructionId]);

  const temples = useMemo(() => {
      if (!recon) return [];
      return Array.from(new Set(
        recon.contributions
          .map(c => c.temple_name)
          .filter((temple): temple is string => !!temple)
      ));
    }, [recon]);

  // Fungsi untuk menampilkan video dalam modal
  const renderMediaContent = (contribution: Contribution) => {
    if (!contribution.share_link) {
      return <Text type="secondary">No media available</Text>;
    }
    
    // Deteksi jika link adalah video
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    const isVideo = videoExtensions.some(ext => 
      contribution.share_link.toLowerCase().endsWith(ext)
    );
    
    if (isVideo) {
      return (
        <video 
          controls 
          style={{ width: '100%', maxHeight: '400px' }}
        >
          <source src={contribution.share_link}  />
          Your browser does not support the video tag.
        </video>
      );
    }
    
    // Deteksi jika link adalah YouTube
    if (contribution.share_link) {
      return (
            <iframe
              width="100%"
              height="315"
              src={`${contribution.share_link}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          );
    }
    

    return (
      <Button 
        type="primary" 
        href={contribution.share_link} 
        target="_blank"
        rel="noopener noreferrer"
      >
        View Content
      </Button>
    );
  };

  if (!recon) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3} style={{ margin: 0 }}>Group Management</Title>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button 
            type="primary" 
            onClick={onGoToConfiguration} 
            disabled={!recon.groups.length}
            style={{ backgroundColor: "#772d2f",marginBottom:'15px' }}
          >
            Next: Configuration
          </Button>
        </div>
      </div>

      <Card 
        className={styles.newGroupCard} 
        style={{ marginBottom: 16 }}
        bodyStyle={{ display: 'flex', gap: 8 }}
      >
        <Input
          placeholder="New Group Name"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button 
          icon={<PlusOutlined />} 
          onClick={handleCreateGroup} 
          type="primary"
          disabled={!newGroupName.trim()}
        >
          Create Group
        </Button>
      </Card>

      <Row gutter={24} style={{ height: 'calc(110vh - 250px)', marginTop: 32, marginBottom: 30 }}>
        <Col span={14}>
          <div style={{ display: 'flex', gap: 8 }}>
              <Search
                  placeholder="Search contributions..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="middle"
                  style={{ width: 270, marginRight: 8, marginBottom: 12 }}
                  value={contribFilters.search}
                  onChange={e => setContribFilters(prev => ({ 
                    ...prev, 
                    search: e.target.value 
                  }))}
                />
                <Popover
              placement="bottomRight"
              title="Filter Contributions"
              content={
                <div style={{ minWidth: 250 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Temple</Text>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      placeholder="Select temples"
                      value={contribFilters.temple}
                      onChange={value => setContribFilters(prev => ({ ...prev, temple: value }))}
                      options={temples.map(t => ({ value: t, label: t }))}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Area</Text>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      placeholder="Select area"
                      value={contribFilters.category}
                      onChange={value => setContribFilters(prev => ({ ...prev, category: value }))}
                      options={categories.map(c => ({ value: c, label: c }))}
                    />
                  </div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Privacy</Text>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      placeholder="Select privacy settings"
                      value={contribFilters.privacy}
                      onChange={value => setContribFilters(prev => ({ ...prev, privacy: value }))}
                      options={privacySettings.map(p => ({ value: p, label: p }))}
                    />
                  </div>
                  
                  <Button 
                    type="primary" 
                    block 
                    onClick={() => setContribFilters({ category: [], privacy: [], search: '',temple:[]})}
                  >
                    Clear Filters
                  </Button>
                </div>
              }
              trigger="click"
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
                    indeterminate={selectedContribs.length > 0 && selectedContribs.length < filteredContributions.length}
                    checked={selectedContribs.length > 0 && selectedContribs.length === filteredContributions.length}
                    onChange={selectAllContribs}
                    style={{ marginRight: 8 }}
                  >
                    Select All
                  </Checkbox>
                  
                  <Button
                    type="dashed"
                    onDragStart={e => handleDragStart(e, 'contribution', selectedContribs)}
                    draggable={selectedContribs.length > 0}
                    disabled={selectedContribs.length === 0}
                    icon={<DragOutlined />}
                    style={{ marginRight: 8 }}
                  >
                    Drag Selected
                  </Button>
                  
                  <Button
                    type="primary"
                    icon={<ArrowDownOutlined />}
                    disabled={selectedContribs.length === 0}
                    onClick={() => setBulkMoveVisible(true)}
                  >
                    Move Selected
                  </Button>
                </div>
              </div>
            }
            className={styles.card}
            style={{ height: '100%' }}
            bodyStyle={{ padding: 0, height: 'calc(100% - 60px)', overflow: 'hidden' }}
            
          >
            {filteredContributions.length === 0 ? (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="No contributions found"
                style={{ padding: 40 }}
              />
            ) : (
              <AutoSizer>
                {({ height, width }: AutoSizerParams) => (
                  <List
                    height={height}
                    itemCount={filteredContributions.length}
                    itemSize={CONTRIB_ITEM_HEIGHT}
                    width={width}
                    itemKey={index => filteredContributions[index]?.contribution_id || index}
                  >
                    {({ index, style }) => (
                      <ContribItem
                        c={filteredContributions[index]}
                        selectedContribs={selectedContribs}
                        toggleSelectContrib={toggleSelectContrib}
                        recon={recon}
                        reconstructionId={reconstructionId}
                        addContributionsToGroup={storeRef.current.addContributionsToGroup}
                        style={style}
                        onViewDetail={setViewingContribution}
                      />
                    )}
                  </List>
                )}
              </AutoSizer>
            )}

            
          </Card>
        </Col>

        <Col span={10}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Search
              placeholder="Search groups..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              style={{ width: 200 }}
              value={groupFilters.search}
              onChange={e => setGroupFilters(prev => ({ 
                ...prev, 
                search: e.target.value 
              }))}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                icon={<UserOutlined />} 
                onClick={initializeOneToOne}
                loading={loading}
              >
                1:1 Groups
              </Button>
              <Button 
                icon={<FolderOutlined />} 
                onClick={initializeByArea}
                loading={loading}
              >
                By Area
              </Button>
            </div>
          </div>
          
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Groups ({filteredGroups.length})</span>
                <div>
                  <Checkbox
                    indeterminate={selectedGroups.length > 0 && selectedGroups.length < filteredGroups.length}
                    checked={selectedGroups.length > 0 && selectedGroups.length === filteredGroups.length}
                    onChange={selectAllGroups}
                    style={{ marginRight: 8 }}
                  >
                    Select All
                  </Checkbox>
                  
                  <Button
                    icon={<MergeCellsOutlined />}
                    onClick={handleMergeGroups}
                    type="primary"
                    disabled={selectedGroups.length < 2}
                  >
                    Merge Groups
                  </Button>
                </div>
              </div>
            }
            className={styles.card}
            style={{ height: '100%' }}
            bodyStyle={{ padding: 0, height: 'calc(100% - 60px)', overflow: 'hidden' }}
            onDrop={handleDropOnGroupsArea}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOverGroups(true);
            }}
            onDragLeave={() => setIsDraggingOverGroups(false)}
          >
            {filteredGroups.length === 0 ? (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="No groups found"
                style={{ padding: 40 }}
              />
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    itemCount={filteredGroups.length}
                    itemSize={GROUP_ITEM_HEIGHT}
                    width={width}
                    itemKey={index => filteredGroups[index]?.group_id || index}
                  >
                    {({ index, style }) => (
                      <GroupItem
                        g={filteredGroups[index]}
                        selectedGroups={selectedGroups}
                        toggleSelectGroup={toggleSelectGroup}
                        editingGroup={editingGroup}
                        tempGroupName={tempGroupName}
                        setTempGroupName={setTempGroupName}
                        saveEditing={saveEditing}
                        startEditing={startEditing}
                        handleDeleteGroup={handleDeleteGroup}
                        handleRemoveContribution={handleRemoveContribution}
                        setViewingGroup={setViewingGroup}
                        reconstructionId={reconstructionId}
                        handleDrop={handleDrop}
                        style={style}
                      />
                    )}
                  </List>
                )}
              </AutoSizer>
            )}
             {/* Overlay saat drag sedang terjadi */}
            
          </Card>
        </Col>
      </Row>

      
      {/* Delete Group Modal */}
      <Modal
        title="Delete Group"
        open={deleteModalVisible}
        onOk={confirmDeleteGroup}
        onCancel={() => {
          setDeleteModalVisible(false);
          setGroupToDelete(null);
        }}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Text>Are you sure you want to delete "</Text>
        <Text strong>{groupToDelete?.groupName || ''}</Text>
        <Text>"?</Text>
      </Modal>

      {/* Merge Groups Modal */}
      <Modal
        title="Merge Groups"
        open={mergeModalVisible}
        onOk={confirmMergeGroups}
        onCancel={() => setMergeModalVisible(false)}
        okText="Merge"
        cancelText="Cancel"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Selected Groups:</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
            {selectedGroups.map(groupId => {
              const group = recon?.groups.find(g => g.group_id === groupId);
              return group ? (
                <Tag key={groupId} color="blue" style={{ marginBottom: 4 }}>
                  {group.name} ({group.contributions.length} items)
                </Tag>
              ) : null;
            })}
          </div>
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <Text strong>New Group Name:</Text>
          <Input
            value={mergedGroupName}
            onChange={e => setMergedGroupName(e.target.value)}
            placeholder="Enter new group name"
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
      
      {/* Bulk Move Modal */}
      <Modal
        title="Move Selected Contributions"
        open={bulkMoveVisible}
        onOk={moveSelectedContribs}
        onCancel={() => setBulkMoveVisible(false)}
        okText="Move"
        cancelText="Cancel"
        okButtonProps={{ disabled: !targetGroup }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            You are about to move <Text strong>{selectedContribs.length}</Text> contributions
          </Text>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>Target Group:</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Select a group"
            value={targetGroup}
            onChange={setTargetGroup}
            showSearch
            optionFilterProp="label"
          >
            {recon?.groups.map(g => (
              <Option key={g.group_id} value={g.group_id} label={g.name}>
                {g.name} ({g.contributions.length} items)
              </Option>
            ))}
          </Select>
        </div>
      </Modal>
      
      {/* Group Contributions Modal */}
      {viewingGroup && (
          <Modal
            title={`Contributions in ${viewingGroup.groupName}`}
            open={!!viewingGroup}
            onCancel={() => setViewingGroup(null)}
            footer={null}
            width={800}
          >
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <AntList
                dataSource={viewingGroup.contributions}
                renderItem={(item: Contribution) => (
                  <Card 
                    key={item.contribution_id} 
                    style={{ marginBottom: 8 }}
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{item.contribution_name}</Text>
                      <Button 
                        type="link" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveContribution(viewingGroup.groupId, item.contribution_id)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Tag color="purple">Contribution ID: {item.contribution_id || 'N/A'}</Tag>
                      {/* <Tag color={item.privacy_setting === 'public' ? 'green' : 'red'}>
                        {item.privacy_setting}
                      </Tag> */}
                    </div>
                  </Card>
                )}
              />
            </div>
          </Modal>
        )}

      {/* Contribution Detail Modal */}
      {viewingContribution && (
      <Modal
            title={`Contribution Details: ${viewingContribution.contribution_name}`}
            open={!!viewingContribution}
            onCancel={() => setViewingContribution(null)}
            footer={null}
            width={800}
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              padding: 0,
            }}
            bodyStyle={{
              padding: 0,
              background: '#ffffff',
              color: '#333',
            }}
          >
          <div style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            background: '#ffffff',
          }}>
            {/* Header Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e0e0e0',
            }}>
              <div>
                <Text style={{ 
                  display: 'block', 
                  fontSize: '20px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: '#222',
                }}>
                  {viewingContribution.contribution_name}
                </Text>
                <Tag color="blue">
                  ID: {viewingContribution.contribution_id}
                </Tag>
              </div>
              
              <Tag color={viewingContribution.privacy_setting === 'public' ? 'green' : 'red'}>
                {viewingContribution.privacy_setting?.toUpperCase()}
              </Tag>
            </div>

            {/* Information Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px',
            }}>
              <div style={{
        
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e0e0e0',
              }}>
                <Text strong style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#1976d2',
                  fontSize: '16px',
                }}>
                  Temple Information
                </Text>
                
                {viewingContribution.temple_id && (
                  <div style={{ marginBottom: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '15px' }}>
                      ID : 
                    </Text>
                    <Text style={{ fontSize: '14px',marginLeft:'8px' }}>
                      {viewingContribution.temple_id}
                    </Text>
                  </div>
                )}
                
                {viewingContribution.temple_name && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Name :
                    </Text>
                    <Text style={{ fontSize: '14px',marginLeft:'8px' }}>
                      {viewingContribution.temple_name}
                    </Text>
                  </div>
                )}
              </div>
              
              <div style={{
              
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e0e0e0',
              }}>
                <Text strong style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#1976d2',
                  fontSize: '16px',
                }}>
                  Area
                </Text>
                
                <div>
                
                  <Tag color="geekblue">
                    {viewingContribution.category || 'N/A'}
                  </Tag>
                </div>
              </div>
            </div>

            {/* Media Content Section */}
            <div style={{

              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid #e0e0e0',
            }}>
              <Text strong style={{
                display: 'block',
                marginBottom: '16px',
                color: '#1976d2',
                fontSize: '16px',
              }}>
                Media Content
              </Text>
              
              <div style={{
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f0f0f0',
                borderRadius: '8px',
                border: '1px dashed #ccc',
              }}>
                {renderMediaContent(viewingContribution)}
              </div>
            </div>

            {/* Share Link Section */}
            <div style={{
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #e0e0e0',
            }}>
              <Text strong style={{
                display: 'block',
                marginBottom: '16px',
                color: '#1976d2',
                fontSize: '16px',
              }}>
                Share Link
              </Text>
              
              {viewingContribution.share_link ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  border: '1px solid #d0d0ff',
                }}>
                  <LinkOutlined style={{ 
                    marginRight: '10px', 
                    color: '#1976d2',
                    fontSize: '18px',
                  }} />
                  <a 
                    href={viewingContribution.share_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      wordBreak: 'break-all',
                      color: '#1976d2',
                      textDecoration: 'none',
                      transition: 'all 0.3s',
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0d47a1'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#1976d2'}
                  >
                    {viewingContribution.share_link}
                  </a>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 15px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '1px dashed #ccc',
                }}>
                  <DisconnectOutlined style={{ 
                    marginRight: '10px', 
                    color: '#999',
                    fontSize: '18px',
                  }} />
                  <Text type="secondary" style={{ fontStyle: 'italic' }}>
                    No share link available
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Modal>

      )}

    </div>
  );
};

export default GroupManagement;