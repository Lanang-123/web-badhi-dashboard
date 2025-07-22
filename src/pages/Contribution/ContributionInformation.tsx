// src/pages/ContributionInformation.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Layout,
  Row,
  Col,
  Typography,
  Space,
  Rate,
  Avatar,
  Card,
  Skeleton,
  message,
  Result,
  Button
} from "antd";
import styles from "./Contribution.module.css";
import Logo from "../../assets/images/Badhi-Logo.png";

const { Title, Text, Paragraph } = Typography;
const apiUrl = import.meta.env.VITE_API_URL;

interface ContributionDetail {
  tx_contribution_id: number;
  md_temples_id: number;
  name: string;
  description: string;
  file_path: string;
  thumbnail: string;
  created_at: string;
  user_id: number;
}

const ContributionInformation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ContributionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const raw = localStorage.getItem("auth-storage");
        let token: string | null = null;
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed.state?.token || null;
        }

        const res = await fetch(`${apiUrl}/private/contributions/${id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        
        
        if (res.status === 404) {
          setDetail(null);
        } else if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        } else {
          const json = await res.json();
          setDetail(json.datas || null);
          console.log(json.datas);
          
        }
      } catch (err) {
        message.error("Gagal memuat detail kontribusi.");
        console.error(err);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  // Loading placeholder
  if (loading) {
    return (
      <Layout className={styles.informationContainer}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Layout>
    );
  }

  // Not found placeholder
  if (!detail) {
    return (
      <Layout className={styles.informationContainer}>
        <Result
          status="404"
          title="404"
          subTitle="Maaf, detail kontribusi tidak ditemukan."
          extra={
            <Button type="primary"  style={{ backgroundColor: '#772d2f', borderColor: '#772d2f' }}>
              <Link to="/contribution">Kembali ke daftar</Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  // Render detail
  return (
    <Layout className={styles.informationContainer}>
      {/* Video */}
      <div style={{ marginBottom: 16 }}>
        <video
          controls
          poster={detail.thumbnail + "/preview"}
          style={{
            width: "100%",
            maxHeight: 500,
            objectFit: "cover",
            borderRadius: 10,
          }}
        >
          <source src={detail.file_path} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Judul & Rating */}
      <Row style={{ marginBottom: 16 }}>
        <Col>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Title level={4} style={{ margin: 0 }}>
              {detail.name}
            </Title>
            <Space>
              <Rate disabled defaultValue={4} style={{ fontSize: 16 }} />
              <Text>(4.0)</Text>
            </Space>
          </div>
        </Col>
      </Row>

      {/* Info User & Tanggal */}
      <Row align="middle" gutter={16}>
        <Col>
          <Card className={styles.cardDetailAvatarInformation}>
            <Avatar size={40} src={Logo} />
          </Card>
        </Col>
        <Col flex="auto">
          <Text strong>User #{detail.user_id}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Contributor
          </Text>
        </Col>
        <Col>
          <Text type="secondary">
            {new Date(detail.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </Col>
      </Row>

      {/* Deskripsi */}
      <Paragraph style={{ marginTop: 16, textAlign: "justify" }}>
        {detail.description}
      </Paragraph>
    </Layout>
  );
};

export default ContributionInformation;
