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
  message,
  Select,
  DatePicker,
} from 'antd';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  GroupOutlined,
  DeliveredProcedureOutlined
} from '@ant-design/icons';
import useReconstructionStore, { ReconstructionMetadata } from '../../store/useReconstructionStore';
import useTempleStore from '../../store/useTempleStore';
import useContributionStore, { Contribution } from '../../store/useContributionStore';
import useAuthStore from '../../store/useAuthStore';
import styles from './Reconstruction.module.css';
import GroupManagement from './GroupManagement';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import StagedContributionsCounter from './StagedContributionsCounter';

interface ReconstructionProps {
  reconstructionId: string;
}

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;

export type Level = 'nista' | 'madya' | 'utama' | 'other' | 'all';

const Reconstruction: React.FC<ReconstructionProps> = ({ reconstructionId }) => {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(dayjs());
  const reconStore = useReconstructionStore();
  const [selectedRecons, setSelectedRecons] = useState<string[]>([]);
  const configs = useReconstructionStore(state => state.configs);
  const setReconstructionConfig = useReconstructionStore(state => state.setReconstructionConfig);
  const templeStore = useTempleStore();
  const contribStore = useContributionStore();
  const [, setSearchText] = useState('');
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'1' | 'grouping' | 'configuration'>('1');
  const [activeReconstruction, setActiveReconstruction] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [, setShowContribModal] = useState(false);
  const [selectedTempleIds, setSelectedTempleIds] = useState<number[]>([]);
  const [label, setLabel] = useState<string>('');
  const [, setActiveCategory] = useState<Level>('all');
  const [, setPage] = useState(1);
  const [, setSelectedContribIds] = useState<number[]>([]);
  const [addContribModalVisible, ] = useState(false);
  const [currentReconstructionId, ] = useState<string | null>(null);
  const [addContribActiveCategory] = useState<Level>('nista');
  const [addContribPage, setAddContribPage] = useState(1);
  const [templePage, setTemplePage] = useState(1);
  const [templeSearchText, setTempleSearchText] = useState('');
  const [debouncedTempleSearchText, ] = useState('');
  const [loadingTemples, setLoadingTemples] = useState(false);
  const [, setLoadingContributions] = useState(false);
  const [, setLoadingAddContributions] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const addContribLoaderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const targetReconstructionId = activeTab === '1' ? reconstructionId : activeReconstruction;
  const apiUrl = import.meta.env.VITE_API_URL as string;
  const apiRecons = import.meta.env.VITE_API_RECONSTRUCTION_URL;

  useEffect(() => {
    const loadConfigsIfNeeded = async () => {
      if (activeTab === 'configuration' && reconStore.configs.length === 0) {
        try {
          await reconStore.fetchConfigs();
        } catch (error) {
          message.error('Failed to load configuration data.');
        }
      }
    };
    loadConfigsIfNeeded();
  }, [activeTab, reconStore]);

  useEffect(() => {
    const fetchRecons = async () => {
      if (!filterDate) {
        reconStore.setReconstructions([]);
        return;
      }
      const month = filterDate.format('YYYYMM');
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      try {
        const res = await fetch(`${apiRecons}?month=${month}`, {
          method: 'GET',
          headers,
        });
        const payload = await res.json() as {
          error?: string;
          datas?: ReconstructionMetadata[];
        };
        if (payload.error) {
          message.error(payload.error);
          reconStore.setReconstructions([]);
          return;
        }
        const datas = payload.datas ?? [];
        const mappedData = datas.map(rec => ({
          ...rec,
          contributions: rec.contributions ?? [],
          groups: (rec.groups ?? []).map(group => ({
            ...group,
            contributions: (group.contributions ?? []).map(contrib => ({
              ...contrib,
              category: contrib.category ?? 'other',
              temple_id: contrib.temple_id ?? 0,
              privacy_setting: contrib.privacy_setting ?? 'public'
            }))
          }))
        }));
        reconStore.setReconstructions(mappedData);
      } catch (err) {
        console.error('Failed to fetch reconstructions:', err);
        message.error('Failed to load reconstructions for date');
        reconStore.setReconstructions([]);
      }
    };
    fetchRecons();
  }, [filterDate]);

  const rec = useReconstructionStore(state =>
    state.reconstructions.find(r => r.reconstruction_id === targetReconstructionId)
  );

  useEffect(() => {
    if (activeTab === 'configuration' && rec && rec.configuration) {
      setSelectedKey(rec.configuration.key);
    } else {
      setSelectedKey(undefined);
    }
  }, [activeTab, rec, configs]);

  const handleConfigSubmit = async () => {
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
    try {
      await reconStore.postReconstructionForAPI(rec.reconstruction_id);
      Swal.fire({
        title: 'Success!',
        text: 'Reconstruction saved successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/reconstructions');
    } catch (error) {
      console.log(error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to save reconstruction',
        icon: 'error',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const getAuthToken = (): string | null => {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state?.token ?? null;
    } catch {
      console.warn('Failed to parse auth-storage');
      return null;
    }
  };

  const handleDownload = async (rec: any) => {
    const dateParam = filterDate?.format('YYYYMM');
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(
        `${apiRecons}/download/${rec.reconstruction_id}?month=${dateParam}`,
        { headers }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const { temple_ids, ...dataToSave } = data;
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconstruction_${rec.reconstruction_id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      message.error('Failed to download reconstruction');
    }
  };

  const handleDownloadAllByDate = async () => {
    if (!filterDate) return;
    const dateParam = filterDate.format('YYYYMM');
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(
        `${apiRecons}/download?month=${dateParam}`,
        { headers }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const formattedData = data.map((item: ReconstructionMetadata) => {
        const { temple_ids, ...rest } = item;
        return rest;
      });
      const blob = new Blob([JSON.stringify(formattedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconstructions_${dateParam}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      message.error('Failed to download reconstructions');
    }
  };

  const handleDownloadSelected = async () => {
    if (!filterDate || selectedRecons.length === 0) return;
    const dateParam = filterDate.format('YYYYMM');
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(
        `${apiRecons}/download/multiple?month=${dateParam}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ids: selectedRecons }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Status ${res.status}`);
      }
      const data: ReconstructionMetadata[] = await res.json();
      const formattedData = data.map((item: ReconstructionMetadata) => {
        const { temple_ids, ...rest } = item;
        return rest;
      });
      const blob = new Blob([JSON.stringify(formattedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selected_reconstructions_${dateParam}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed:', err);
      message.error(err.message || 'Failed to download selected reconstructions');
    }
  };

  const toggleSelectRecon = (id: string) => {
    setSelectedRecons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const reconstructionsToShow = reconStore.reconstructions;

  useEffect(() => {
    if (!createModalVisible) return;
    const load = async () => {
      try {
        setLoadingTemples(true);
        await templeStore.fetchTemples(templePage, templeSearchText);
      } catch {
        message.error('Failed to fetch temples');
      } finally {
        setLoadingTemples(false);
      }
    };
    load();
  }, [createModalVisible, templePage, templeSearchText]);

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
  }, [addContribModalVisible, currentReconstructionId, addContribPage, addContribActiveCategory, contribStore, reconStore.reconstructions]);

  const handleCreateObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !contribStore.loading && contribStore.isNext) {
      setPage(prevPage => prevPage + 1);
    }
  }, [contribStore.loading, contribStore.isNext]);

  const handleAddContribObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !contribStore.loading && contribStore.isNext) {
      setAddContribPage(prevPage => prevPage + 1);
    }
  }, [contribStore.loading, contribStore.isNext]);

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
      const allContributions: Contribution[] = [];
      for (const templeId of selectedTempleIds) {
        let page = 1;
        let hasData = true;
        while (hasData) {
          const url = new URL(`${apiUrl}/private/contributions/list/${templeId}`);
          url.searchParams.append('page', String(page));
          const res = await fetch(url.toString(), {
            headers: {
              'Content-Type': 'application/json',
              ...(useAuthStore.getState().token ?
                { Authorization: `Bearer ${useAuthStore.getState().token}` } :
                {}),
            },
          });
          if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorBody}`);
          }
          const data = await res.json();
           console.log("DATA MENTAH DARI API KONTRIBUSI:", data.datas);
          const raw: any[] = Array.isArray(data.datas) ? data.datas : [];
          
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

          if (!data.is_next) {
            hasData = false;
          }
          page++;
        }
      }

      // PERBAIKAN FINAL ADA DI SINI:
      const selectedContribsForRecon = allContributions.map(c => {
        const temple = templeStore.temples.find(
          t => t.md_temples_id === c.md_temples_id
        );
        return {
          contribution_id: c.tx_contribution_id,
          contribution_name: c.name,
          temple_name: temple?.name || `Temple ${c.md_temples_id}`,
          share_link: c.file_path,
          privacy_setting: c.privacy_setting,
          category: c.category,
          temple_id: c.md_temples_id,
          user_id: c.user_id, // Kita hanya butuh user_id di sini
        };
      });

      if (user != null) {
        const newRec = await reconStore.addReconstruction(
          label,
          user.id,
          selectedTempleIds
        );
        reconStore.updateReconstructionContributions(
          newRec.reconstruction_id,
          selectedContribsForRecon
        );
        setCreateModalVisible(false);
        setActiveReconstruction(newRec.reconstruction_id);
        setActiveTab('grouping');
      }
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

  const handleTempleSearch = (value: string) => {
    setTemplePage(1);
    setTempleSearchText(value);
  };

  const handleTempleSelect = (id: number) => {
    setSelectedTempleIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
    setShowContribModal(true);
    setPage(1);
    setSelectedContribIds([]);
  };

  const configDisabled = !rec || (rec.groups || []).length === 0 || rec.status !== 'ready';

  return (
    <>
      <div className={styles.reconstructionContainer}>
        <Title level={3} style={{ margin: 0 }}>Reconstruction</Title>
        <Tabs
          activeKey={activeTab}
          onChange={key => setActiveTab(key as '1' | 'grouping' | 'configuration')}
          tabBarStyle={{ marginBottom: 24 }}
        >
          <TabPane tab="Reconstructions" key="1">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Text style={{ marginTop: '4px' }}>Month :</Text>
              <DatePicker value={filterDate} onChange={setFilterDate} allowClear format="MMMM YYYY" picker="month" />
              <Button
                type="default"
                icon={<CloudDownloadOutlined />}
                onClick={handleDownloadAllByDate}
                disabled={reconstructionsToShow.length === 0 || !filterDate}
                style={{ marginLeft: 8 }}
              >
                Download JSON All
              </Button>
              <Button onClick={handleDownloadSelected} disabled={selectedRecons.length === 0}>
                Download JSON Selected ({selectedRecons.length})
              </Button>
              <Button
                type="primary"
                icon={<DeliveredProcedureOutlined />}
                onClick={() => setCreateModalVisible(true)}
                style={{ backgroundColor: "#772d2f", marginLeft: 'auto' }}
              >
                Add Reconstruction
              </Button>
            </div>
            {reconstructionsToShow.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={reconstructionsToShow}
                pagination={{ pageSize: 5, showSizeChanger: false }}
                style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}
                renderItem={rec => {
                  const totalContribs = (rec.groups || []).reduce(
                    (sum, g) => sum + (g.contributions || []).length,
                    0
                  );
                  return (
                    <List.Item
                      key={rec.reconstruction_id}
                      style={{ borderBottom: '1px solid #f0f0f0', padding: '16px' }}
                    >
                      <Checkbox
                        checked={selectedRecons.includes(rec.reconstruction_id)}
                        onChange={() => toggleSelectRecon(rec.reconstruction_id)}
                        style={{ marginRight: 12 }}
                      />
                      <List.Item.Meta
                        title={<Text strong>{rec.label}</Text>}
                        description={
                          <div>
                            <Text type="secondary" style={{ display: 'block' }}>
                              ID: {rec.reconstruction_id}
                            </Text>
                            <Text type="secondary" style={{ display: 'block' }}>
                              Created: {new Date(rec.created_at).toLocaleDateString()}
                            </Text>
                            <Tag color={rec.status === 'ready' ? 'purple' : 'orange'}>
                              Status: {rec.status}
                            </Tag>
                            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                              <StagedContributionsCounter
                                temple_ids={rec.temple_ids || []}
                                groups={rec.groups || []}
                              />
                              {rec.status === 'ready' && (
                                <Tag color="green">
                                  {totalContribs} contributions grouped
                                </Tag>
                              )}
                              <Tag color="orange">
                                {(rec.groups || []).length} groups
                              </Tag>
                            </div>
                          </div>
                        }
                      />
                      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <Button
                          type="link"
                          icon={<CloudDownloadOutlined />}
                          onClick={() => handleDownload(rec)}
                          style={{ color: 'orange' }}
                        >
                          Download JSON
                        </Button>
                        <Button
                          type="dashed"
                          icon={<GroupOutlined />}
                          onClick={() => {
                            setActiveReconstruction(rec.reconstruction_id);
                            setActiveTab('grouping');
                          }}
                        >
                          Group
                        </Button>
                        <Popconfirm
                          title="Yakin mau hapus?"
                          onConfirm={() =>
                            reconStore.removeReconstruction(
                              rec.reconstruction_id,
                              filterDate?.format("YYYYMM")!
                            )
                          }
                          disabled={rec.status === "ready"}
                        >
                          <Button
                            type="link"
                            icon={<DeleteOutlined />}
                            danger
                            disabled={rec.status === "ready"}
                          >
                            Delete
                          </Button>
                        </Popconfirm>
                      </div>
                    </List.Item>
                  )
                }}
              />
            ) : (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    filterDate ?
                    `No reconstructions on ${filterDate.format('MMM YYYY')}` :
                    'Please select a date first'
                  }
                />
              </div>
            )}
          </TabPane>
          <TabPane tab="Group Management" key="grouping">
            {activeReconstruction ? (
              <GroupManagement
                reconstructionId={activeReconstruction}
                filterDate={filterDate}
                onBack={() => {
                  setActiveReconstruction(null);
                  setActiveTab('1');
                }}
                onGoToConfiguration={() => setActiveTab('configuration')}
                reconstructionStatus={rec?.status}
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
                  loading={configs.length === 0}
                >
                  {configs.map((c) => (
                    <Option key={c.key} value={c.key}>
                      {c.value}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleConfigSubmit}
                  style={{ backgroundColor: "#772d2f" }}
                >
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </div>
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
            loading={loadingTemples}
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
              onSearch={handleTempleSearch}
              enterButton
              loading={loadingTemples}
              style={{ marginBottom: 16 }}
            />
            {loadingTemples && templeStore.temples.length === 0 ? (
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
                    debouncedTempleSearchText ?
                    `No temples found for "${debouncedTempleSearchText}"` :
                    "No temples available"
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
                          backgroundColor: selectedTempleIds.includes(temple.md_temples_id) ?
                          '#e6f7ff' :
                          'transparent',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                      >
                        <Checkbox
                          checked={selectedTempleIds.includes(temple.md_temples_id)}
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
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                  <Button
                    disabled={templePage === 1 || templeStore.loading}
                    loading={templeStore.loading}
                    onClick={() => setTemplePage(p => Math.max(1, p - 1))}
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

export default Reconstruction;