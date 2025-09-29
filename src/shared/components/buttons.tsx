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

export const NeutralButton: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: "0.4rem 0.7rem",
            background: "#111827",
            color: "#e5e7eb",
            border: "1px solid #334155",
            borderRadius: 8,
            cursor: "pointer"
        }}
    >
        {label}
    </button>
);

export const PositiveButton: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: "0.4rem 0.7rem",
            background: "#22c55e", // green
            color: "#ffffff",
            border: "1px solid #16a34a",
            borderRadius: 8,
            cursor: "pointer"
        }}
    >
        {label}
    </button>
);

export const NegativeButton: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: "0.4rem 0.7rem",
            background: "#ef4444", // red
            color: "#ffffff",
            border: "1px solid #b91c1c",
            borderRadius: 8,
            cursor: "pointer"
        }}
    >
        {label}
    </button>
);
