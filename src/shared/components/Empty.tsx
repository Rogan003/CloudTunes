import React from "react";

export const Empty: React.FC<{ text: string }> = ({ text }) => (
    <div style={{ color: "#94a3b8" }}>{text}</div>
);