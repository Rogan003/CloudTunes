import React, {type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { albums, artists, genres } from "../data/mockData";
import { Card } from "../../shared/components/Card";
import { SubscriptionStorage, type SubscriptionData } from "../services/subscription-storage.ts";
import { Pagination } from "../../shared/components/Pagination";
import { BackButton } from "../../shared/components/BackButton";
import { Grid } from "../../shared/components/Grid";
import { Section } from "../../shared/components/Section";
import {Empty} from "../../shared/components/Empty.tsx";

export const SubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [subs, setSubs] = useState<SubscriptionData>({ artists: [], albums: [], genres: [] });
  const [artistPage, setArtistPage] = useState(1);
  const [albumPage, setAlbumPage] = useState(1);
  const [genrePage, setGenrePage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    setSubs(SubscriptionStorage.load());
  }, []);

  const artistItems = useMemo(() => paginate(artists.filter(a => subs.artists.includes(a.id)), artistPage, pageSize), [subs, artistPage]);
  const albumItems = useMemo(() => paginate(albums.filter(a => subs.albums.includes(a.id)), albumPage, pageSize), [subs, albumPage]);
  const genreItems = useMemo(() => paginate(genres.filter(g => subs.genres.includes(g.id)), genrePage, pageSize), [subs, genrePage]);

  const onUnsub = (type: keyof SubscriptionData, id: string) => {
    const updated = SubscriptionStorage.unsubscribe(type, id);
    setSubs(updated);
  };

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>My Subscriptions</h2>
        </div>
        <button onClick={() => navigate("/subscriptions/add")}>Add subscription</button>
      </div>

      <Section title="Artists">
        {subs.artists.length === 0 ? <Empty text="No artist subscriptions" /> : (
          <>
            <Grid>
              {artistItems.map(a => (
                <Card key={a.id} title={a.name} imageUrl={a.imageUrl} actionLabel="Unsubscribe" onActionClick={() => onUnsub("artists", a.id)} onClick={() => navigate(`/artists/${a.id}`)} />
              ))}
            </Grid>
            <Pagination total={subs.artists.length} pageSize={pageSize} page={artistPage} onChange={setArtistPage} />
          </>
        )}
      </Section>

      <Section title="Albums">
        {subs.albums.length === 0 ? <Empty text="No album subscriptions" /> : (
          <>
            <Grid>
              {albumItems.map(a => (
                <Card key={a.id} title={a.name} imageUrl={a.imageUrl} actionLabel="Unsubscribe" onActionClick={() => onUnsub("albums", a.id)} onClick={() => navigate(`/albums/${a.id}`)} />
              ))}
            </Grid>
            <Pagination total={subs.albums.length} pageSize={pageSize} page={albumPage} onChange={setAlbumPage} />
          </>
        )}
      </Section>

      <Section title="Genres">
        {subs.genres.length === 0 ? <Empty text="No genre subscriptions" /> : (
          <>
            <Grid>
              {genreItems.map(g => (
                <Card key={g.id} title={g.name} imageUrl={g.imageUrl} actionLabel="Unsubscribe" onActionClick={() => onUnsub("genres", g.id)} onClick={() => navigate(`/discover`)} />
              ))}
            </Grid>
            <Pagination total={subs.genres.length} pageSize={pageSize} page={genrePage} onChange={setGenrePage} />
          </>
        )}
      </Section>
    </div>
  );
};

const paginate = <T,>(arr: T[], page: number, size: number): T[] => {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
};

const wrap: CSSProperties = { padding: 24, color: "#e5e7eb" };
const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };


