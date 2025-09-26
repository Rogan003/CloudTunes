import React, {type CSSProperties, useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";
import { BackButton } from "../../shared/components/buttons.tsx";
import { Grid } from "../../shared/components/Grid";
import type {ContentCard} from "../../shared/models/content-models.ts";
import {getSongsForArtist} from "../services/content-service.ts";

export const ArtistSongsPage: React.FC = () => {
  const { artistId } = useParams();
  const { name } = useLocation().state || {};
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [artistSongs, setArtistSongs] = useState<ContentCard[]>([]);

    useEffect(() => {
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
    }, []);

  const pageItems = useMemo(() => paginate(artistSongs, page, pageSize), [artistSongs, page]);

  if (!artistId) {
    return <div style={wrap}><p>Artist not found.</p><button onClick={() => navigate(-1)}>Back</button></div>;
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>Songs by {name}</h2>
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
