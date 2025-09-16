import React, { CSSProperties, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { albums, songs } from "../data/mockData";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";

export const AlbumSongsPage: React.FC = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const album = albums.find(a => a.id === albumId);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const albumSongs = useMemo(() => songs.filter(s => s.albumId === albumId), [albumId]);
  const pageItems = useMemo(() => paginate(albumSongs, page, pageSize), [albumSongs, page]);

  if (!album) {
    return <div style={wrap}><p>Album not found.</p><button onClick={() => navigate(-1)}>Back</button></div>;
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <h2 style={{ margin: 0 }}>Songs from {album.name}</h2>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {pageItems.map(s => (
          <Card key={s.id} title={s.name} imageUrl={s.imageUrl} onClick={() => {}} />
        ))}
      </div>
      <Pagination total={albumSongs.length} pageSize={pageSize} page={page} onChange={setPage} />
    </div>
  );
};

const paginate = <T,>(arr: T[], page: number, size: number): T[] => {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
};

const wrap: CSSProperties = { padding: 24, color: "#e5e7eb" };
const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
