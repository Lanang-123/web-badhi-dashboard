import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Layout,
  Row,
  Typography,
  Table,
  Input,
  Tag,
  Select,
  DatePicker,
  Dropdown,
  Menu
} from "antd";
import { MoreOutlined } from "@ant-design/icons";
import styles from './RequestTemple.module.css';
import useTempleStore from "../../store/useTempleStore";
import type { Pura as PuraType } from "../../store/useTempleStore";
import PuraImg from "../../assets/images/thumbnailPura.png";

// 1. Import dayjs dan plugin
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";

// 2. Extend plugin
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Tipe data (sesuaikan dengan store Anda)
type TempleStatus = 'Pending' | 'Approved' | 'Rejected';

interface Temple {
  id: number;
  name: string;
  location: string;
  description: string;
  image: string;      // URL
  dateAdded: string;  // Contoh: "February 25, 2025"
  status: TempleStatus;
}

function RequestTemple() {
  const { temples, setTemples } = useTempleStore();

  // State filter
  const [nameFilter, setNameFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [dateRangeFilter, setDateRangeFilter] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [filteredData, setFilteredData] = useState<Temple[]>([]);

  // Inisialisasi data dummy
  useEffect(() => {
    const initialData: Temple[] = [
      {
        id: 1,
        name: 'Pura Penataran Kebon Agung',
        location: 'Karangasem, Kec. Abang, Desa Kerta Mandala',
        description: 'Pura Penataran Kebon Agung merupakan pura yang terletak di...',
        image: PuraImg,
        dateAdded: 'February 25, 2025',
        status: 'Pending',
      },
      {
        id: 2,
        name: 'Pura Dadya Dunungan Sentana Ki Dukuh Kedampal',
        location: 'Karangasem, Desa Datah',
        description: 'Pura Dadya Dunungan Sentana Ki Dukuh Kedampal terletak di...',
        image: PuraImg,
        dateAdded: 'February 23, 2025',
        status: 'Approved',
      },
      {
        id: 3,
        name: 'Pura Dadya Dunungan Sentana Ki Dukuh Kedampal 2',
        location: 'Desa Datah',
        description: 'Pura Dadya Dunungan Sentana Ki Dukuh Kedampal terletak di...',
        image: PuraImg,
        dateAdded: 'February 21, 2025',
        status: 'Rejected',
      },
    ];
    // Map Temple -> Pura
    const puraData: PuraType[] = initialData.map(t => ({
      md_temples_id: t.id,                     // pakai id sebagai md_temples_id
      md_temple_types_id: 0,                   // default / placeholder
      user_id: 0,                              // default / placeholder
      area_id: { Int64: 0, Valid: false },     // default
      name: t.name,
      location_name: t.location,
      lat: 0,                                  // jika tidak ada data lat/lng, isi 0
      lng: 0,
      description: t.description,
      file_path: t.image,                      // map image -> file_path
      visibility: "public",
      temple_type: "",
      total_contributions: 0,
      created_at: dayjs(t.dateAdded, "MMMM D, YYYY").isValid()
        ? dayjs(t.dateAdded, "MMMM D, YYYY").toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }));
    setTemples(puraData);
  }, [setTemples]);

  // Proses filter
  useEffect(() => {
  // convert PuraType[] → Temple[]
  let newData: Temple[] = temples.map((t) => ({
    id: t.md_temples_id,
    name: t.name,
    location: t.location_name ?? "",
    description: t.description ?? "",
    image: t.file_path ?? PuraImg,
    dateAdded: dayjs(t.created_at).format("MMMM D, YYYY"),
    status: "Pending" as TempleStatus, // atau mapping sesuai logika di store
  }));

  // Filter Name
  if (nameFilter.trim() !== "") {
    newData = newData.filter((temple) =>
      temple.name.toLowerCase().includes(nameFilter.toLowerCase())
    );
  }

  // Filter Location
  if (locationFilter.trim() !== "") {
    newData = newData.filter((temple) =>
      temple.location.toLowerCase().includes(locationFilter.toLowerCase())
    );
  }

  // Filter Date Range
  if (dateRangeFilter[0] && dateRangeFilter[1]) {
    newData = newData.filter((temple) => {
      const templeDate = dayjs(temple.dateAdded, "MMMM D, YYYY");
      if (!templeDate.isValid()) return false;
      return templeDate.isBetween(
        dateRangeFilter[0] as Dayjs,
        dateRangeFilter[1] as Dayjs,
        "day",
        "[]"
      );
    });
  }

  // Filter Status
  if (statusFilter !== "All") {
    newData = newData.filter((temple) => temple.status === statusFilter);
  }

  setFilteredData(newData);
}, [temples, nameFilter, locationFilter, dateRangeFilter, statusFilter]);


  // Fungsi ketika user memilih action
  const handleMenuClick = (record: Temple, actionKey: string) => {
    if (actionKey === 'approve') {
      // Contoh: ubah status di store atau local state
      console.log('Approve clicked for', record.name);
      // Lakukan update data di store sesuai kebutuhan
      // ...
    } else if (actionKey === 'reject') {
      console.log('Reject clicked for', record.name);
      // Lakukan update data di store sesuai kebutuhan
      // ...
    }
  };

  // Menu dropdown
  const getActionMenu = (record: Temple) => (
    <Menu onClick={(info) => handleMenuClick(record, info.key)}>
      <Menu.Item key="approve">Approve</Menu.Item>
      <Menu.Item key="reject">Reject</Menu.Item>
    </Menu>
  );

  // Kolom Tabel
  const columns = [
    {
      title: 'Temples Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (url: string) => (
        <img
          src={url}
          alt="Temple"
          style={{ width: 50, height: 50, borderRadius: 4 }}
        />
      ),
    },
    {
      title: 'Date Added',
      dataIndex: 'dateAdded',
      key: 'dateAdded',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: TempleStatus) => {
        let color: string;
        switch (status) {
          case 'Approved':
            color = 'green';
            break;
          case 'Pending':
            color = 'orange';
            break;
          case 'Rejected':
            color = 'red';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color} style={{ color:`${color} !important` }}>{status}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Temple) => (
        <Dropdown overlay={getActionMenu(record)} trigger={['click']}>
          <Button type="text" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined style={{ fontSize: 20 }} />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <Layout className={styles.requestContainer}>
      {/* Title */}
      <Row>
        <Col xs={24} md={12} lg={12}>
          <Title level={2} className={styles.sectionTitle} style={{ marginBottom: "10px" }}>
            Request Temple
          </Title>
          <Title level={5} className={styles.sectionSubtitle}>
            This table show the new added temple
          </Title>
        </Col>
      </Row>

      <Card className={styles.cardRequest}>
        {/* Filter Fields */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Input
              placeholder="Filter by Temple Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </Col>

          <Col xs={24} md={6}>
            <Input
              placeholder="Filter by Location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </Col>

          <Col xs={24} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(values) => {
                if (!values) {
                  // Saat reset, values adalah null
                  setDateRangeFilter([null, null]);
                } else {
                  setDateRangeFilter(values as [Dayjs, Dayjs]);
                }
              }}
            />
          </Col>

          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            >
              <Option value="All">All Status</Option>
              <Option value="Approved">Approved</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Rejected">Rejected</Option>
            </Select>
          </Col>
        </Row>

        {/* Table */}
        <Row>
          <Col span={24}>
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              pagination={{ pageSize: 15 }}
              style={{ background: "#fff", borderRadius: 8 }}
            />
          </Col>
        </Row>
      </Card>
    </Layout>
  );
}

export default RequestTemple;
