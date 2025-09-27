import React, {type CSSProperties, useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";
import {BackButton, NegativeButton, PositiveButton} from "../../shared/components/buttons.tsx";
import { Grid } from "../../shared/components/Grid";
import {getSongsForAlbum} from "../services/content-service.ts";
import type {ContentCard} from "../../shared/models/content-models.ts";
import {getIsSubscribed, subscribe, unsubscribe} from "../services/subscription-service.ts";

export const AlbumSongsPage: React.FC = () => {
  const { albumId } = useParams();
  const { name } = useLocation().state || {};
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [albumSongs, setAlbumSongs] = useState<ContentCard[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
      if (!albumId) return;

      const fetchSongsForAlbum = async () => {
          try {
              if (!albumId) return;

              const songs: ContentCard[] = await getSongsForAlbum(albumId);
              setAlbumSongs(songs);
          } catch (err: any) {
              alert("An error occurred while fetching album songs: " + err.message);
          }
      };

      fetchSongsForAlbum();
      getIsSubscribed("album", albumId).then(setIsSubscribed);
      }, []);

  const pageItems = useMemo(() => paginate(albumSongs, page, pageSize), [albumSongs, page]);

    const subscribeAlbum = () => {
        if (!albumId) return;

        subscribe("album", albumId).then(() => {
            setIsSubscribed(true);
        });
    }

    const unsubscribeAlbum = () => {
        if (!albumId) return;

        unsubscribe("album", albumId).then(() => {
            setIsSubscribed(false);
        });
    }

  if (!albumId) {
    return <div style={wrap}><p>Album not found.</p><button onClick={() => navigate(-1)}>Back</button></div>;
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>Songs from {name}</h2>
          {
              albumId &&
              (
                  isSubscribed ?
                      <NegativeButton label = "Unsubscribe" onClick = {unsubscribeAlbum} /> :
                      <PositiveButton label = "Subscribe" onClick = {subscribeAlbum} />
              )
          }
        </div>
      </div>
      <Grid>
        {pageItems.map(s => (
          <Card key={s.contentId} title={s.title} imageUrl={s.imageUrl} onClick={() => {
              navigate(`/songs/${s.contentId}`);
          }} />
        ))}
      </Grid>
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
