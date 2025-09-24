import React, {type CSSProperties, useEffect, useMemo, useState} from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../shared/components/Card";
import { Pagination } from "../../shared/components/Pagination";
import { BackButton } from "../../shared/components/BackButton";
import { Grid } from "../../shared/components/Grid";
import { Section } from "../../shared/components/Section";
import type {AlbumCard, ArtistCard} from "../models/music-models.ts";
import {getAlbumsForGenre, getArtistsForGenre, getGenres} from "../services/genres-service.ts";

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [artists, setArtists] = useState<ArtistCard[]>([]);
  const [albumPage, setAlbumPage] = useState(1);
  const [artistPage, setArtistPage] = useState(1);
  const pageSize = 6;

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const genres: string[] = await getGenres();
                setGenres(genres);

                if (genres.length > 0) {
                    setSelectedGenre(genres[0]);
                }
            } catch (err: any) {
                console.log(err)
                alert("An error occurred while fetching genres: " + err.message);
            }
        };

        fetchGenres();
    }, []);

  const loadForGenre = async () => {
      if (!selectedGenre) return;

      let albums: AlbumCard[] = [];
      let artists: ArtistCard[] = [];
      try {
          albums = await getAlbumsForGenre(selectedGenre);
      } catch (err: any) {
          alert("An error occurred while fetching albums: " + err.message);
          return;
      }

      try {
          artists = await getArtistsForGenre(selectedGenre);
      } catch (err: any) {
          alert("An error occurred while fetching artists: " + err.message);
          return;
      }

      setAlbums(albums);
      setArtists(artists);
  }

  useEffect(() => {
      loadForGenre()
  }, [selectedGenre])

  const albumPageItems = useMemo(() => paginate(albums, albumPage, pageSize), [albums, albumPage]);
  const artistPageItems = useMemo(() => paginate(artists, artistPage, pageSize), [artists, artistPage]);

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BackButton />
          <h2 style={{ margin: 0 }}>Discover Music</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="genre">Genre:</label>
          <select
            id="genre"
            value={selectedGenre ?? ""}
            onChange={(e) => { setSelectedGenre(e.target.value); setAlbumPage(1); setArtistPage(1); }}
            style={selectStyle}
          >
            {genres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedGenre && (
        <div style={{ marginBottom: 20, color: "#94a3b8" }}>
          Explore albums and artists in {selectedGenre}
        </div>
      )}

      <Section title="Albums">
        <Grid>
          {albumPageItems.map(al => (
            <Card key={al.id} title={al.name} imageUrl={al.imageUrl}
                  onClick={() => navigate(`/albums/${al.id}`, {
                      state: { name: al.name }
                  })} />
          ))}
        </Grid>
        <Pagination total={albums.length} pageSize={pageSize} page={albumPage} onChange={setAlbumPage} />
      </Section>

      <Section title="Artists">
        <Grid>
          {artistPageItems.map(ar => (
            <Card key={ar.id} title={ar.name} imageUrl={ar.imageUrl}
                  onClick={() => navigate(`/artists/${ar.id}`, {
                    state: {name: ar.name}
                })} />
          ))}
        </Grid>
        <Pagination total={artists.length} pageSize={pageSize} page={artistPage} onChange={setArtistPage} />
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


