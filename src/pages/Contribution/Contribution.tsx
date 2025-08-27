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
} from "antd";
import { SearchOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import type { GetProps } from "antd";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";

import useChartContributionStore from "../../store/useChartContributionStore";
import useTempleStore from "../../store/useTempleStore";

import styles from "./Contribution.module.css";

const { Title } = Typography;
const { Search } = Input;
type SearchProps = GetProps<typeof Input.Search>;

// Struktur single row untuk AntD Table
interface TableRow {
  key: number;
  md_temples_id: number;
  name: string;
  location: string;
  type: string;
  quantity: number;
  nista: number | string;
  madya: number | string;
  utama: number | string;
}

export default function Contribution() {
  // 1. State lokal untuk searchText, controlled pagination, dan data untuk table
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState<TableRow[]>([]);

  // 2. Ambil data & actions dari zustand stores
  const {
    temples,         // array Pura[] dari halaman currentPage
    count,           // total semua temples (untuk pagination.total)
    loading: templeLoading,
    fetchTemples,
  } = useTempleStore();
  const {
    monthlyData,
    monthlyLabels,
    contributorData,
    contributorLabels,
  } = useChartContributionStore();

  // 3. Controlled fetch: setiap currentPage atau searchText berubah
  useEffect(() => {
    // memanggil API page currentPage + filter searchText
    fetchTemples(currentPage, searchText);
  }, [currentPage, searchText, fetchTemples]);

    // Handler ganti halaman: simpan page, fetch dengan searchText terkini
  const onPageChange = (page: number) => {
    setCurrentPage(page);
    fetchTemples(page, searchText);
  };

  // 4. Bangun tableData setiap kali temples berubah atau searchText berubah
  useEffect(() => {
    const rows: TableRow[] = temples
      .map((t) => {
        // Tentukan tipe Pura: “Pura Agung” atau “Pura Pribadi”
        const type = t.temple_type === "Pura Agung" ? "Pura Agung" : "Pura Pribadi";
        const isAgung = type === "Pura Agung";

        return {
          key: t.md_temples_id,
          md_temples_id: t.md_temples_id,
          name: t.name,
          location: t.location_name,
          type,
          quantity: t.total_contributions,
          // contoh data acak untuk nista/madya/utama hanya kalau Pura Agung
          nista: isAgung ? Math.floor(Math.random() * 10) + 1 : "-",
          madya: isAgung ? Math.floor(Math.random() * 15) + 1 : "-",
          utama: isAgung ? Math.floor(Math.random() * 10) + 1 : "-",
        };
      })
      // Filter lagi di client (optional; searchText juga dikirim ke backend)
      .filter((row) => {
        const q = searchText.toLowerCase();
        return (
          row.name.toLowerCase().includes(q) ||
          row.location.toLowerCase().includes(q)
        );
      });

    setTableData(rows);
  }, [temples, searchText]);

  // 5. Handler untuk Search input
  const onSearch: SearchProps["onSearch"] = (value) => {
    setSearchText(value);
    setCurrentPage(1);  // reset ke halaman 1 saat ada search baru
  };

  // 6. Definisi opsi chart (tidak berubah dari implementasi-mu)
  const barOptions = {
    title: { text: "Progress per Month", left: "center" },
    xAxis: { type: "category", data: monthlyLabels },
    yAxis: { type: "value" },
    series: [{ data: monthlyData, type: "bar" }],
    grid: { top: 50, right: 20, bottom: 30, left: 40 },
  };
  const contributorPieData = contributorLabels.map((l, i) => ({
    name: l,
    value: contributorData[i],
  }));
  const pieOptions = {
    title: { text: "Top 5 Contributor Data", left: "center" },
    tooltip: { trigger: "item" },
    legend: { orient: "horizontal", bottom: 0 },
    series: [{ name: "Contributor", type: "pie", radius: "50%", data: contributorPieData }],
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

  // 7. Kolom untuk AntD Table
  const columns = [
    { title: "Nama Pura", dataIndex: "name", key: "name" },
    {
      title: "Lokasi",
      dataIndex: "location",
      key: "location",
      filters: [
        { text: "Karangasem", value: "Karangasem" },
        { text: "Gianyar", value: "Gianyar" },
        { text: "Tabanan", value: "Tabanan" },
      ],
      onFilter: (value: any, record: TableRow) =>
        record.location.includes(value),
    },
    {
      title: "Tipe",
      dataIndex: "type",
      key: "type",
      filters: [
        { text: "Pura Agung", value: "Pura Agung" },
        { text: "Pura Pribadi", value: "Pura Pribadi" },
      ],
      onFilter: (value: any, record: TableRow) =>
        record.type.includes(value),
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      sorter: (a: TableRow, b: TableRow) => a.quantity - b.quantity,
    },
    {
      title: "Nista",
      dataIndex: "nista",
      key: "nista",
      render: (val: number | string, record: TableRow) =>
        val !== "-"
          ? <Link to={`/temples/detail/${record.md_temples_id}`}>{val}</Link>
          : "-",
    },
    {
      title: "Madya",
      dataIndex: "madya",
      key: "madya",
      render: (val: number | string, record: TableRow) =>
        val !== "-"
          ? <Link to={`/temples/detail/${record.md_temples_id}`}>{val}</Link>
          : "-",
    },
    {
      title: "Utama",
      dataIndex: "utama",
      key: "utama",
      render: (val: number | string, record: TableRow) =>
        val !== "-"
          ? <Link to={`/temples/detail/${record.md_temples_id}`}>{val}</Link>
          : "-",
    },
    {
      title: "Detail",
      key: "detail",
      render: (_: any, record: TableRow) => (
        <Link to={`/temples/detail/${record.md_temples_id}`}>
          <ExclamationCircleFilled
            style={{
              color: "#afafaf",
              fontSize: 20,
              cursor: "pointer",
              marginTop: 5,
            }}
          />
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
      {/* Chart section */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Progress per Month">
            <ReactECharts option={barOptions} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Top 5 Contributor Data">
            <ReactECharts option={pieOptions} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Video Approval">
            <ReactECharts option={videoApprovalOptions} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      {/* Table section */}
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
                current: currentPage,   // controlled page
                pageSize: 10,
                total: count,           // total semua temples
                onChange: onPageChange, // manual handler
              }}
            />
          </Card>
        </Col>
      </Row>
    </Layout>
  );
}
