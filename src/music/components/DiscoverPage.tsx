import React, { CSSProperties, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { albums, artists, genres } from "../data/mockData";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [genreId, setGenreId] = useState(genres[0]?.id ?? "");
  const [albumPage, setAlbumPage] = useState(1);
  const [artistPage, setArtistPage] = useState(1);
  const pageSize = 6;

  const filteredAlbums = useMemo(() => albums.filter(a => a.genreId === genreId), [genreId]);
  const filteredArtists = useMemo(() => artists.filter(a => a.genreIds.includes(genreId)), [genreId]);

  const albumPageItems = useMemo(() => paginate(filteredAlbums, albumPage, pageSize), [filteredAlbums, albumPage]);
  const artistPageItems = useMemo(() => paginate(filteredArtists, artistPage, pageSize), [filteredArtists, artistPage]);

  const selectedGenre = genres.find(g => g.id === genreId);

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <h2 style={{ margin: 0 }}>Discover Music</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="genre">Genre:</label>
          <select
            id="genre"
            value={genreId}
            onChange={(e) => { setGenreId(e.target.value); setAlbumPage(1); setArtistPage(1); }}
            style={selectStyle}
          >
            {genres.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedGenre && (
        <div style={{ marginBottom: 20, color: "#94a3b8" }}>
          Explore albums and artists in {selectedGenre.name}
        </div>
      )}

      <Section title="Albums">
        <Grid>
          {albumPageItems.map(al => (
            <Card key={al.id} title={al.name} imageUrl={al.imageUrl} onClick={() => navigate(`/albums/${al.id}`)} />
          ))}
        </Grid>
        <Pagination total={filteredAlbums.length} pageSize={pageSize} page={albumPage} onChange={setAlbumPage} />
      </Section>

      <Section title="Artists">
        <Grid>
          {artistPageItems.map(ar => (
            <Card key={ar.id} title={ar.name} imageUrl={ar.imageUrl} onClick={() => navigate(`/artists/${ar.id}`)} />
          ))}
        </Grid>
        <Pagination total={filteredArtists.length} pageSize={pageSize} page={artistPage} onChange={setArtistPage} />
      </Section>
    </div>
  );
};

const paginate = <T,>(arr: T[], page: number, size: number): T[] => {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
};

const pageWrap: CSSProperties = { padding: "24px", color: "#e5e7eb" };
const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
const selectStyle: CSSProperties = { background: "#111827", color: "#fff", border: "1px solid #334155", borderRadius: 8, padding: "0.4rem 0.6rem" };

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
    {children}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginTop: 24 }}>
    <h3 style={{ margin: "0 0 12px 0" }}>{title}</h3>
    {children}
  </div>
);
