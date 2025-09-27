// src/pages/Contribution.tsx

import { useState, useEffect } from "react";
import {
  Card,
  Col,
  Layout,
  Row,
  Typography,
  Table,
  Input,
  Spin,
} from "antd";
import { SearchOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import type { GetProps } from "antd";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";

// Impor store yang dibutuhkan
import useTempleStore, { Pura } from "../../store/useTempleStore";
import useContributionStore, { Contribution as ContributionType } from "../../store/useContributionStore"; 
import useAuthStore from "../../store/useAuthStore";

import styles from "./Contribution.module.css";

const { Title } = Typography;
const { Search } = Input;
type SearchProps = GetProps<typeof Input.Search>;

// Struktur data untuk tabel
interface TableRow {
  key: number;
  md_temples_id: number;
  name: string;
  location: string;
  type: string;
}

// Interface untuk data chart
interface MonthlySummary {
  labels: string[];
  data: number[];
}
interface PieChartData {
  name: string;
  value: number;
}

export default function Contribution() {
  // --- State Lokal Komponen ---
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  
  // State lokal untuk data chart
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({ labels: [], data: [] });
  const [topTemplesData, setTopTemplesData] = useState<PieChartData[]>([]);
  const [topTemplesLoading, setTopTemplesLoading] = useState(true);

  // State untuk perbaikan pagination
  const [totalCount, setTotalCount] = useState(0);

  // --- Ambil data dari Zustand Stores ---
  const {
    temples,
    count,
    loading: templeLoading,
    fetchTemples,
  } = useTempleStore();

  const { 
    contributions, 
    loading: contributionLoading, 
    fetchContributions 
  } = useContributionStore();

  const token = useAuthStore((state) => state.token);
  const apiUrl = import.meta.env.VITE_API_URL;

  // --- Side Effects (useEffect) ---

  // 1. Fetch data untuk tabel (tidak berubah)
  useEffect(() => {
    fetchTemples(currentPage, searchText);
  }, [currentPage, searchText, fetchTemples]);

  // 2. Fetch data kontribusi untuk chart bulanan (tidak berubah)
  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  // 3. PERBAIKAN TOTAL: Ambil SEMUA data Pura secara BERURUTAN halaman per halaman
  useEffect(() => {
    const fetchAllTemplesSequentially = async () => {
      if (!token) {
        setTopTemplesLoading(false);
        return;
      }

      setTopTemplesLoading(true);
      try {
        const allTemples: Pura[] = [];
        let page = 1;
        let hasMorePages = true;

        // Terus panggil API selama 'is_next' bernilai true
        while (hasMorePages) {
          const response = await fetch(`${apiUrl}/private/temples?page=${page}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            hasMorePages = false; // Hentikan loop jika ada error
            throw new Error(`Gagal mengambil data Pura di halaman ${page}`);
          }

          const data = await response.json();
          if (data.datas && data.datas.length > 0) {
            allTemples.push(...data.datas);
          }
          
          // Kondisi berhenti: jika API bilang tidak ada halaman selanjutnya
          hasMorePages = data.is_next || false;
          page++;
        }

        // Setelah semua data terkumpul, saring dan urutkan
        const top5Temples = allTemples
          // LANGKAH PENTING: Saring dulu Pura yang memiliki kontribusi > 0
          .filter(temple => temple.total_contributions > 0)
          .sort((a, b) => b.total_contributions - a.total_contributions)
          .slice(0, 5)
          .map(temple => ({
            name: temple.name,
            value: temple.total_contributions,
          }));
        
        setTopTemplesData(top5Temples);

      } catch (error) {
        console.error("Gagal mengambil dan memproses semua data Pura:", error);
        setTopTemplesData([]);
      } finally {
        setTopTemplesLoading(false);
      }
    };

    fetchAllTemplesSequentially();
  }, [token, apiUrl]);


  // 4. Proses data kontribusi untuk chart bulanan (tidak berubah)
  useEffect(() => {
    if (contributions && contributions.length > 0) {
      const monthlyCounts: { [key: string]: number } = {};
      contributions.forEach((c: ContributionType) => {
        const date = new Date(c.created_at);
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
      });
      const sortedMonths = Object.keys(monthlyCounts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      setMonthlySummary({
        labels: sortedMonths,
        data: sortedMonths.map(month => monthlyCounts[month])
      });
    }
  }, [contributions]);

  // 5. & 6. Logika untuk pagination dan tabel (tidak berubah)
  useEffect(() => {
    if (currentPage === 1 || count > totalCount) {
      setTotalCount(count);
    }
  }, [count, currentPage, totalCount]);
  
  useEffect(() => {
    const rows: TableRow[] = temples.map((t) => ({
      key: t.md_temples_id,
      md_temples_id: t.md_temples_id,
      name: t.name,
      location: t.location_name,
      type: t.temple_type === "Pura Agung" ? "Pura Agung" : "Pura Pribadi",
    }));
    setTableData(rows);
  }, [temples]);


  // --- Handlers ---
  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  const onSearch: SearchProps["onSearch"] = (value) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // --- Konfigurasi Chart & Tabel ---
  const barOptions = {
    title: { text: "Progress per Month", left: "center" },
    xAxis: { type: "category", data: monthlySummary.labels },
    yAxis: { type: "value" },
    series: [{ data: monthlySummary.data, type: "bar", color: '#772d2f' }],
    grid: { top: 50, right: 20, bottom: 30, left: 40 },
    tooltip: { trigger: 'axis' }
  };
  const pieOptions = {
    title: { text: "Top 5 Temples by Contribution", left: "center" },
    tooltip: { trigger: "item", formatter: "{a} <br/>{b} : {c} ({d}%)" },
    legend: { orient: "horizontal", bottom: 0 },
    series: [{ name: "Contributions", type: "pie", radius: "50%", data: topTemplesData }],
  };
  const videoApprovalOptions = {
    title: { text: "Video Approval", left: "center", top: 0 },
    tooltip: { trigger: "axis" },
    legend: { data: ["Approved", "Not Approved"], top: 30 },
    xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
    yAxis: { type: "value" },
    series: [
      { name: "Approved", type: "bar", data: [40, 60, 80, 100, 90, 110], barGap: 0 },
      { name: "Not Approved", type: "bar", data: [10, 15, 25, 30, 20, 25] },
    ],
    grid: { top: 70, right: 20, bottom: 30, left: 40 },
  };

  const columns = [
    { title: "Nama Pura", dataIndex: "name", key: "name" },
    { title: "Lokasi", dataIndex: "location", key: "location" },
    { title: "Tipe", dataIndex: "type", key: "type" },
    {
      title: "Detail",
      key: "detail",
      render: (_: any, record: TableRow) => (
        <Link to={`/temples/detail/${record.md_temples_id}`}>
          <ExclamationCircleFilled style={{ color: "#afafaf", fontSize: 20 }} />
        </Link>
      ),
    },
  ];

  return (
    <Layout className={styles.contributionContainer}>
      <Row gutter={[48, 48]} style={{marginBottom:19}}>
        <Col xs={24} md={12}>
          <Title level={2} className={styles.sectionTitle}>Temples</Title>
          <Title level={5} className={styles.sectionSubtitle}>You can see the latest data</Title>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Progress per Month">
            {contributionLoading ? <div style={{height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><Spin /></div> : <ReactECharts option={barOptions} style={{ height: 300 }} />}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Top 5 Temples by Contribution">
            {topTemplesLoading ? <div style={{height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><Spin /></div> : <ReactECharts option={pieOptions} style={{ height: 300 }} />}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Video Approval">
            <ReactECharts option={videoApprovalOptions} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 32 }}>
        <Col span={24}>
          <Card>
            <Row justify="end" style={{ marginBottom: 16 }}>
              <Col>
                <Search
                  placeholder="Search by name or location..."
                  onSearch={onSearch}
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                />
              </Col>
            </Row>

            <Table<TableRow>
              columns={columns}
              dataSource={tableData}
              loading={templeLoading}
              pagination={{
                current: currentPage,
                pageSize: 10,
                total: totalCount, 
                onChange: onPageChange,
              }}
            />
          </Card>
        </Col>
      </Row>
    </Layout>
  );
}