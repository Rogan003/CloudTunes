import React, { CSSProperties, MouseEvent, ReactNode } from "react";

export type CardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onClick?: () => void;
  actionLabel?: string;
  onActionClick?: (e: MouseEvent) => void;
  footer?: ReactNode;
};

export const Card: React.FC<CardProps> = ({ title, subtitle, imageUrl, onClick, actionLabel, onActionClick, footer }) => {
  return (
    <div style={cardStyle} onClick={onClick} role={onClick ? "button" : undefined}>
      {imageUrl && (
        <div style={{ width: "100%", paddingTop: "66%", position: "relative", background: "#111827", borderRadius: 8, overflow: "hidden" }}>
          <img src={imageUrl} alt={title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ color: "#94a3b8", fontSize: 12 }}>{subtitle}</div>}
      </div>
      {(actionLabel || footer) && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
          {actionLabel ? (
            <button onClick={(e: MouseEvent) => { e.stopPropagation(); onActionClick?.(e); }} style={{ padding: "0.4rem 0.6rem", fontSize: 12 }}>
              {actionLabel}
            </button>
          ) : <span />}
          {footer}
        </div>
      )}
    </div>
  );
};

const cardStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1f2937",
  borderRadius: 12,
  color: "#e5e7eb",
  padding: 12,
  cursor: "pointer",
};
