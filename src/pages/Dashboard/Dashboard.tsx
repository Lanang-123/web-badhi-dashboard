// src/pages/Dashboard.tsx

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Layout, Row, Col, List, Card, Typography, Spin,
  Alert, Button, Modal, Statistic, Tabs, Image, Tag, Divider,
  DatePicker, Popover
} from "antd";
import ReactECharts from "echarts-for-react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import {
  HomeOutlined, UserOutlined, FileDoneOutlined, TeamOutlined,
  BarChartOutlined, ArrowRightOutlined, InfoCircleOutlined, LineChartOutlined,
  FilterOutlined
} from "@ant-design/icons";
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import L from 'leaflet';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

// Stores & Data
import { baliRegionsGeo } from "../../data/map";
import useDashboardStore, { Pura } from "../../store/useDashboardStore";
import useReconstructionStore from "../../store/useReconstructionStore";
import useContributionStore, { Contribution } from "../../store/useContributionStore";
import useAuthStore from "../../store/useAuthStore";

// Styling & Komponen
import styles from "./Dashboard.module.css";
import "leaflet/dist/leaflet.css";
import MarkIcon from "../../components/MarkIcon";

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const apiUrl = import.meta.env.VITE_API_URL;

const regionsGeo = baliRegionsGeo as unknown as GeoJSON.FeatureCollection<Polygon | MultiPolygon>;

// Komponen Helper: SpiderChart (TIDAK ADA PERUBAHAN)
const SpiderChart: React.FC<{ contributions: Contribution[] }> = ({ contributions }) => {
  if (!contributions || contributions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">No contribution data to display analytics.</Text>
      </div>
    );
  }
  const chartData = useMemo(() => {
    const totalContributions = contributions.length;
    if (totalContributions === 0) return { indicators: [], values: [] };
    const completeDataCount = contributions.filter(c => c.description && c.description.length > 10).length;
    const completenessRatio = Math.round((completeDataCount / totalContributions) * 100);
    const publicCount = contributions.filter(c => c.license_type === 1).length;
    const publicRatio = Math.round((publicCount / totalContributions) * 100);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = contributions.filter(c => new Date(c.created_at) > thirtyDaysAgo).length;
    const RECENT_TARGET = 10;
    const recentActivityScore = Math.min(Math.round((recentCount / RECENT_TARGET) * 100), 100);
    const nistaCount = contributions.filter(c => c.level_area === 'nista').length;
    const madyaCount = contributions.filter(c => c.level_area === 'madya').length;
    const utamaCount = contributions.filter(c => c.level_area === 'utama').length;
    const nistaDistribution = Math.round((nistaCount / totalContributions) * 100);
    const madyaDistribution = Math.round((madyaCount / totalContributions) * 100);
    const utamaDistribution = Math.round((utamaCount / totalContributions) * 100);
    return {
      indicators: [
        { name: 'Kelengkapan Data', max: 100 }, { name: 'Distribusi Nista', max: 100 },
        { name: 'Distribusi Madya', max: 100 }, { name: 'Distribusi Utama', max: 100 },
        { name: 'Aktivitas Terbaru', max: 100 }, { name: 'Keterbukaan Publik', max: 100 },
      ],
      values: [completenessRatio, nistaDistribution, madyaDistribution, utamaDistribution, recentActivityScore, publicRatio],
    };
  }, [contributions]);
  if (!chartData || chartData.values.length === 0) {
     return <div style={{ textAlign: 'center', padding: '50px' }}><Text type="secondary">Insufficient data for analytics profile.</Text></div>;
  }
  const option = {
    radar: {
      indicator: chartData.indicators, shape: 'circle', splitNumber: 5,
      axisName: { color: 'rgb(55, 65, 81)', fontSize: 12, formatter: (value: string) => value.replace(' ', '\n') },
      splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.1)' } },
      splitArea: { show: false }, axisLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.2)' } }
    },
    series: [{
      name: 'Profil Kontribusi', type: 'radar',
      data: [{
        value: chartData.values, name: 'Analitik', symbol: 'circle', symbolSize: 8,
        lineStyle: { color: '#772d2f', width: 2 }, itemStyle: { color: '#772d2f' },
        areaStyle: { color: 'rgba(119, 45, 47, 0.4)' }
      }]
    }],
    tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
            let tooltipText = `<b>${params.name}</b><br/>`;
            chartData.indicators.forEach((indicator, index) => {
                tooltipText += `${indicator.name}: ${params.value[index]}%<br/>`;
            });
            return tooltipText;
        }
    }
  };
  return <ReactECharts option={option} style={{ height: 350, marginTop: 20 }} />;
};

// Komponen Helper: AreaDistributionChart (TIDAK ADA PERUBAHAN)
const AreaDistributionChart: React.FC<{ data: { [key: string]: number } }> = ({ data }) => {
    const chartData = Object.entries(data).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value
    })).filter(item => item.value > 0);
    if (chartData.length === 0) {
        return <div style={{textAlign: 'center', padding: '50px'}}><Text type="secondary">No distribution data available.</Text></div>;
    }
    const option = {
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { top: 'bottom', left: 'center' },
        series: [{
            name: 'Area Distribution', type: 'pie', radius: ['40%', '70%'],
            avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
            labelLine: { show: false }, data: chartData,
        }],
    };
    return <ReactECharts option={option} style={{ height: 300 }} />;
};

// ===================================================================================
// KOMPONEN UTAMA: DASHBOARD
// ===================================================================================
const Dashboard: React.FC = () => {
  // ++ UBAH: Ambil 'users' (diubah nama menjadi userCount) dan 'fetchTotalUsers' dari store
  const { puraList, regions, fetchTemples, users: userCount, fetchTotalUsers } = useDashboardStore();
  const { contributions: allContributions, fetchContributions } = useContributionStore();
  const allReconstructions = useReconstructionStore(state => state.reconstructions);

  // State internal komponen (tidak ada perubahan)
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTemple, setSelectedTemple] = useState<Pura | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("Buleleng");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [tempDateRange, setTempDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true); 
      setError(null);
      try {
        // ++ UBAH: Tambahkan 'fetchTotalUsers()' untuk dipanggil saat komponen dimuat
        await Promise.all([
          fetchTemples(),
          fetchContributions(),
          fetchTotalUsers(), // <-- TAMBAHKAN PEMANGGILAN INI
          useDashboardStore.getState().fetchContributions()
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, [fetchTemples, fetchContributions, fetchTotalUsers]); // ++ UBAH: Tambahkan fetchTotalUsers sebagai dependency

  // Memo untuk filter data berdasarkan rentang tanggal (tidak ada perubahan)
  const filteredData = useMemo(() => {
    if (!dateRange) {
      return {
        contributions: allContributions,
        reconstructions: allReconstructions,
        activeTemples: new Set(puraList.map(p => p.md_temples_id)),
        activeUsers: new Set(allContributions.map(c => c.user_id))
      };
    }
    const [startDate, endDate] = dateRange;
    const filteredContributions = allContributions.filter(c =>
      dayjs(c.created_at).isBetween(startDate, endDate, null, '[]')
    );
    const filteredReconstructions = allReconstructions.filter(r =>
      r.created_at && dayjs(r.created_at).isBetween(startDate, endDate, null, '[]')
    );
    const activeTemples = new Set(filteredContributions.map(c => c.md_temples_id));
    const activeUsers = new Set(filteredContributions.map(c => c.user_id));
    return {
      contributions: filteredContributions,
      reconstructions: filteredReconstructions,
      activeTemples,
      activeUsers
    };
  }, [dateRange, allContributions, allReconstructions, puraList]);

  // Kalkulasi statistik (tidak ada perubahan signifikan)
  const templeCount = dateRange ? filteredData.activeTemples.size : puraList.length;
  const contributionCount = filteredData.contributions.length;
  const reconstructionCount = filteredData.reconstructions.length;
  // ++ HAPUS: Baris 'const userCount = 0;' tidak lagi diperlukan
  // Nilai 'userCount' sekarang datang langsung dari 'useDashboardStore'.

  // useEffect untuk memuat data analitik modal (tidak ada perubahan)
  useEffect(() => {
    if (selectedTemple && isModalVisible) {
      const fetchAndProcessAnalytics = async () => {
        setIsModalLoading(true); setAnalyticsData(null);
        const token = useAuthStore.getState().token;
        const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        try {
          let contributionsForModal: any[] = []; let page = 1; let hasNextPage = true;
          while (hasNextPage) {
            const res = await fetch(`${apiUrl}/private/contributions/list/${selectedTemple.md_temples_id}?page=${page}`, { headers });
            if (!res.ok) { hasNextPage = false; continue; }
            const data = await res.json();
            if (data.datas && data.datas.length > 0) { contributionsForModal.push(...data.datas); }
            hasNextPage = data.is_next === true; page++;
          }
          const finalContributionsForModal = dateRange
            ? contributionsForModal.filter(c => dayjs(c.created_at).isBetween(dateRange[0], dateRange[1], null, '[]'))
            : contributionsForModal;
          const areaCounts = { nista: 0, madya: 0, utama: 0, other: 0 };
          const userIds = new Set();
          finalContributionsForModal.forEach(c => {
            const area = c.level_area || 'other';
            if (area in areaCounts) { areaCounts[area as keyof typeof areaCounts]++; } else { areaCounts.other++; }
            userIds.add(c.user_id);
          });
          setAnalyticsData({
            total: finalContributionsForModal.length, areaCounts,
            uniqueUsers: userIds.size, allContributions: finalContributionsForModal,
          });
        } catch (err) { console.error("Failed to fetch analytics data", err); }
        finally { setIsModalLoading(false); }
      };
      fetchAndProcessAnalytics();
    }
  }, [selectedTemple, isModalVisible, dateRange]);

  // Handler dan data untuk peta dan chart (tidak ada perubahan)
  const handleMarkerClick = (pura: Pura) => { setSelectedTemple(pura); setIsModalVisible(true); };
  const handleModalClose = () => { setIsModalVisible(false); setSelectedTemple(null); setAnalyticsData(null); };
  const regionFeature = selectedRegion ? regionsGeo.features.find(f => f.properties?.name === selectedRegion) ?? null : null;
  const markers = regionFeature ? puraList.filter((p) => {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
    const pt = point([p.lng, p.lat]);
    return booleanPointInPolygon(pt, regionFeature as Feature<Polygon | MultiPolygon>);
  }) : puraList;

  const contributionChartData = useMemo(() => {
    if (filteredData.contributions.length === 0 || puraList.length === 0) {
      return { labels: [], data: [] };
    }
    const validTempleIds = new Set(puraList.map(p => p.md_temples_id));
    const validContributions = filteredData.contributions.filter(c =>
      validTempleIds.has(c.md_temples_id)
    );
    const contributionCounts = validContributions.reduce((acc, curr) => {
      acc[curr.md_temples_id] = (acc[curr.md_temples_id] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });
    const sortedActiveTemples = Object.entries(contributionCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);
    const labels = sortedActiveTemples.map(([templeId]) => {
      const temple = puraList.find(p => p.md_temples_id === Number(templeId))!;
      return temple.name;
    });
    const data = sortedActiveTemples.map(([, count]) => count);
    return { labels, data };
  }, [puraList, filteredData.contributions]);

  const chartOptions = {
    title: {
      text: 'Top 5 Pura Paling Aktif',
      subtext: dateRange ? `Periode: ${dateRange[0].format('DD MMM YYYY')} - ${dateRange[1].format('DD MMM YYYY')}` : 'Semua Waktu',
      left: "center", top: 10, textStyle: { fontSize: 16 }
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: "category", data: contributionChartData.labels,
      axisLabel: {
        interval: 0, rotate: 15,
        formatter: (value: string) => value.length > 10 ? `${value.substring(0, 10)}...` : value,
      }
    },
    yAxis: { type: "value", name: 'Total Kontribusi' },
    series: [{
      name: 'Jumlah Kontribusi', data: contributionChartData.data,
      type: "bar", color: '#772d2f', barWidth: '60%',
      showBackground: true, backgroundStyle: { color: 'rgba(180, 180, 180, 0.2)' }
    }],
    grid: { top: 80, right: 20, bottom: 50, left: 50 },
  };
  
  // Handler untuk filter tanggal (tidak ada perubahan)
  const handleApplyFilter = () => {
    setDateRange(tempDateRange);
    setIsFilterOpen(false);
  };
  const handleResetFilter = () => {
    setDateRange(null);
    setTempDateRange(null);
    setIsFilterOpen(false);
  };
  
  const filterContent = (
    <div style={{ width: 280 }}>
      <Text strong>Pilih Rentang Tanggal</Text>
      <RangePicker
        style={{ width: '100%', marginTop: 8 }}
        value={tempDateRange}
        onChange={(dates) => setTempDateRange(dates as [Dayjs, Dayjs])}
      />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleResetFilter}>Reset</Button>
        <Button type="primary" onClick={handleApplyFilter}>Terapkan</Button>
      </div>
    </div>
  );

  // Kondisi loading dan error (tidak ada perubahan)
  if (isLoading) { return <Layout className={styles.dashboardContainer}><Spin size="large" fullscreen /></Layout>; }
  if (error) { return ( <Layout className={styles.dashboardContainer}> <Alert message="Error" description={error} type="error" showIcon style={{ margin: 20 }}/> <Button onClick={() => window.location.reload()}>Reload Page</Button> </Layout> ); }

  // Render JSX (tidak ada perubahan logika, hanya nilai `userCount` yang sekarang dinamis)
  return (
    <Layout className={styles.dashboardContainer}>
      <Row gutter={[48, 16]} align="middle">
        <Col xs={24} md={12}>
          <Title level={2} className={styles.sectionTitle}>Statistic</Title>
          <Title level={5} className={styles.sectionSubtitle}>You can see the latest data</Title>
        </Col>
        <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Popover
            content={filterContent}
            title="Filter Data"
            trigger="click"
            open={isFilterOpen}
            onOpenChange={(visible) => setIsFilterOpen(visible)}
            placement="bottomRight"
          >
            <Button type={dateRange ? "primary" : "default"} icon={<FilterOutlined />}>
              Filter Tanggal
            </Button>
          </Popover>
        </Col>
      </Row>
      <Row gutter={[48, 48]} style={{ marginTop: 20 }}>
        <Col xs={24} md={12}>
          <Row gutter={[48, 48]}>
            <Col xs={24} sm={12}>
              <div className={styles.statisticCard} style={{ paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#e3fcef' }}><HomeOutlined style={{ fontSize: 24 }} /></div>
                <div className={styles.statNumber}>{templeCount}</div>
                <div className={styles.categoryText}>{dateRange ? 'Active Temples' : 'Temples'}</div>
              </div>
              <div className={styles.statisticCard} style={{ marginTop: 20, paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#e3f4fc' }}><FileDoneOutlined style={{ fontSize: 24 }} /></div>
                <div className={styles.statNumber}>{contributionCount}</div>
                <div className={styles.categoryText}>Contributions</div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.statisticCard} style={{ paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#fde9ef' }}><UserOutlined style={{ fontSize: 24 }} /></div>
                {/* ++ NILAI INI SEKARANG DIAMBIL DARI STORE, BUKAN 0 LAGI ++ */}
                <div className={styles.statNumber}>{userCount}</div>
                <div className={styles.categoryText}>Users</div>
              </div>
              <div className={styles.statisticCard} style={{ marginTop: 20, paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#e8fdfb' }}><FileDoneOutlined style={{ fontSize: 24 }} /></div>
                <div className={styles.statNumber}>{reconstructionCount}</div>
                <div className={styles.categoryText}>Reconstructions</div>
              </div>
            </Col>
          </Row>
        </Col>
        <Col xs={24} md={12}>
            <Card style={{ boxShadow: '0px 4px 8px rgba(0,0,0,0.2)' }}>
                <ReactECharts option={chartOptions} style={{ height: 350 }} />
            </Card>
        </Col>
      </Row>
      <Row gutter={[48, 48]} style={{ marginTop: 42 }}>
        <Col xs={24} md={6}>
          <Card className={styles.regionsList}>
            <Title level={3} className={styles.titleRegion}>REGIONS</Title> <div style={{ width: 100, height: 3, backgroundColor: '#772d2f', margin: '0 0 20px 10px' }} />
            <List dataSource={regions} renderItem={region => ( <List.Item onClick={() => setSelectedRegion(region)} className={styles.regionItems} style={{ backgroundColor: selectedRegion === region ? '#f0f2f5' : 'white', fontWeight: selectedRegion === region ? 'bold' : 'normal' }}> <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}> <span style={{ visibility: selectedRegion === region ? 'visible' : 'hidden' }}><MarkIcon /></span>{region} </div> </List.Item> )} />
          </Card>
        </Col>
        <Col xs={24} md={18}>
          <div className={styles.mapContainer}>
            <MapContainer center={[-8.4095, 115.1889]} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' />
              {markers.map(t => (
                <Marker key={t.md_temples_id} position={[t.lat, t.lng]} eventHandlers={{ click: () => handleMarkerClick(t) }} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png', iconSize: [30, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], })}>
                  <Tooltip>
                    <div className={styles.tooltipCard}>
                      {t.file_path && <img src={t.file_path} alt={t.name} className={styles.tooltipImage} />}
                      <div className={styles.tooltipContent}>
                        <Title level={5} className={styles.tooltipTitle}>{t.name}</Title>
                        <Text type="secondary" className={styles.tooltipLocation}>{t.region}</Text>
                        <Text className={styles.tooltipDescription}>{t.description}</Text>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Col>
      </Row>
      <Modal
        title={<Title level={4}>Pura {selectedTemple?.name}</Title>}
        open={isModalVisible}
        onCancel={handleModalClose}
        width={900}
        footer={
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '10px', textAlign: 'right' }}>
                <Button key="back" onClick={handleModalClose}>Close</Button>
                <Button key="submit" type="primary" style={{ backgroundColor: '#772d2f', borderColor: '#772d2f', marginLeft: '8px' }}>
                    <Link to={`/temples/detail/${selectedTemple?.md_temples_id}`}>View Contributions <ArrowRightOutlined /></Link>
                </Button>
            </div>
        }
      >
        {isModalLoading && <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" /></div>}
        {!isModalLoading && selectedTemple && (
          <Tabs defaultActiveKey="1">
            <TabPane tab={<span><InfoCircleOutlined /> Detail Pura</span>} key="1">
                <Row gutter={[32, 24]}>
                    <Col xs={24} md={8}>
                        <Image width="100%" src={selectedTemple.file_path ? `${selectedTemple.file_path}/preview` : 'https://via.placeholder.com/300x200?text=No+Image'} alt={selectedTemple.name} style={{ borderRadius: '8px' }}/>
                    </Col>
                    <Col xs={24} md={16}>
                        <Title level={5}>{selectedTemple.name}</Title>
                        <Tag color="blue">{selectedTemple.temple_type}</Tag>
                        <Tag color="green">{selectedTemple.location_name}</Tag>
                        <Divider />
                        <Paragraph ellipsis={{ rows: 5, expandable: true, symbol: 'more' }}>
                            {selectedTemple.description || "No description available."}
                        </Paragraph>
                    </Col>
                </Row>
            </TabPane>
            <TabPane tab={<span><LineChartOutlined /> Analitik Kontribusi</span>} key="2">
                {analyticsData && analyticsData.total > 0 ? (
                    <Row gutter={[32, 32]}>
                        <Col span={24}>
                            <Row gutter={16} justify="center">
                                <Col xs={24} sm={12} md={8}>
                                    <Card bordered={false}><Statistic title="Total Contributions" value={analyticsData.total} prefix={<BarChartOutlined />} /></Card>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Card bordered={false}><Statistic title="Unique Contributors" value={analyticsData.uniqueUsers} prefix={<TeamOutlined />} /></Card>
                                </Col>
                            </Row>
                        </Col>
                        <Col xs={24} md={10}>
                            <Card title="Area Distribution (Quantity)" bordered={false}>
                                <AreaDistributionChart data={analyticsData.areaCounts} />
                            </Card>
                        </Col>
                        <Col xs={24} md={14}>
                            <Card title="Contribution Profile" bordered={false}>
                                <SpiderChart contributions={analyticsData.allContributions} />
                            </Card>
                        </Col>
                    </Row>
                ) : (
                    <div style={{textAlign: 'center', padding: '50px'}}><Text type="secondary">No contribution data found for this temple.</Text></div>
                )}
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </Layout>
  );
};

export default Dashboard;