// src/pages/ContributionDetail.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Button,
  Col,
  Layout,
  Row,
  Typography,
  Input,
  Spin,
  Modal,
  Form,
  message,
  List,
  Drawer,
  Avatar
} from "antd";
import { SearchOutlined, ClusterOutlined, CheckOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";

import useContributionStore, { Contribution } from "../../store/useContributionStore";
import useReconstructionStore from "../../store/useReconstructionStore";
import useAuthStore from "../../store/useAuthStore";

import ContributionDetailCard from "../../components/ContributionDetailCard/ContributionDetailCard";
import styles from "./Contribution.module.css";

const { Title, Text } = Typography;
const { Search } = Input;

type Level = "nista" | "madya" | "utama" | "other";

export default function ContributionDetail() {
  // --- State & Store Hooks ---
  const [searchText, setSearchText] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<Level>("nista");
  const [page, setPage] = useState<number>(1);
  const [isReconstructionModalVisible, setIsReconstructionModalVisible] = useState(false);
  const [currentReconstructionId, setCurrentReconstructionId] = useState<string | undefined>(undefined);
  const [showSubmitDrawer, setShowSubmitDrawer] = useState(false);

  const [form] = Form.useForm();
  const contributionStore = useContributionStore();
  const reconstructionStore = useReconstructionStore();
  const authStore = useAuthStore();
  const currentUser = authStore.user;

  const { contributions, loading, isNext, fetchContributionsByTempleId } = contributionStore;

  // --- Router Hooks: bisa ada param `id` atau `reconstructionId` ---
  const navigate = useNavigate();
  const { id, reconstructionId } = useParams<{ id?: string; reconstructionId?: string }>();

  // --- 1. Ambil data & fetch kontribusi ---
  useEffect(() => {
    // reset page & reconstructionId tiap kali param berubah
    setPage(1);
    setCurrentReconstructionId(undefined);

    if (reconstructionId) {
      // **MODE RECONSTRUCTION**: cari metadata
      const recon = reconstructionStore
        .getAllReconstructions()
        .find(r => r.reconstruction_id === reconstructionId);

      if (!recon) {
        message.error(`Reconstruction ${reconstructionId} tidak ditemukan`);
        navigate(-1);
        return;
      }

      setCurrentReconstructionId(reconstructionId);
      
      // PERBAIKAN: Gunakan temple_ids[0] karena sekarang array
      const templeId = recon.temple_ids[0];
      fetchContributionsByTempleId(
        templeId,
        1,
        activeCategory === "other" ? "other" : activeCategory
      );
    } else if (id) {
      // **MODE TEMPLE**: langsung fetch berdasar templeId
      fetchContributionsByTempleId(
        Number(id),
        1,
        activeCategory === "other" ? "other" : activeCategory
      );
    } else {
      // gak ada param sama sekali → kembali
      message.error("Param tidak valid");
      navigate(-1);
    }
  // hanya depend pada param & kategori, store tetap direferensikan langsung
  }, [id, reconstructionId, activeCategory, fetchContributionsByTempleId, navigate, reconstructionStore]);

  // --- 2. Infinite Scroll: load page selanjutnya ---
  const loaderRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && isNext) {
        const nextPage = page + 1;
        setPage(nextPage);

        if (reconstructionId) {
          // reconstruction mode
          const recon = reconstructionStore
            .getAllReconstructions()
            .find(r => r.reconstruction_id === reconstructionId)!;
          
          // PERBAIKAN: Gunakan temple_ids[0] karena sekarang array
          const templeId = recon.temple_ids[0];
          fetchContributionsByTempleId(
            templeId,
            nextPage,
            activeCategory === "other" ? "other" : activeCategory
          );
        } else if (id) {
          // temple mode
          fetchContributionsByTempleId(
            Number(id),
            nextPage,
            activeCategory === "other" ? "other" : activeCategory
          );
        }
      }
    },
    [activeCategory, id, reconstructionId, fetchContributionsByTempleId, isNext, loading, page, reconstructionStore]
  );
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [handleObserver]);

  // --- 3. Pre-fill form user saat modal reconstruction ---
  useEffect(() => {
    if (currentUser?.name && isReconstructionModalVisible) {
      form.setFieldsValue({ user: currentUser.name });
    }
  }, [currentUser, form, isReconstructionModalVisible]);

  // --- 4. Selected contributions untuk drawer & submit ---
  const selectedIds = currentReconstructionId
    ? reconstructionStore
        .getSelectedContributions(currentReconstructionId)
        .map(c => c.contribution_id)
    : [];
  const selectedContributions = currentReconstructionId
    ? reconstructionStore.getSelectedContributions(currentReconstructionId)
    : [];

  // --- Handlers Utama ---
  const onSearch = (value: string) => setSearchText(value);
  const handleCategoryClick = (lvl: Level) => {
    setPage(1);
    setActiveCategory(lvl);
  };

  const showReconstructionModal = () => setIsReconstructionModalVisible(true);
  const handleReconstructionCancel = () => {
    form.resetFields();
    setIsReconstructionModalVisible(false);
  };

  // **Panggil addReconstruction hanya di mode TEMPLE**:
  const handleReconstructionOk = async () => {
    try {
      const values = await form.validateFields();
      if (!currentUser) {
        message.error("User not authenticated");
        return;
      }
      if (!id) {
        message.error("Temple ID tidak tersedia");
        return;
      }
      // ✔️ 3 args: label, user, templeId
     const newRec = reconstructionStore.addReconstruction(
        values.label,
        currentUser.name,
        [Number(id)] // ubah jadi array
      );

      form.resetFields();
      setIsReconstructionModalVisible(false);
      setCurrentReconstructionId(newRec.reconstruction_id);
      Swal.fire({
        title: "Reconstruction Created!",
        html: `<p><strong>ID:</strong> ${newRec.reconstruction_id}</p>`,
        icon: "success",
        confirmButtonColor: "#772d2f",
        timer: 1000,
        showConfirmButton: false,
      });
      navigate(`/reconstructions/${newRec.reconstruction_id}/contributions`);
    } catch (e) {
      console.error(e);
      message.error("Failed to save reconstruction");
    }
  };

  const showSubmitDrawerHandler = () => {
    if (selectedContributions.length === 0) {
      message.warning("Please select at least one contribution");
      return;
    }
    setShowSubmitDrawer(true);
  };

  const handleSubmitContributions = async () => {
    if (!currentReconstructionId) return;
    try {
      const sel = reconstructionStore.getSelectedContributions(currentReconstructionId);
      reconstructionStore.updateReconstructionContributions(
        currentReconstructionId,
        sel
      );
      message.success(`Successfully added ${sel.length} contributions!`);
      setShowSubmitDrawer(false);
      Swal.fire({
        title: "Contributions Submitted!",
        html: `<p><strong>Reconstruction ID:</strong> ${currentReconstructionId}</p>
               <p><strong>Added Contributions:</strong> ${sel.length}</p>`,
        icon: "success",
        confirmButtonColor: "#772d2f",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      message.error("Failed to submit contributions");
    }
  };

  // --- Filter berdasarkan search ---
  const filteredContributions = contributions.filter(c =>
    c.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Layout className={styles.contributionContainer}>
      {/* Title, Search & (only in temple-mode) Create Reconstruction */}
      <Row gutter={[16, 16]} style={{ marginTop: 10 }} align="middle">
        <Col flex="auto">
          <Title level={3} className={styles.titleDetailTemple}>
            Detail Contributions
          </Title>
          <div style={{ height: 3, backgroundColor: "#772d2f", width: 160 }} />
        </Col>

        <Col>
          <Search
            placeholder="Search by name or user..."
            allowClear
            size="large"
            onSearch={onSearch}
            style={{ width: 300, borderColor: "#772d2f" }}
            enterButton={
              <Button
                type="primary"
                style={{ backgroundColor: "#772d2f", borderColor: "#772d2f" }}
              >
                <SearchOutlined style={{ color: "#fff" }} />
              </Button>
            }
          />
        </Col>

        
      </Row>

      {/* Category Tabs (sama seperti sebelumnya) */}
      <Row gutter={[24, 24]} style={{ marginTop: 36, marginBottom: 48 }}>
        {(["nista", "madya", "utama", "other"] as Level[]).map(lvl => (
          <Col xs={24} sm={6} key={lvl}>
            <Button
              block
              size="large"
              onClick={() => handleCategoryClick(lvl)}
              className={
                activeCategory === lvl
                  ? styles.buttonCategoryDetailActive
                  : styles.buttonCategoryDetailDefault
              }
            >
              {lvl === "other"
                ? "Other..."
                : `${lvl.charAt(0).toUpperCase() + lvl.slice(1)} Mandala`}
            </Button>
          </Col>
        ))}
      </Row>

      {/* Contributions Grid & Empty State */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {filteredContributions.length === 0 && !loading ? (
          <Col span={24} style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary" italic style={{ fontSize: 18 }}>
              Belum ada data
            </Text>
          </Col>
        ) : (
          filteredContributions.map((c: Contribution) => (
            <Col xs={24} sm={12} md={8} key={c.tx_contribution_id}>
              <ContributionDetailCard
                data={c}
                reconstructionId={currentReconstructionId}
              />
            </Col>
          ))
        )}
        {loading && (
          <Col span={24} style={{ textAlign: "center", margin: 20 }}>
            <Spin size="large" />
          </Col>
        )}
        <div ref={loaderRef} />
      </Row>

      {/* Floating Submit Button */}
      {selectedContributions.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000
          }}
        >
          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            onClick={showSubmitDrawerHandler}
            style={{
              backgroundColor: "#772d2f",
              borderRadius: 50,
              height: 60,
              width: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(119, 45, 47, 0.5)"
            }}
          />
        </div>
      )}

      {/* Submit Drawer */}
      <Drawer
        title="Selected Contributions"
        placement="bottom"
        height={400}
        open={showSubmitDrawer}
        onClose={() => setShowSubmitDrawer(false)}
        extra={
          <Button
            type="primary"
            onClick={handleSubmitContributions}
            style={{ backgroundColor: "#772d2f" }}
          >
            Submit
          </Button>
        }
      >
        <List<number>
          itemLayout="horizontal"
          dataSource={selectedIds}
          renderItem={id => {
            const contribution = contributions.find(
              c => c.tx_contribution_id === id
            );
            return contribution ? (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar src={`${contribution.thumbnail}/preview`} />}
                  title={contribution.name}
                  description={`ID: ${contribution.tx_contribution_id}`}
                />
              </List.Item>
            ) : null;
          }}
        />
      </Drawer>

      {/* Create Reconstruction Modal */}
      <Modal
        title="Create Reconstruction"
        open={isReconstructionModalVisible}
        onOk={handleReconstructionOk}
        onCancel={handleReconstructionCancel}
        okText="Submit"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Label" name="label">
            <Input placeholder="Input label" />
          </Form.Item>
          <Form.Item label="User" name="user">
            <Input
              disabled
              value={currentUser ? currentUser.name : "User not available"}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
