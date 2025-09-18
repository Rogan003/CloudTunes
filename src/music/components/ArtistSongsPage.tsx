import React, {type CSSProperties, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { artists, songs } from "../data/mockData";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";
import { BackButton } from "../../shared/components/BackButton";
import { Grid } from "../../shared/components/Grid";

export const ArtistSongsPage: React.FC = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const artist = artists.find(a => a.id === artistId);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const artistSongs = useMemo(() => songs.filter(s => s.artistId === artistId), [artistId]);
  const pageItems = useMemo(() => paginate(artistSongs, page, pageSize), [artistSongs, page]);

  if (!artist) {
    return <div style={wrap}><p>Artist not found.</p><button onClick={() => navigate(-1)}>Back</button></div>;
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>Songs by {artist.name}</h2>
        </div>
      </div>
      <Grid>
        {pageItems.map(s => (
          <Card key={s.id} title={s.name} imageUrl={s.imageUrl} onClick={() => {}} />
        ))}
      </Grid>
      <Pagination total={artistSongs.length} pageSize={pageSize} page={page} onChange={setPage} />
    </div>
  );
};

const paginate = <T,>(arr: T[], page: number, size: number): T[] => {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
};

const wrap: CSSProperties = { padding: 24, color: "#e5e7eb" };
const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
