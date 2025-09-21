import React, {type CSSProperties, useMemo, useState } from "react";
import { albums, artists, genres } from "../models/music-models.ts";
import { Card } from "../../shared/components/Card";
import { SubscriptionStorage, type SubscriptionData } from "../services/subscription-storage.ts";
import { Pagination } from "../../shared/components/Pagination";
import { BackButton } from "../../shared/components/BackButton";
import { Grid } from "../../shared/components/Grid";
import { Section } from "../../shared/components/Section";

export const AddSubscriptionPage: React.FC = () => {
  const [subs, setSubs] = useState<SubscriptionData>(SubscriptionStorage.load());
  const [artistPage, setArtistPage] = useState(1);
  const [albumPage, setAlbumPage] = useState(1);
  const [genrePage, setGenrePage] = useState(1);
  const pageSize = 6;

  const artistItems = useMemo(() => paginate(artists, artistPage, pageSize), [artistPage]);
  const albumItems = useMemo(() => paginate(albums, albumPage, pageSize), [albumPage]);
  const genreItems = useMemo(() => paginate(genres, genrePage, pageSize), [genrePage]);

  const onSub = (type: keyof SubscriptionData, id: string) => {
    const updated = SubscriptionStorage.subscribe(type, id);
    setSubs(updated);
  };

  const isSub = (type: keyof SubscriptionData, id: string) => subs[type].includes(id);

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>Add Subscription</h2>
        </div>
      </div>

      <Section title="Artists">
        <Grid>
          {artistItems.map(a => (
            <Card key={a.id} title={a.name} imageUrl={a.imageUrl} actionLabel={isSub("artists", a.id) ? "Subscribed" : "Subscribe"} onActionClick={() => onSub("artists", a.id)} onClick={() => {}} />
          ))}
        </Grid>
        <Pagination total={artists.length} pageSize={pageSize} page={artistPage} onChange={setArtistPage} />
      </Section>

      <Section title="Albums">
        <Grid>
          {albumItems.map(a => (
            <Card key={a.id} title={a.name} imageUrl={a.imageUrl} actionLabel={isSub("albums", a.id) ? "Subscribed" : "Subscribe"} onActionClick={() => onSub("albums", a.id)} onClick={() => {}} />
          ))}
        </Grid>
        <Pagination total={albums.length} pageSize={pageSize} page={albumPage} onChange={setAlbumPage} />
      </Section>

      <Section title="Genres">
        <Grid>
          {genreItems.map(g => (
            <Card key={g.id} title={g.name} imageUrl={g.imageUrl} actionLabel={isSub("genres", g.id) ? "Subscribed" : "Subscribe"} onActionClick={() => onSub("genres", g.id)} onClick={() => {}} />
          ))}
        </Grid>
        <Pagination total={genres.length} pageSize={pageSize} page={genrePage} onChange={setGenrePage} />
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


