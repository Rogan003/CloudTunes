import React, {type CSSProperties, useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";
import {BackButton, NegativeButton, PositiveButton} from "../../shared/components/buttons.tsx";
import { Grid } from "../../shared/components/Grid";
import type {ContentCard} from "../../shared/models/content-models.ts";
import {getSongsForArtist} from "../services/content-service.ts";
import {TokenStorage} from "../../users/services/user-token-storage-service.ts";
import {jwtDecode} from "jwt-decode";
import type {DecodedIdToken} from "../../users/models/aws-calls.ts";
import {getIsSubscribed, subscribe, unsubscribe} from "../services/subscription-service.ts";

export const ArtistSongsPage: React.FC = () => {
  const { artistId } = useParams();
  const { name } = useLocation().state || {};
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [artistSongs, setArtistSongs] = useState<ContentCard[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const token = TokenStorage.getIdToken();
        if (!token) {
            throw new Error("Not authenticated");
        }

        const decoded = jwtDecode<DecodedIdToken>(token);
        setUserId(decoded.key);
        if (!userId || !artistId) return;

        const fetchSongsForArtist = async () => {
            try {
                if (!artistId) return;

                const songs: ContentCard[] = await getSongsForArtist(artistId);
                setArtistSongs(songs);
            } catch (err: any) {
                alert("An error occurred while fetching artist songs: " + err.message);
            }
        };

        fetchSongsForArtist();
        getIsSubscribed(userId, "artist", artistId).then(setIsSubscribed);
    }, []);

  const pageItems = useMemo(() => paginate(artistSongs, page, pageSize), [artistSongs, page]);

    const subscribeArtist = () => {
        if (!userId || !artistId) return;

        subscribe(userId, "artist", artistId).then(() => {
            setIsSubscribed(true);
        });
    }

    const unsubscribeArtist = () => {
        if (!userId || !artistId) return;

        unsubscribe(userId, "artist", artistId).then(() => {
            setIsSubscribed(false);
        });
    }

  if (!artistId) {
    return <div style={wrap}><p>Artist not found.</p><button onClick={() => navigate(-1)}>Back</button></div>;
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>Songs by {name}</h2>
          {
              artistId &&
              (
                  isSubscribed ?
                      <NegativeButton label = "Unsubscribe" onClick = {unsubscribeArtist} /> :
                      <PositiveButton label = "Subscribe" onClick = {subscribeArtist} />
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
