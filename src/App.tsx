import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Layout } from "antd";
import Sidebar from "./components/Sidebar/Sidebar";
import Dashboard from "./pages/Dashboard/Dashboard";
import Contribution from "./pages/Contribution/Contribution";
import ContributionDetail from "./pages/Contribution/ContributionDetail";
import ContributionInformation from "./pages/Contribution/ContributionInformation";
import Reconstruction from "./pages/Reconstruction/Reconstruction";
import RequestTemple from "./pages/RequestTemple/RequestTemple";
import Settings from "./pages/Settings/Settings";
import Login from "./pages/Login/Login"; // Pastikan path ini sesuai dengan struktur proyek Anda
import ProtectedRoute from "./middleware/ProtectedRoute";


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Route login untuk pengguna yang belum login */}
        <Route path="/" element={<Login />} />

        {/* Semua route setelah login dibungkus dalam layout utama */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout style={{ minHeight: "100vh" }}>
                <Sidebar />
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/temples" element={<Contribution />} />
                    <Route
                      path="/temples/detail/:id"
                      element={<ContributionDetail />}
                    />
                    <Route
                      path="/reconstructions/:reconstructionId/contributions"
                      element={<ContributionDetail />}
                    />
                    <Route
                      path="/contribution/detail/information/:id"
                      element={<ContributionInformation />}
                    />
                    <Route
                      path="/request-temple"
                      element={<RequestTemple />}
                    />
                     <Route
                      path="/reconstructions"
                      element={<Reconstruction reconstructionId={""} />}
                    />
                     <Route
                      path="/settings"
                      element={<Settings />}
                    />
                  </Routes>
                </Layout>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
