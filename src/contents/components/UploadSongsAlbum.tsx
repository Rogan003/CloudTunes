import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { getAllArtists, uploadContent } from "../service/content-service.ts";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../../shared/components/buttons.tsx";
import type {UploadContentRequest} from "../models/aws-calls.ts";

interface Track {
    id: string;
    title: string;
    imageUrl: string;
    genres: string[];
    artistIds: string[];
    fileBase64: string;
    filename: string;
    filesize: number;
}

export const UploadSongsAlbum = () => {
    const navigate = useNavigate();

    const [albumName, setAlbumName] = useState("");

    // Artists (global list)
    const [artists, setArtists] = useState<Array<{ id: string; name: string }>>([]);

    // Current track being composed
    const [currentTrack, setCurrentTrack] = useState<{
        title: string;
        imageUrl: string;
        genres: string[];
        artistIds: string[];
        file: File | null;
    }>({
        title: "",
        imageUrl: "",
        genres: [],
        artistIds: [],
        file: null,
    });

    // For genre input
    const [genreInput, setGenreInput] = useState("");

    // Tracks list
    const [tracks, setTracks] = useState<Track[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const artistsRes = await getAllArtists();
                if (!cancelled) {
                    setArtists(artistsRes);
                }
            } catch {
                if (!cancelled) {
                    setArtists([]);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleArtist = (id: string) => {
        setCurrentTrack((prev) => ({
            ...prev,
            artistIds: prev.artistIds.includes(id)
                ? prev.artistIds.filter((x) => x !== id)
                : [...prev.artistIds, id],
        }));
    };

    const addGenre = () => {
        const g = genreInput.trim();
        if (g && !currentTrack.genres.includes(g)) {
            setCurrentTrack((prev) => ({
                ...prev,
                genres: [...prev.genres, g],
            }));
        }
        setGenreInput("");
    };

    const removeGenre = (g: string) => {
        setCurrentTrack((prev) => ({
            ...prev,
            genres: prev.genres.filter((x) => x !== g),
        }));
    };

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setCurrentTrack((prev) => ({ ...prev, file: f }));
    };

    const addTrackToList = async () => {
        if (!currentTrack.title.trim()) {
            alert("Please enter a track title");
            return;
        }
        if (currentTrack.genres.length === 0) {
            alert("Please add at least one genre for this track");
            return;
        }
        if (currentTrack.artistIds.length === 0) {
            alert("Please select at least one artist for this track");
            return;
        }
        if (!currentTrack.file) {
            alert("Please select an audio file");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1] || "";

            const newTrack: Track = {
                id: crypto.randomUUID(),
                title: currentTrack.title.trim(),
                imageUrl: currentTrack.imageUrl.trim(),
                genres: [...currentTrack.genres],
                artistIds: [...currentTrack.artistIds],
                fileBase64: base64,
                filename: currentTrack.file!.name,
                filesize: currentTrack.file!.size,
            };

            setTracks((prev) => [...prev, newTrack]);

            // Clear inputs for next track
            setCurrentTrack({
                title: "",
                imageUrl: "",
                genres: [],
                artistIds: [],
                file: null,
            });
            setGenreInput("");
        };
        reader.readAsDataURL(currentTrack.file);
    };

    const removeTrack = (id: string) => {
        setTracks((prev) => prev.filter((t) => t.id !== id));
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!albumName.trim()) {
            alert("Please enter an album name");
            return;
        }
        if (tracks.length === 0) {
            alert("Please add at least one track");
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            let createdAlbumId: string | undefined;

            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                setUploadProgress(`Uploading track ${i + 1}/${tracks.length}: ${track.title}...`);

                const payload: UploadContentRequest = {
                    title: track.title,
                    imageUrl: track.imageUrl || undefined,
                    genres: track.genres,
                    artistIds: track.artistIds,
                    fileBase64: track.fileBase64,
                };

                if (i === 0) {
                    // First track creates the album
                    payload.albumName = albumName.trim();
                } else {
                    payload.albumId = createdAlbumId;
                    payload.albumName = albumName.trim();
                }

                const result = await uploadContent(payload);

                // Capture albumId from first upload
                if (i === 0 && result.albumId) {
                    createdAlbumId = result.albumId;
                }
            }

            setMessage(`✅ Successfully uploaded ${tracks.length} tracks to album "${albumName}"!`);
            setTimeout(() => navigate("/"), 2000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setMessage("❌ Upload failed: " + msg);
        } finally {
            setSubmitting(false);
            setUploadProgress("");
        }
    };

    return (
        <div style={styles.page}>
            <div style={{ position: "fixed", top: 16, left: 16 }}>
                <BackButton />
            </div>
            <div style={styles.card}>
                <h2 style={{ margin: 0, color: "#223d77" }}>Upload Whole Album</h2>
                <p style={{ marginTop: 6, color: "#667085" }}>
                    Add tracks to the list, then upload them all as one album.
                </p>

                <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
                    {/* Album Name */}
                    <div style={styles.field}>
                        <label style={styles.label}>Album Name</label>
                        <input
                            style={styles.input}
                            placeholder="Album name"
                            value={albumName}
                            onChange={(e) => setAlbumName(e.target.value)}
                        />
                    </div>

                    {/* Add Track Section */}
                    <div style={{ ...styles.card, background: "#f9fafb", padding: 16 }}>
                        <h3 style={{ margin: "0 0 12px 0", color: "#636363" }}>Add Track</h3>
                        <div style={{ display: "grid", gap: 12 }}>
                            {/* Song Title */}
                            <div style={styles.field}>
                                <label style={styles.label}>Song Title</label>
                                <input
                                    style={styles.input}
                                    placeholder="Track title"
                                    value={currentTrack.title}
                                    onChange={(e) =>
                                        setCurrentTrack((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                />
                            </div>

                            {/* Image URL */}
                            <div style={styles.field}>
                                <label style={styles.label}>Song Cover URL</label>
                                <input
                                    style={styles.input}
                                    placeholder="https://..."
                                    value={currentTrack.imageUrl}
                                    onChange={(e) =>
                                        setCurrentTrack((prev) => ({ ...prev, imageUrl: e.target.value }))
                                    }
                                />
                            </div>

                            {/* Genres */}
                            <div style={styles.field}>
                                <label style={styles.label}>Genres</label>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input
                                        style={{ ...styles.input, flex: 1 }}
                                        placeholder="Type a genre and click Add"
                                        value={genreInput}
                                        onChange={(e) => setGenreInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addGenre();
                                            }
                                        }}
                                    />
                                    <button type="button" onClick={addGenre} style={styles.secondaryBtn}>
                                        Add
                                    </button>
                                </div>
                                {currentTrack.genres.length > 0 && (
                                    <div style={styles.chips}>
                                        {currentTrack.genres.map((g) => (
                                            <span key={g} style={styles.chip}>
                                                {g}
                                                <button
                                                    type="button"
                                                    onClick={() => removeGenre(g)}
                                                    style={styles.chipRemove}
                                                    aria-label={`Remove ${g}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Artists */}
                            <div style={styles.field}>
                                <label style={styles.label}>Artists</label>
                                <div style={styles.artistList}>
                                    {artists.map((ar) => {
                                        const selected = currentTrack.artistIds.includes(ar.id);
                                        return (
                                            <button
                                                key={ar.id}
                                                type="button"
                                                onClick={() => toggleArtist(ar.id)}
                                                style={{
                                                    ...styles.artistItem,
                                                    ...(selected ? styles.artistItemSelected : {}),
                                                }}
                                            >
                                                <span>{ar.name}</span>
                                                <span style={styles.artistCheck}>{selected ? "✓" : ""}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Audio File */}
                            <div style={styles.field}>
                                <label style={styles.label}>Audio File</label>
                                <input style={styles.input} type="file" accept="audio/*" onChange={onFileChange} />
                            </div>

                            <button type="button" onClick={addTrackToList} style={styles.secondaryBtn}>
                                Add to List ({tracks.length})
                            </button>
                        </div>
                    </div>

                    {/* Tracks List */}
                    {tracks.length > 0 && (
                        <div style={styles.field}>
                            <label style={styles.label}>Tracks ({tracks.length})</label>
                            <div style={styles.tracksList}>
                                {tracks.map((track, idx) => (
                                    <div key={track.id} style={styles.trackItem}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: "#111827" }}>
                                                {idx + 1}. {track.title}
                                            </div>
                                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                {track.filename} ({Math.round(track.filesize / 1024)} KB)
                                            </div>
                                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                                                Genres: {track.genres.join(", ")} | Artists: {track.artistIds.length}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeTrack(track.id)}
                                            style={styles.removeTrackBtn}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploadProgress && (
                        <div style={{ ...styles.help, color: "#4660e5", fontWeight: 600 }}>
                            {uploadProgress}
                        </div>
                    )}

                    {/* Submit */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            style={styles.secondaryBtn}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button type="submit" style={styles.primaryBtn} disabled={submitting || tracks.length === 0}>
                            {submitting ? "Uploading..." : `Upload Album (${tracks.length} tracks)`}
                        </button>
                    </div>
                </form>

                {message && (
                    <div style={styles.result} aria-live="polite">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        maxWidth: 900,
        margin: "24px auto",
        padding: "0 16px",
    },
    card: {
        background: "#dddddd",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },
    field: { display: "grid", gap: 8 },
    label: { fontWeight: 600, color: "#636363" },
    input: {
        background: "#f9fafb",
        border: "1px solid #d1d5db",
        color: "#636363",
        borderRadius: 8,
        padding: "10px 12px",
        outline: "none",
        fontSize: 14,
    },
    help: { marginTop: 6, color: "#6b7280", fontSize: 12 },
    chips: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
    chip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "#6b7280",
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: 15,
        padding: "9px 11px",
        fontSize: 12,
    },
    chipRemove: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        paddingLeft: 4,
        color: "#6b7280",
        fontSize: 14,
        lineHeight: 1,
    },
    artistList: {
        display: "grid",
        gap: 8,
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    },
    artistItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "10px 12px",
        background: "#8299f4",
        cursor: "pointer",
    },
    artistItemSelected: {
        borderColor: "#6880e6",
        background: "#6880e6",
    },
    artistCheck: { color: "#38538e", fontWeight: 700 },
    tracksList: {
        display: "grid",
        gap: 8,
    },
    trackItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
    },
    removeTrackBtn: {
        padding: "6px 12px",
        background: "#dc2626",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
    },
    primaryBtn: {
        background: "#4660e5",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: 600,
    },
    secondaryBtn: {
        background: "#f3f4f6",
        color: "#111827",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: 600,
    },
    result: {
        marginTop: 16,
        background: "#0b1020",
        color: "#d1e3ff",
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
    },
};