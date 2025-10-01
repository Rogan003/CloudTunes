import React from "react";
import { Navigate } from "react-router-dom";
import { AuthService } from "../users/services/auth-service";

export const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  if (!AuthService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const RequireGuest = ({ children }: { children: React.ReactElement }) => {
  if (AuthService.isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const RequireRole = ({ role, children }: { role: "admin" | "user"; children: React.ReactElement }) => {
  if (!AuthService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (!AuthService.hasRole(role)) {
    // default deny: send to home
    return <Navigate to="/" replace />;
  }
  return children;
};
