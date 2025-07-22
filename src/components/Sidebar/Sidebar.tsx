// src/components/Sidebar.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Typography, Button } from "antd";
import {
  HomeOutlined,
  MenuFoldOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  ClusterOutlined,
  SettingOutlined
} from "@ant-design/icons";
import Swal from "sweetalert2";
import useAuthStore from "../../store/useAuthStore";
import BadhiLogo from "../../assets/images/Badhi-Logo.png";
import styles from "./Sidebar.module.css";

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string>("");

  // Auth store
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setActiveMenu(location.pathname);
  }, [location.pathname]);

  const isContributionActive =
  activeMenu === "/temples" ||
  activeMenu.startsWith("/temples/detail") ||
  (
    activeMenu.startsWith("/reconstructions/") &&
    activeMenu.endsWith("/contributions")
  ) ||
  activeMenu.startsWith("/contribution/detail/information/");



  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Anda yakin ingin logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Logout",
      cancelButtonText: "Batal",
      confirmButtonColor: "#772d2f",
    });
    if (result.isConfirmed) {
      await logout();
      await Swal.fire({
        icon: "success",
        title: "Berhasil Logout",
        timer: 1200,
        showConfirmButton: false,
      });
      navigate("/", { replace: true });
    }
  };

  return (
    <Sider width={139} className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <img
          src={BadhiLogo}
          alt="Badhi Logo"
          className={styles.logoImg}
        />
      </div>

      {/* Navigation Menu */}
      <Menu
        mode="vertical"
        selectedKeys={[activeMenu]}
        className={styles.menuContainer}
      >
        <Menu.Item key="/dashboard" className={styles.menuItem}>
          <Link to="/dashboard">
            <div
              className={styles.iconCircle}
              style={{
                backgroundColor:
                  activeMenu === "/dashboard" ? "#772d2f" : "transparent",
              }}
            >
              <HomeOutlined
                style={{
                  fontSize: 28,
                  color: activeMenu === "/dashboard" ? "#fff" : "#772d2f",
                }}
              />
            </div>
            <Text
              className={styles.menuText}
              style={{
                color:
                  activeMenu === "/dashboard" ? "#772d2f" : "#a5a5a5",
              }}
            >
              Dashboard
            </Text>
          </Link>
        </Menu.Item>

        <Menu.Item key="/temples" className={styles.menuItem}>
          <Link to="/temples" >
            <div
              className={styles.iconCircle}
              style={{
                backgroundColor: isContributionActive
                  ? "#772d2f"
                  : "transparent",
              }}
            >
              <MenuFoldOutlined
                style={{
                  fontSize: 28,
                  color: isContributionActive ? "#fff" : "#772d2f",
                  
                }}
              />
            </div>
            <Text
              className={styles.menuText}
              style={{
                color: isContributionActive ? "#772d2f" : "#a5a5a5",
              }}
            >
              Data Temples
            </Text>
          </Link>
        </Menu.Item>

        {/* Reconstruction Menu Item */}
        <Menu.Item key="/reconstructions" className={styles.menuItem}>
          <Link to="/reconstructions">
            <div
              className={styles.iconCircle}
              style={{
                backgroundColor:
                  activeMenu === "/reconstructions" ? "#772d2f" : "transparent",
                marginLeft:20
              }}
            >
              <ClusterOutlined
                style={{
                  fontSize: 33,
                  color: activeMenu === "/reconstructions" ? "#fff" : "#772d2f",
                  
                }}
              />
            </div>
            <Text
              className={styles.menuText}
              style={{
                color:
                  activeMenu === "/reconstructions" ? "#772d2f" : "#a5a5a5",
              }}
            >
              Reconstruction
            </Text>
          </Link>
        </Menu.Item>

        {/* Settings */}
        <Menu.Item key="/settings" className={styles.menuItem}>
          <Link to="/settings">
            <div
              className={styles.iconCircle}
              style={{
                backgroundColor:
                  activeMenu === "/settings" ? "#772d2f" : "transparent",
                marginRight:20
              }}
            >
              <SettingOutlined
                style={{
                  fontSize: 33,
                  color: activeMenu === "/settings" ? "#fff" : "#772d2f",
                 
                }}
              />
            </div>
            <Text
              className={styles.menuText}
              style={{
                color:
                  activeMenu === "/settings" ? "#772d2f" : "#a5a5a5",
                  marginLeft:12
              }}
            >
              Settings
            </Text>
          </Link>
        </Menu.Item>

        {/* <Menu.Item key="/request-temple" className={styles.menuItem}>
          <Link to="/request-temple">
            <div
              className={styles.iconCircleRT}
              style={{
                backgroundColor:
                  activeMenu === "/request-temple"
                    ? "#772d2f"
                    : "transparent",
              }}
            >
              <CheckCircleOutlined
                style={{
                  fontSize: 28,
                  color:
                    activeMenu === "/request-temple"
                      ? "#fff"
                      : "#772d2f",
                }}
              />
            </div>
            <Text
              className={styles.menuText}
              style={{
                color:
                  activeMenu === "/request-temple"
                    ? "#772d2f"
                    : "#a5a5a5",
              }}
            >
              Request Temples
            </Text>
          </Link>
        </Menu.Item> */}
        
      </Menu>

      {/* User Info & Logout */}
      {user && (
        <div className={styles.userSection}>
          <Avatar src={`${user.avatar}/preview`} size={40} />
          <div className={styles.userInfo}>
            <Text strong ellipsis>
              {user.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              Researcher
            </Text>
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Logout
          </Button>
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;
