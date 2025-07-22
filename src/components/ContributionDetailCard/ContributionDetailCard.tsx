import { useState } from "react";
import {
  Card,
  Avatar,
  Typography,
  Rate,
  Row,
  Space,
  Checkbox
} from "antd";
import {
  LikeFilled,
  ExclamationCircleFilled,
  DisconnectOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import styles from "./ContributionDetailCard.module.css";
import useAuthStore from "../../store/useAuthStore";

import VideoRatingModal from "../VideoRatingModal/VideoRatingModal";
import useReconstructionStore from "../../store/useReconstructionStore"; 

const { Title, Text } = Typography;

type Contribution = {
  tx_contribution_id: number;
  md_temples_id: number;
  user_id: number;
  name: string;
  description: string;
  level_area: string;
  file_path: string;
  thumbnail: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  license_type: number;
  avatar: string;
};

type Props = {
  data: Contribution;
  reconstructionId?: string; // Tambahkan prop untuk reconstructionId
};

export default function ContributionDetailCard({ data, reconstructionId }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const reconstructionStore = useReconstructionStore();

  const contributionData = {
      contribution_id: data.tx_contribution_id,
          temple_name: data.name,
          share_link: data.file_path,
          privacy_setting: data.license_type === 1 ? "public" : "private"
        }

  const selected = reconstructionId
    ? reconstructionStore.getSelectedContributions(reconstructionId)
    : [];

  const isSelected = selected.some(
    c => c.contribution_id === data.tx_contribution_id
  );

  const handleToggle = () => {
  if (reconstructionId) {
    
    reconstructionStore.toggleContribution(reconstructionId, contributionData);
    };
    
  }


  // Format tanggal
  const createdDate = new Date(data.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Card
        hoverable
        style={{
          borderRadius: 12,
           boxShadow: isSelected 
            ? "0 4px 8px rgba(119, 45, 47, 0.6)" 
            : "0 4px 8px rgba(0,0,0,0.2)",
          overflow: "hidden",
          position: "relative",
          border: isSelected ? "2px solid #772d2f" : "none"
          
        }}
        cover={
          <>
            <img
              alt={data.name}
              src={`${data.thumbnail}/preview`}
              style={{
                width: "100%",
                objectFit: "cover",
                maxHeight: 200,
              }}
            />
            {/* Tambahkan checkbox di pojok kanan atas */}
            {reconstructionId && (
                <div className={styles.checkboxWrapper}>
                  <Checkbox 
                    checked={isSelected} 
                    onChange={handleToggle}
                    style={{ 
                      backgroundColor: "#772d2f", 
                      padding: 4,
                      borderRadius: 4,
                      color: "white",
                      width: 40,
                      paddingLeft: 12
                    }}
                  />
                </div>
              )}

          </>
        }
        actions={[
          // Bungkus ikon dalam <div> agar onClick selalu ter-capture
          <div
            key="like"
            className={styles.actionIconDetail}
            onClick={() => setIsModalVisible(true)}
          >
            <LikeFilled />
          </div>,

          <Link
            key="info"
            to={`/contribution/detail/information/${data.tx_contribution_id}`}
            style={{marginTop:6}}
          >
            <ExclamationCircleFilled className={styles.actionIconDetail} />
          </Link>,

          <div key="disconnect" className={styles.actionIconDetail}>
            <DisconnectOutlined />
          </div>,
        ]}
      >
        <Title level={5} style={{ marginBottom: 4 }}>
          {data.name}
        </Title>

        <Space align="center">
          <Rate disabled defaultValue={3} style={{ fontSize: 16 }} />
          <Text>({data.license_type}.0)</Text>
        </Space>

        <Row align="middle" style={{ marginTop: 12 }}>
          <Avatar src={`/profile.png`} size={40} />
          <div style={{ marginLeft: 8 }}>
            <Text strong>User #{data.user_id}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Contributor
            </Text>
          </div>
        </Row>

        <Text
          style={{ display: "block", marginTop: 16 }}
         
        >
          {data.description}
        </Text>

        <Row justify="space-between" style={{ marginTop: 12 }}>
          <Text type="secondary">{createdDate}</Text>
        </Row>
      </Card>

      {/* Modal Rating */}
      <VideoRatingModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </>
  );
}
