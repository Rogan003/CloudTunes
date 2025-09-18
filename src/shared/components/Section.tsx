import React from "react";

export const Section: React.FC<{ title: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>> = ({ title, children, style, ...rest }) => (
  <div style={{ marginTop: 24, ...(style || {}) }} {...rest}>
    <h3 style={{ margin: "0 0 12px 0" }}>{title}</h3>
    {children}
  </div>
);
