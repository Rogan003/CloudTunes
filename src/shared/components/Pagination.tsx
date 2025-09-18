import React from "react";

type Props = {
  total: number;
  pageSize: number;
  page: number;
  onChange: (page: number) => void;
};

export const Pagination: React.FC<Props> = ({ total, pageSize, page, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} style={{ background: p === page ? "#1f2937" : undefined }}>
          {p}
        </button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
};
