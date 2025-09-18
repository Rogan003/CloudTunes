import React from "react";

export const Grid: React.FC<{ children: React.ReactNode; min?: number }> = ({ children, min = 160 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 12 }}>
    {children}
  </div>
);
