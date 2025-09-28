import React, {type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";
import { BackButton } from "../../shared/components/buttons.tsx";
import { Grid } from "../../shared/components/Grid";
import { Section } from "../../shared/components/Section";
import {Empty} from "../../shared/components/Empty.tsx";
import type {AlbumCard, ArtistCard, Genre} from "../models/music-models.ts";
import {getSubscriptionsForUser, unsubscribe} from "../services/subscription-service.ts";

export const SubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<ArtistCard[]>([]);
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [artistPage, setArtistPage] = useState(1);
  const [albumPage, setAlbumPage] = useState(1);
  const [genrePage, setGenrePage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
      getSubscriptionsForUser().then((subscriptions) => {
          subscriptions.forEach((subscription) => {
              if (subscription.type === "artist") {
                  setArtists([...artists, {
                      id: subscription.id,
                      name: subscription.name,
                  }])
              } else if (subscription.type === "album") {
                  setAlbums([...albums, {
                      id: subscription.id,
                      name: subscription.name,
                  }])
              } else {
                  setGenres([...genres, {
                      id: subscription.id,
                      name: subscription.name,
                  }])
              }
          })
      })
  }, []);

  const artistItems = useMemo(() => paginate(artists, artistPage, pageSize), [artists, artistPage]);
  const albumItems = useMemo(() => paginate(albums, albumPage, pageSize), [albums, albumPage]);
  const genreItems = useMemo(() => paginate(genres, genrePage, pageSize), [genres, genrePage]);

  const onUnsub = (type: string, id: string) => {
      unsubscribe(type, id).then(() => {
          if (type === "artists") {
              setArtists(artists.filter(a => a.id !== id));
          } else if (type === "albums") {
              setAlbums(albums.filter(a => a.id !== id));
          } else {
              setGenres(genres.filter(g => g.id !== id));
          }
      })
  };

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>My Subscriptions</h2>
        </div>
      </div>

      <Section title="Artists">
        {artists.length === 0 ? <Empty text="No artist subscriptions" /> : (
          <>
            <Grid>
              {artistItems.map(a => (
                <Card key={a.id} title={a.name} imageUrl={a.imageUrl} actionLabel="Unsubscribe" onActionClick={() => onUnsub("artists", a.id)} onClick={() => navigate(`/artists/${a.id}`)} />
              ))}
            </Grid>
            <Pagination total={artists.length} pageSize={pageSize} page={artistPage} onChange={setArtistPage} />
          </>
        )}
      </Section>

      <Section title="Albums">
        {albums.length === 0 ? <Empty text="No album subscriptions" /> : (
          <>
            <Grid>
              {albumItems.map(a => (
                <Card key={a.id} title={a.name} imageUrl={a.imageUrl} actionLabel="Unsubscribe" onActionClick={() => onUnsub("albums", a.id)} onClick={() => navigate(`/albums/${a.id}`)} />
              ))}
            </Grid>
            <Pagination total={albums.length} pageSize={pageSize} page={albumPage} onChange={setAlbumPage} />
          </>
        )}
      </Section>

      <Section title="Genres">
        {genres.length === 0 ? <Empty text="No genre subscriptions" /> : (
          <>
            <Grid>
              {genreItems.map(g => (
                <Card key={g.id} title={g.name} imageUrl={g.imageUrl} actionLabel="Unsubscribe" onActionClick={() => onUnsub("genres", g.id)} onClick={() => navigate(`/discover`)} />
              ))}
            </Grid>
            <Pagination total={genres.length} pageSize={pageSize} page={genrePage} onChange={setGenrePage} />
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


