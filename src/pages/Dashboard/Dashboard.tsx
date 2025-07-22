// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { Layout, Row, Col, List, Card, Typography, Spin, Alert, Button } from "antd";
import ReactECharts from "echarts-for-react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import { HomeOutlined, UserOutlined, FileDoneOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import L from 'leaflet';

import { rawRegionsGeo } from "../../data/map";
import useTempleStore from "../../store/useTempleStore";
import useContributionStore from "../../store/useContributionStore";
import useAuthStore from '../../store/useAuthStore';
import useReconstructionStore from '../../store/useReconstructionStore';
import styles from "./Dashboard.module.css";
import "leaflet/dist/leaflet.css";
import MarkIcon from "../../components/MarkIcon";

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

const { Title } = Typography;

const regionsGeo = rawRegionsGeo as unknown as GeoJSON.FeatureCollection<GeoJSON.Polygon>;

// Fungsi untuk mendapatkan warna berdasarkan nama region
const getRegionColor = (regionName: string) => {
  const colors: Record<string, string> = {
    "Buleleng": "#772d2f",  // Warna merah tua untuk highlight
    "Gianyar": "#36b9cc",
    "Karangasem": "#1cc88a",
    "Klungkung": "#4e73df",
    "Tabanan": "#f6c23e",
    "Jembrana": "#e74a3b",
    "Bangli": "#858796",
    "Badung": "#5a5c69",
    "Denpasar": "#f8f9fc"
  };
  return colors[regionName] || "#6c757d";
};

// Style untuk GeoJSON
const regionStyle = (feature: any) => {
  return {
    fillColor: getRegionColor(feature.properties.name),
    weight: 1,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.5
  };
};

// Style untuk region yang dipilih
const highlightStyle = {
  weight: 3,
  color: "#ff0000",
  dashArray: "",
  fillOpacity: 0.7
};

const Dashboard: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalReconstructions, setTotalReconstructions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // Ambil token dari auth store
  const token = useAuthStore(state => state.token);
  // Gunakan store terpisah
  const { 
    temples: puraList, 
    count: templeCount, 
    loading: templeLoading, 
    error: templeError,
    fetchTemples 
  } = useTempleStore();
  
  const { 
    count: contributionCount, 
    loading: contributionLoading, 
    error: contributionError,
    fetchContributions 
  } = useContributionStore();
  
  // Set region default ke "Buleleng"
  const [selectedRegion, setSelectedRegion] = useState<string>("Buleleng");

  // Fetch tambahan data saat komponen dimount
  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!token) return;
      
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch semua user
        // const usersRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
        //   headers: {
        //     Authorization: `Bearer ${token}`
        //   }
        // });
        
        // if (!usersRes.ok) throw new Error('Failed to fetch users');
        
        // const usersData = await usersRes.json();
        // const allUsers = usersData.datas; // Asumsi response memiliki array 'datas'
        // setTotalUsers(allUsers.length);

        // 2. Fetch semua reconstruction
        const recRes = await fetch(`${import.meta.env.VITE_API_URL}/reconstructions`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!recRes.ok) throw new Error('Failed to fetch reconstructions');
        
        const recData = await recRes.json();
        const allReconstructions = recData.datas; // Asumsi response memiliki array 'datas'
        setTotalReconstructions(allReconstructions.length);

      } catch (err) {
        console.log(err);
        
      } finally {
        setLoading(false);
      }
    };

    fetchAdditionalData();
  }, [token]);
  
  // Statis data untuk demo
  const users = 0;
  const onReview = 0;
  const regions = [
    "Buleleng", "Gianyar", "Karangasem", "Klungkung",
    "Tabanan", "Jembrana", "Bangli", "Badung", "Denpasar"
  ];

  useEffect(() => {
    fetchTemples(1,'');
    fetchContributions();
  }, [fetchTemples, fetchContributions]);

  // Ambil fitur GeoJSON sesuai region
  const regionFeature: GeoJSON.Feature<GeoJSON.Polygon> | null = selectedRegion
    ? (regionsGeo.features as GeoJSON.Feature<GeoJSON.Polygon>[]).find(
        (f) => f.properties?.name === selectedRegion
      ) ?? null
    : null;

  // Filter spasial: hanya pura dalam polygon region
  const markers = regionFeature
    ? puraList.filter((p) => {
        const pt = point([p.lng, p.lat]);
        return booleanPointInPolygon(pt, regionFeature as any);
      })
    : puraList;

  // Chart options
  const chartOptions = {
    title: {
      text: `${templeCount} Temples Registered`,
      left: "center",
      top: 10,
      textStyle: { fontSize: 16 },
    },
    xAxis: { 
      type: "category", 
      data: ["Pratima", "Pelaba Pura", "Pralingga", "Wong Samar", "Palinggih"] 
    },
    yAxis: { type: "value" },
    series: [{ data: [120, 200, 150, 80, 70], type: "bar" }],
    grid: { top: 50, right: 20, bottom: 30, left: 40 },
  };

  // Tampilkan loading jika ada proses fetch
  if (templeLoading || contributionLoading) {
    return (
      <Layout className={styles.dashboardContainer}>
        <Spin size="large" fullscreen />
      </Layout>
    );
  }

  // Tampilkan error jika ada masalah
  if (templeError || contributionError) {
    return (
      <Layout className={styles.dashboardContainer}>
        <Alert
          message="Error"
          description={templeError || contributionError}
          type="error"
          showIcon
          style={{ margin: 20 }}
        />
        <Button onClick={() => {
          if (templeError) fetchTemples(1,'');
          if (contributionError) fetchContributions();
        }}>
          Retry
        </Button>
      </Layout>
    );
  }

  // Fungsi untuk event handling pada GeoJSON
  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle(highlightStyle);
      },
      mouseout: (e: any) => {
        const layer = e.target;
        layer.setStyle(regionStyle(feature));
      },
      click: (e: any) => {
        setSelectedRegion(feature.properties.name);
      }
    });
  };

  return (
    <Layout className={styles.dashboardContainer}>
      {/* Statistik */}
      <Row gutter={[48, 48]}>
        <Col xs={24} md={12}>
          <Title level={2} className={styles.sectionTitle}>Statistic</Title>
          <Title level={5} className={styles.sectionSubtitle}>You can see the latest data</Title>
        </Col>
        <Col xs={24} md={12}>
          <Title level={2} className={styles.sectionTitle}>Temples Contribution Statistic</Title>
          <Title level={5} className={styles.sectionSubtitle}>Data change overtime</Title>
        </Col>
      </Row>

      {/* Cards & Chart */}
      <Row gutter={[48, 48]} style={{ marginTop: 20 }}>
        <Col xs={24} md={12}>
          <Row gutter={[48, 48]}>
            <Col xs={24} sm={12}>
              <div className={styles.statisticCard} style={{ paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#e3fcef' }}>
                  <HomeOutlined style={{ fontSize: 24 }} />
                </div>
                <div className={styles.statNumber}>{templeCount}</div>
                <div className={styles.categoryText}>Temples</div>
              </div>
              <div className={styles.statisticCard} style={{ marginTop: 20, paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#e3f4fc' }}>
                  <FileDoneOutlined style={{ fontSize: 24 }} />
                </div>
                <div className={styles.statNumber}>{contributionCount}</div>
                <div className={styles.categoryText}>Contributions</div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.statisticCard} style={{ paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#fde9ef' }}>
                  <UserOutlined style={{ fontSize: 24 }} />
                </div>
                <div className={styles.statNumber}>{users}</div>
                <div className={styles.categoryText}>Users</div>
              </div>
              <div className={styles.statisticCard} style={{ marginTop: 20, paddingLeft: 20 }}>
                <div className={styles.cardContent} style={{ backgroundColor: '#e8fdfb' }}>
                  <FileDoneOutlined style={{ fontSize: 24 }} />
                </div>
                <div className={styles.statNumber}>{totalReconstructions}</div>
                <div className={styles.categoryText}>Reconstructions</div>
              </div>
            </Col>
          </Row>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ boxShadow: '0px 4px 8px rgba(0,0,0,0.2)' }}>
            <ReactECharts option={chartOptions} style={{ height: 285 }} />
          </Card>
        </Col>
      </Row>

      {/* Regions & Map */}
      <Row gutter={[48, 48]} style={{ marginTop: 42 }}>
        <Col xs={24} md={6}>
          <Card className={styles.regionsList}>
            <Title level={3} className={styles.titleRegion}>REGIONS</Title>
            <div style={{ width: 100, height: 3, backgroundColor: '#772d2f', margin: '0 0 20px 10px' }} />
            <List
              dataSource={regions}
              renderItem={region => (
                <List.Item 
                  onClick={() => setSelectedRegion(region)} 
                  className={styles.regionItems}
                  style={{
                    backgroundColor: selectedRegion === region ? '#f0f2f5' : 'white',
                    fontWeight: selectedRegion === region ? 'bold' : 'normal'
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ visibility: selectedRegion === region ? 'visible' : 'hidden' }}>
                        <MarkIcon />
                      </span>
                    {region}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={18}>
          <div className={styles.mapContainer}>
            <MapContainer
              center={[-8.4095, 115.1889]} // Pusat Bali
              zoom={9}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
              
              {/* Tambahkan layer GeoJSON untuk peta Bali */}
              <GeoJSON
                data={regionsGeo}
                style={regionStyle}
                onEachFeature={onEachFeature}
              />
              
              {/* Highlight region yang dipilih */}
              {regionFeature && (
                <GeoJSON
                  key={selectedRegion}
                  data={regionFeature}
                  style={{
                    fillColor: '#772d2f',
                    weight: 3,
                    color: '#ff0000',
                    fillOpacity: 0.7
                  }}
                />
              )}
              
              {/* Marker untuk pura */}
              {markers.map(t => (
                <Marker 
                  key={t.md_temples_id} 
                  position={[t.lat, t.lng]}
                  icon={L.icon({
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                  })}
                >
                  <Popup>
                    <strong>{t.name}</strong><br />
                    {t.region}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Col>
      </Row>
    </Layout>
  );
};

export default Dashboard;