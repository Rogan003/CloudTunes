import React from "react";
import { useNavigate } from "react-router-dom";

export const BackButton: React.FC<{ label?: string }> = ({ label = "Back" }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0.4rem 0.7rem",
        background: "#111827",
        color: "#e5e7eb",
        border: "1px solid #334155",
        borderRadius: 8,
        cursor: "pointer"
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
      <span>{label}</span>
    </button>
  );
};
