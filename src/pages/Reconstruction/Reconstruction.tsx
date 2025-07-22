// src/pages/Reconstruction.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tabs,
  Card,
  List,
  Typography,
  Button,
  Tag,
  Empty,
  Popconfirm,
  Form,
  Modal,
  Input,
  Spin,
  Checkbox,
  Row,
  Col,
  message,
  Select,
} from 'antd';
import {
  FolderOutlined,
  TeamOutlined,
  DeleteOutlined,
  DeploymentUnitOutlined,
  PlusOutlined,
  CheckOutlined,
  GroupOutlined,
  DeliveredProcedureOutlined
} from '@ant-design/icons';
import useReconstructionStore from '../../store/useReconstructionStore';
import useTempleStore from '../../store/useTempleStore';
import useContributionStore, { Contribution } from '../../store/useContributionStore';
import useAuthStore from '../../store/useAuthStore';
import styles from './Reconstruction.module.css';
import GroupManagement from './GroupManagement';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import Settings,{ConfigItem} from '../Settings/Settings';

interface ReconstructionProps {
  reconstructionId: string;
}


const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;

export type Level = 'nista' | 'madya' | 'utama' | 'other' | 'all';

const Reconstruction: React.FC<ReconstructionProps> = ({ reconstructionId }) => {
    // Configuration state
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  const [resolution, setResolution] = useState<string>('');
  // State baru untuk menyimpan gabungan kontribusi
  const [fetchedContributions, setFetchedContributions] = useState<Contribution[]>([]);

 
 
  const reconStore = useReconstructionStore();
   
   
  // Load global configs
  // Load global configs
  const configs = useReconstructionStore(state => state.configs);
  const setReconstructionConfig = useReconstructionStore(state => state.setReconstructionConfig);
 

 
 


  
  const templeStore = useTempleStore();
  const contribStore = useContributionStore();
  const [searchText, setSearchText] = useState('');

  const {user} = useAuthStore();

  const [activeTab, setActiveTab] = useState<'1' | 'grouping' | 'configuration'>('1');
  const [activeReconstruction, setActiveReconstruction] = useState<string | null>(null);

  // State for create reconstruction flow
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [showContribModal, setShowContribModal] = useState(false);
  const [selectedTempleIds, setSelectedTempleIds] = useState<number[]>([]);
  const [label, setLabel] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<Level>('all');
  const [page, setPage] = useState(1);
  const [selectedContribIds, setSelectedContribIds] = useState<number[]>([]);

  // State for add contributions to existing reconstruction
  const [addContribModalVisible, setAddContribModalVisible] = useState(false);
  const [currentReconstructionId, setCurrentReconstructionId] = useState<string | null>(null);
  const [addContribActiveCategory, setAddContribActiveCategory] = useState<Level>('nista');
  const [addContribPage, setAddContribPage] = useState(1);
  const [addContribSelectedIds, setAddContribSelectedIds] = useState<number[]>([]);
  const [addContribSearchText, setAddContribSearchText] = useState('');

  // State for pagination and search
  const [templePage, setTemplePage] = useState(1);
  const [templePageSize] = useState(5); // Fixed page size for temples
  const [templeTotal, setTempleTotal] = useState(0);
   const [templeSearchText, setTempleSearchText] = useState('');
  const [debouncedTempleSearchText, setDebouncedTempleSearchText] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null); // Perbaikan di si
  const [loadingTemples, setLoadingTemples] = useState(false);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [loadingAddContributions, setLoadingAddContributions] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);
  const addContribLoaderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const targetReconstructionId = activeTab === '1' ? reconstructionId : activeReconstruction;
  const rec = useReconstructionStore(state =>
    state.reconstructions.find(r => r.reconstruction_id === targetReconstructionId)
  );

  useEffect(() => {
  if (activeTab === 'configuration' && rec && rec.configuration) {
    setSelectedKey(rec.configuration.key);
  } else {
    setSelectedKey(undefined);
  }
}, [activeTab, rec, configs]); // Tambahkan configs sebagai dependency

 const apiUrl = import.meta.env.VITE_API_URL as string;

   const handleConfigSubmit = () => {
    if (!rec) {
      message.error('Reconstruction tidak ditemukan');
      return;
    }
    if (!selectedKey) {
      message.warning('Silakan pilih konfigurasi');
      return;
    }
    const config = configs.find(c => c.key === selectedKey)!;
    setReconstructionConfig(rec.reconstruction_id, config);
     Swal.fire({
      title: 'Created!',
      text: `Configuration Created !`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Debounce untuk pencarian temple
  useEffect(() => {
    if (searchTimeout) {
      window.clearTimeout(searchTimeout);
    }

    const timeout = window.setTimeout(() => {
      setDebouncedTempleSearchText(templeSearchText);
    }, 300); // 300ms debounce time

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        window.clearTimeout(searchTimeout);
      }
    };
  }, [templeSearchText]);

  // Fetch temples with pagination
  useEffect(() => {
    if (!createModalVisible) return;

    const load = async () => {
      try {
        setLoadingTemples(true);
        await templeStore.fetchTemples(templePage, debouncedTempleSearchText);
      } catch {
        message.error('Failed to fetch temples');
      } finally {
        setLoadingTemples(false);
      }
    };

    load();
  }, [createModalVisible, templePage, debouncedTempleSearchText]);

  // Reset state when create modal opens
  useEffect(() => {
    if (createModalVisible) {
      setTemplePage(1);
      setTempleSearchText('');
      setSelectedTempleIds([]);
      setPage(1);
      setSelectedContribIds([]);
      setActiveCategory('nista');
      setSearchText('');
      setShowContribModal(false);
    }
  }, [createModalVisible]);




  // Fetch contributions for add contributions modal
  useEffect(() => {
    if (!addContribModalVisible || !currentReconstructionId) return;
    
    const reconstruction = reconStore.reconstructions.find(
      r => r.reconstruction_id === currentReconstructionId
    );
    
    if (!reconstruction) {
      message.error('Reconstruction not found');
      return;
    }
    
  const fetchContributions = async () => {
      if (!reconstruction.temple_ids || reconstruction.temple_ids.length === 0) return;

      setLoadingAddContributions(true);
      try {
        for (const templeId of reconstruction.temple_ids) {
          await contribStore.fetchContributionsByTempleId(
            templeId,
            addContribPage,
            addContribActiveCategory === 'other' ? 'other' : addContribActiveCategory
          );
        }
      } finally {
        setLoadingAddContributions(false);
      }
    };


    fetchContributions();
  }, [addContribModalVisible, currentReconstructionId, addContribPage, addContribActiveCategory]);

  // Intersection observers for infinite scroll
  const handleCreateObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !contribStore.loading && contribStore.isNext) {
        setPage(prevPage => prevPage + 1);
      }
    },
    [contribStore.loading, contribStore.isNext]
  );

  const handleAddContribObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !contribStore.loading && contribStore.isNext) {
        setAddContribPage(prevPage => prevPage + 1);
      }
    },
    [contribStore.loading, contribStore.isNext]
  );

  // Setup intersection observers
  useEffect(() => {
    const createObserver = new IntersectionObserver(handleCreateObserver, {
      threshold: 0.1,
    });

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      createObserver.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        createObserver.unobserve(currentLoaderRef);
      }
    };
  }, [handleCreateObserver]);

  // Efek untuk mengambil kontribusi dari semua temple terpilih
// useEffect(() => {
//   if (!showContribModal || selectedTempleIds.length === 0) return;

//   const fetchAllContributions = async () => {
//     setLoadingContributions(true);
//     try {
//       const contributions: Contribution[] = [];
      
//       for (const templeId of selectedTempleIds) {
//         // Reset store sebelum fetch baru
//         contribStore.contributions = [];
//         await contribStore.fetchContributionsByTempleId(
//           templeId,
//           1,
//           activeCategory === 'other' ? 'other' : activeCategory
//         );
        
//         // Tambahkan ke gabungan
//         contributions.push(...contribStore.contributions);
//       }
      
//       setAllContributions(contributions);
//     } finally {
//       setLoadingContributions(false);
//     }
//   };

//   fetchAllContributions();
// }, [selectedTempleIds, activeCategory]);

  useEffect(() => {
    const addContribObserver = new IntersectionObserver(handleAddContribObserver, {
      threshold: 0.1,
    });

    const currentAddContribLoaderRef = addContribLoaderRef.current;
    if (currentAddContribLoaderRef) {
      addContribObserver.observe(currentAddContribLoaderRef);
    }

    return () => {
      if (currentAddContribLoaderRef) {
        addContribObserver.unobserve(currentAddContribLoaderRef);
      }
    };
  }, [handleAddContribObserver]);

  // Filter contributions
  const filtered = contribStore.contributions.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const addContribFiltered = contribStore.contributions.filter(c =>
    c.name.toLowerCase().includes(addContribSearchText.toLowerCase())
  );

  // DIUBAH: Toggle pemilihan temple
  const toggleTempleSelect = (id: number) => {
    setSelectedTempleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };


  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedContribIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAddContribSelect = (id: number) => {
    setAddContribSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Save Reconstruction
  // Ubah handleSave untuk membuat SATU reconstruction
const handleSave = async () => {
  if (selectedTempleIds.length === 0) {
    message.error('Pilih minimal satu temple');
    return;
  }
  if (!label.trim()) {
    message.error('Masukkan label reconstruction');
    return;
  }

  setLoadingContributions(true);

  try {
    // Tempat menampung seluruh kontribusi dari semua temple
    const allContributions: Contribution[] = [];

    for (const templeId of selectedTempleIds) {
      let page = 1;
      let totalFetched = 0;
      const maxPages = 10; // untuk mencegah infinite loop
      let hasData = true;

      while (hasData && page <= maxPages) {
        const url = new URL(`${apiUrl}/private/contributions/list/${templeId}`);
        url.searchParams.append('page', String(page));

        // Debug URL jika perlu
        // console.log('Request URL:', url.toString());

        const res = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
            ...(useAuthStore.getState().token
              ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
              : {}),
          },
        });

        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorBody}`);
        }

        const data = await res.json();
        const raw: any[] = Array.isArray(data.datas) ? data.datas : [];

        // Hentikan loop jika tidak ada data lagi
        if (raw.length === 0) {
          hasData = false;
          break;
        }

        // Map ke model Contribution
        const pageItems: Contribution[] = raw.map(d => ({
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
          avatar: d.avatar || '',
          user_name: d.user_name || '',
          category: d.level_area || 'other',
          privacy_setting: d.license_type === 1 ? 'public' : 'private',
        }));

        allContributions.push(...pageItems);
        totalFetched += pageItems.length;

        console.log(`Temple ${templeId} - Halaman ${page}: ${pageItems.length} items`);
        page++;
      }

      console.log(`Total untuk temple ${templeId}: ${totalFetched} kontribusi`);
    }

    // Filter kontribusi yang user pilih
    // const filtered = allContributions.filter(c =>
    //   selectedContribIds.includes(c.tx_contribution_id)
    // );


    

    // Map ke bentuk yang diharapkan store reconstruction
    const selectedContribsForRecon = allContributions.map(c => {
      const temple = templeStore.temples.find(
        t => t.md_temples_id === c.md_temples_id
      );
      return {
        contribution_id: c.tx_contribution_id,
        temple_name: temple?.name || `Temple ${c.md_temples_id}`,
        contribution_name: c.name,
        share_link: c.file_path,
        privacy_setting: c.privacy_setting,
        category: c.category,
        temple_id: c.md_temples_id
      };
    });
    
    if(user != null) {
      console.log(user);
      
        // // Buat satu reconstruction untuk semua temple
      const newRec = reconStore.addReconstruction(
        label,
        user.id,
        selectedTempleIds
      );

      // // Simpan semua kontribusi terpilih
      reconStore.updateReconstructionContributions(
        newRec.reconstruction_id,
        selectedContribsForRecon
      );


      setCreateModalVisible(false);
      setActiveReconstruction(newRec.reconstruction_id);
      setActiveTab('grouping');
      
    } 

  
    // Swal.fire({
    //   title: 'Created!',
    //   text: `Reconstruction "${label}" has been created with ${selectedTempleIds.length} temple(s) and ${selectedContribsForRecon.length} contribution(s).`,
    //   icon: 'success',
    //   timer: 1500,
    //   showConfirmButton: false
    // });


  } catch (err) {
    console.error('Failed to create reconstruction', err);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to create reconstruction. Please try again.',
      icon: 'error',
      timer: 1500,
      showConfirmButton: false
    });
  } finally {
    setLoadingContributions(false);
  }
};




  // Handle add contributions to existing reconstruction
  // const handleAddContributionsSave = () => {
  //   if (!currentReconstructionId) return;

  //   // Map contributions to reconstruction-store shape
  //   const selectedContribsForRecon = contribStore.contributions
  //     .filter(c => addContribSelectedIds.includes(c.tx_contribution_id))
  //     .map(c => ({
  //       contribution_id: c.tx_contribution_id,
  //       contribution_name: c.name,
  //       temple_name: c.name,
  //       share_link: c.file_path,
  //       privacy_setting: c.license_type === 1 ? 'public' : 'private'
  //     }));

  //   // Add selected contributions to reconstruction
  //   const currentContributions = reconStore.reconstructions.find(
  //     r => r.reconstruction_id === currentReconstructionId
  //   )?.contributions || [];
    
  //   const newContributions = [
  //     ...currentContributions,
  //     ...selectedContribsForRecon.filter(newContrib => 
  //       !currentContributions.some(
  //         existing => existing.contribution_id === newContrib.contribution_id
  //       )
  //     )
  //   ];

  //   reconStore.updateReconstructionContributions(currentReconstructionId, newContributions);

  //   message.success('Contributions added successfully');
  //   setAddContribModalVisible(false);
  //   setAddContribSelectedIds([]);
  // };

  // // Handle temple search
  // const handleTempleSearch = (value: string) => {
  //   setTempleSearchText(value);
  //   setTemplePage(1);
  // };

  // Handle temple selection
 const handleTempleSelect = (id: number) => {
 setSelectedTempleIds(prev =>
    prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
  );
  setShowContribModal(true);
  setPage(1);
  setSelectedContribIds([]);
};


  // Open add contributions modal
 const openAddContribModal = (reconstructionId: string) => {
    const reconstruction = reconStore.reconstructions.find(
      r => r.reconstruction_id === reconstructionId
    );
    if (!reconstruction) {
      message.error('Reconstruction not found');
      return;
    }

    setCurrentReconstructionId(reconstructionId);

    // Sesuaikan dengan tipe array
    setSelectedTempleIds(reconstruction.temple_ids);

    // Inisialisasi selected contributions
    const existingIds = reconstruction.contributions.map(c => c.contribution_id);
    setAddContribSelectedIds(existingIds);

    setAddContribPage(1);
    setAddContribActiveCategory('nista');
    setAddContribSearchText('');
    setAddContribModalVisible(true);
  };





  // Close all modals
  const closeAllModals = () => {
    setCreateModalVisible(false);
    setShowContribModal(false);
    setSelectedTempleIds([]); // ← perbaikan di sini
    setLabel('');
    setSelectedContribIds([]);
    setTemplePage(1);
    setTempleSearchText('');
  };


   // Disable config tab if no groups
  // Menjadi:
    const configDisabled = !rec || rec.groups.length === 0 || rec.status !== 'ready';
      
  return (
    <>
      <div className={styles.reconstructionContainer}>
        <Tabs
          activeKey={activeTab}
          onChange={key => setActiveTab(key as '1' | 'grouping' | 'configuration')}
          tabBarStyle={{ marginBottom: 24 }}
        >
          {/* Tab 1: Reconstructions List */}
          <TabPane tab="Reconstructions" key="1">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Title level={3} style={{ margin: 0 }}>Reconstructions</Title>
              <Button
                type="primary"
                icon={<DeliveredProcedureOutlined />}
                onClick={() => setCreateModalVisible(true)}
                style={{ backgroundColor:"#772d2f" }}
              >
                Add Reconstruction
              </Button>
            </div>
            
            {reconStore.reconstructions.length === 0 ? (
              <Empty
                description="No reconstructions created yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => setCreateModalVisible(true)}>
                  Create First Reconstruction
                </Button>
              </Empty>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={reconStore.reconstructions}
                pagination={{ pageSize: 5, showSizeChanger: false }}
                style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}
                renderItem={rec => (
                  <List.Item
                    key={rec.reconstruction_id}
                    style={{ borderBottom: '1px solid #f0f0f0', padding: '16px' }}
                    actions={[
                      // <Button
                      //   key="add"
                      //   type="default"
                      //   icon={<PlusOutlined />}
                      //   onClick={() => openAddContribModal(rec.reconstruction_id)}
                      
                      // >
                      //   Add Contributions
                      // </Button>,
                      <Button
                        key="group"
                        type="dashed"
                        icon={<GroupOutlined />}
                        onClick={() => {
                          setActiveReconstruction(rec.reconstruction_id);
                          setActiveTab('grouping');
                        }}
                      >
                        Group
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="Yakin mau hapus?"
                        onConfirm={() => reconStore.removeReconstruction(rec.reconstruction_id)}
                        okText="Ya"
                        cancelText="Tidak"
                      >
                        <Button type="link" icon={<DeleteOutlined />} danger>
                          Delete
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 32, height: 32, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: '#f0f0f0', borderRadius: 4
                        }}>
                          <DeploymentUnitOutlined style={{ fontSize: 23, color: "#772d2f" }} />
                        </div>
                      }
                      title={<Text strong>{rec.label}</Text>}
                      description={
                        <div>
                          <Text type="secondary" style={{ display: 'block' }}>
                            ID: {rec.reconstruction_id}
                          </Text>
                          <Text type="secondary" style={{ display: 'block' }}>
                            Created: {new Date(rec.created_at).toLocaleDateString()}
                          </Text>
                          <Tag
                            color={rec.status === 'ready' ? 'purple' : 'orange'}
                            style={{ marginTop: 8 }}
                          >
                            Status: {rec.status}
                          </Tag>
                         <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                            <Tag color="blue">
                              {rec.contributions.length} contributions
                            </Tag>
                            <Tag color="green">
                              {rec.groups.length} groups
                            </Tag>
                          </div>

                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </TabPane>

          {/* Tab 2: Group Management */}
          <TabPane tab="Group Management" key="grouping">
            {activeReconstruction ? (
              <GroupManagement
                reconstructionId={activeReconstruction}
                onBack={() => {
                  setActiveReconstruction(null);
                  setActiveTab('1');
                }}
                onGoToConfiguration={() => setActiveTab('configuration')}
              />
            ) : (
              <Card style={{ textAlign: 'center' }}>
                <Text style={{ display: 'block', marginBottom: 16 }}>
                  Select a reconstruction first
                </Text>
                <Button
                  type="primary"
                  onClick={() => setActiveTab("1")}
                >
                  Go to Reconstructions
                </Button>
              </Card>
            )}
          </TabPane>

          {/* Tab 3: Configuration */}
        
          <TabPane tab="Configuration" 
            key="configuration" 
            disabled={configDisabled}
          >
            <Typography.Title level={5}>Select a Config</Typography.Title>
            <Form layout="vertical">
              <Form.Item label="Config Key">
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select configuration key"
                  value={selectedKey}
                  onChange={setSelectedKey}
                >
                  {configs.map((c) => (
                    <Option key={c.key} value={c.key}>
                       {c.value}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* <Form.Item label="Resolution">
                <Input
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Enter resolution"
                />
              </Form.Item> */}

              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleConfigSubmit} 
                  style={{backgroundColor:"#772d2f"}}
                >
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </div>

      {/* Modal 1: Create Reconstruction - Temple Selection */}
       <Modal
        title="Create Reconstruction"
        open={createModalVisible}
        width={600}
        onCancel={() => setCreateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCreateModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            disabled={selectedTempleIds.length === 0 || !label.trim()}
            onClick={handleSave}
          >
            Create Reconstruction
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Label" required>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Reconstruction label"
            />
          </Form.Item>

          <Form.Item label="Select Temples" >
            <Input.Search
              placeholder="Search temples"
              value={templeSearchText}
              onChange={(e) => setTempleSearchText(e.target.value)}
              enterButton
              loading={loadingTemples}
              style={{ marginBottom: 16 }}
            />
            
            {loadingTemples ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : templeStore.temples.length === 0 ? (
              <div style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: 4, 
                padding: 24, 
                textAlign: 'center' 
              }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    debouncedTempleSearchText 
                      ? `No temples found for "${debouncedTempleSearchText}"` 
                      : "No temples available"
                  }
                />
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  <List
                    dataSource={templeStore.temples}
                    renderItem={temple => (
                      <List.Item 
                        key={temple.md_temples_id}
                        onClick={() => handleTempleSelect(temple.md_temples_id)}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 16px',
                          backgroundColor: selectedTempleIds.includes(temple.md_temples_id) 
                            ? '#e6f7ff' 
                            : 'transparent',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                      >
                        <Checkbox
                          checked={selectedTempleIds.includes(temple.md_temples_id)}
                          onChange={() => handleTempleSelect(temple.md_temples_id)}
                          style={{ marginRight: 16 }}
                        />
                        <List.Item.Meta
                          title={temple.name}
                          description={`Location: ${temple.location_name}`}
                        />
                      </List.Item>
                    )}
                  />
                </div>
                
                {/* Pagination */}
                <div style={{marginTop:12, display: 'flex', alignItems: 'center', gap: 12 , justifyContent:'space-between'}}>
                  <Button
                    disabled={templePage === 1 || templeStore.loading}
                    loading={templeStore.loading}
                    onClick={() => setTemplePage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span>Page {templePage}</span>
                  <Button
                    disabled={!templeStore.isNext || templeStore.loading}
                    loading={templeStore.loading}
                    onClick={() => setTemplePage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </Form.Item>
        </Form>
      </Modal>




      
    </>
  );
}


export default Reconstruction