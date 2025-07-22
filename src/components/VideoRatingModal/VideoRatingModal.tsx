import { useState } from "react";
import {
  Modal,
  Button,
  Rate,
  Typography,
  Row,
  Avatar,
  Space,
  Divider
} from "antd";
import {
  CloseOutlined,
  LikeFilled
} from "@ant-design/icons";

const { Title, Text } = Typography;
import Profile from "../../assets/images/user.jpg"

interface VideoRatingModalProps {
  isVisible: boolean;
  onClose: () => void;
}

function VideoRatingModal({ isVisible, onClose }: VideoRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [isLoading,setIsLoading] = useState(true);

  const handleSubmit = () => {
    console.log("Rating submitted:", rating);
    // Lakukan aksi lain (misalnya kirim ke server)
    onClose();
  };

  setTimeout(()=>{
    setIsLoading(false);
  },5000)

  return (
    <Modal
      loading={isLoading}
      visible={isVisible}
      onCancel={onClose}
      footer={null}         // Menghilangkan footer default
      centered              // Modal muncul di tengah layar
      closable={false}      // Menghilangkan tombol close default
      width={430}           // Atur lebar modal
      bodyStyle={{
        padding: "5px",
        borderRadius: "8px",
        backgroundColor: "#fff",
      }}
    >
      {/* Header Kustom: Ikon + Title di kiri, Close di kanan */}
      <Row justify="space-between" align="middle">
        <Space>
          <LikeFilled style={{ color: "#772d2f", fontSize: 20 }} />
          <Title level={5} style={{ margin: 0 }}>
            Contribution Rating
          </Title>
        </Space>
        <CloseOutlined
          style={{ fontSize: 16, cursor: "pointer" }}
          onClick={onClose}
        />
      </Row>

      {/* Garis pemisah */}
      <Divider style={{ margin: "8px 0" }} />

      {/* Nama Pura */}
      <Title level={5} style={{ margin: 0 }}>
        Pura Penataran Agung (Padma Tiga)
      </Title>

      {/* Kategori (Madya Mandala) */}
      <Button
        size="middle"
        style={{
          backgroundColor: "#772d2f",
          borderRadius: "12px",
          border: "none",
          color: "#fff",
          fontWeight: 500,
          marginTop: 24
        }}
      >
        Madya Mandala
      </Button>

      {/* Info User */}
      <Row align="middle" style={{ marginTop: 16 }}>
        <Avatar
          src={Profile} // Ganti dengan avatar Anda
          size={40}
        />
        <div style={{ marginLeft: 8 }}>
          <Text strong>Made Tatum</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Contributor
          </Text>
        </div>
      </Row>

      {/* Tanggal */}
      <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
        January 23, 2025
      </Text>


      {/* Garis pemisah */}
      <Divider style={{ margin: "8px 0" }} />

      {/* Rate bintang (di tengah) */}
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Rate
          value={rating}
          onChange={(val) => setRating(val)}
          style={{ fontSize: 24 }}
        />
      </div>

      {/* Tombol Submit */}
      <Button
        type="primary"
        block
        style={{
          marginTop: 24,
          borderRadius: 6,
          backgroundColor: "#772d2f", // Sesuaikan tema
          border: "none",
          fontWeight: "bold"
        }}
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </Modal>
  );
}

export default VideoRatingModal;
