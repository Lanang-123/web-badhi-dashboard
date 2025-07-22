import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const storedData = localStorage.getItem("auth-storage");

  if (!storedData) {
    return <Navigate to="/" replace />;
  }

  try {
    const parsed = JSON.parse(storedData);
    const token = parsed?.state?.token;

    if (!token) {
      localStorage.removeItem("auth-storage");
      return <Navigate to="/" replace />;
    }

    // Decode payload dari token
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64));

    // Cek apakah token sudah expired
    const currentTime = Math.floor(Date.now() / 1000); // dalam detik
    if (payload.exp < currentTime) {
      localStorage.removeItem("auth-storage");
      return <Navigate to="/" replace />;
    }

    return children;
  } catch (err) {
    // Token rusak atau format salah
    localStorage.removeItem("auth-storage");
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
