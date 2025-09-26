import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {getAllAlbums, getAllArtists, uploadContent} from "../service/content-service.ts";
import {useNavigate} from "react-router-dom";

export const UploadContent = () => {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Albums
    const [albums, setAlbums] = useState<Array<{ id: string; name: string; imageUrl?: string }>>([]);
    const [albumMode, setAlbumMode] = useState<"existing" | "new">("existing");
    const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
    const [newAlbumName, setNewAlbumName] = useState<string>("");

    // Artists
    const [artists, setArtists] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
    const toggleArtist = (id: string) =>
        setSelectedArtistIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    // Genres
    const [genreInput, setGenreInput] = useState("");
    const [genres, setGenres] = useState<string[]>([]);
    const addGenre = () => {
        const g = genreInput.trim();
        if (g && !genres.includes(g)) setGenres((prev) => [...prev, g]);
        setGenreInput("");
    };
    const removeGenre = (g: string) => setGenres((prev) => prev.filter((x) => x !== g));

    // File
    const [file, setFile] = useState<File | null>(null);
    const [fileBase64, setFileBase64] = useState<string>("");
    const [fileInfo, setFileInfo] = useState<{ name?: string; type?: string; size?: number }>({});
    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setFile(f || null);
        if (!f) {
            setFileBase64("");
            setFileInfo({});
            return;
        }
        setFileInfo({ name: f.name, type: f.type, size: f.size });
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // result is data:<mime>;base64,<payload>
            const base64 = result.split(",")[1] || "";
            setFileBase64(base64);
        };
        reader.readAsDataURL(f);
    };

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [albumsRes, artistsRes] = await Promise.all([getAllAlbums(), getAllArtists()]);
                if (!cancelled) {
                    setAlbums(albumsRes);
                    setArtists(artistsRes);

                    if (albumsRes.length > 0) {
                        setAlbumMode("existing");
                        if (!selectedAlbumId) setSelectedAlbumId(albumsRes[0].id);
                    } else {
                        setAlbumMode("new");
                        setSelectedAlbumId("");
                    }
                }
            } catch {
                if (!cancelled) {
                    setAlbums([]);
                    setArtists([]);

                    setAlbumMode("new");
                    setSelectedAlbumId("");
                }
            }
        };

        void load();
        return () => { cancelled = true; };
    }, []);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setMessage(null);

        try {
            const payload: any = {
                title: title.trim(),
                imageUrl: imageUrl.trim() || undefined,
                genres,
                artistIds: selectedArtistIds,
                fileBase64,
            };
            if (albumMode === "existing") {
                payload.albumId = selectedAlbumId;
            } else {
                payload.albumName = newAlbumName.trim();
            }

            const result = await uploadContent(payload);
            setMessage("✅ Upload succeeded: " + JSON.stringify(result, null, 2));
            navigate("/");

        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            setMessage("❌ Upload failed: " + msg);

        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={{ margin: 0, color: "#223d77"}}>Upload Content</h2>
                <p style={{ marginTop: 6, color: "#667085" }}>Add a new track with album, artists, and genres.</p>

                <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
                    {/* Title */}
                    <div style={styles.field}>
                        <label style={styles.label}>Title</label>
                        <input style={styles.input} placeholder="Song title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    {/* Artwork URL */}
                    <div style={styles.field}>
                        <label style={styles.label}>Image URL</label>
                        <input
                            style={styles.input}
                            placeholder="https://..."
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>

                    {/* Album */}
                    <div style={styles.field}>
                        <label style={styles.label}>Album</label>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <label style={styles.radio}>
                                <input
                                    type="radio"
                                    name="albumMode"
                                    value="existing"
                                    checked={albumMode === "existing"}
                                    onChange={() => setAlbumMode("existing")}
                                />
                                <span>Existing</span>
                            </label>
                            <label style={styles.radio}>
                                <input
                                    type="radio"
                                    name="albumMode"
                                    value="new"
                                    checked={albumMode === "new"}
                                    onChange={() => setAlbumMode("new")}
                                />
                                <span>Create new</span>
                            </label>
                        </div>

                        {albumMode === "existing" ? (
                            <div style={{ ...styles.albumGrid, marginTop: 8 }}>
                                {albums.map((a) => {
                                    const selected = selectedAlbumId === a.id;
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => setSelectedAlbumId(a.id)}
                                            style={{ ...styles.albumCard, ...(selected ? styles.albumCardSelected : {}) }}
                                            title={a.name}
                                        >
                                            <img
                                                src={a.imageUrl || "https://via.placeholder.com/80?text=Album"}
                                                alt={a.name}
                                                style={styles.albumImg}
                                            />
                                            <div style={styles.albumName}>{a.name}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <input
                                style={{ ...styles.input, marginTop: 8 }}
                                placeholder="New album name"
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                            />
                        )}
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
                        {genres.length > 0 && (
                            <div style={styles.chips}>
                                {genres.map((g) => (
                                    <span key={g} style={styles.chip}>
                                    {g}
                                        <button type="button" onClick={() => removeGenre(g)} style={styles.chipRemove} aria-label={`Remove ${g}`}>
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
                                const selected = selectedArtistIds.includes(ar.id);
                                return (
                                    <button
                                        key={ar.id}
                                        type="button"
                                        onClick={() => toggleArtist(ar.id)}
                                        style={{ ...styles.artistItem, ...(selected ? styles.artistItemSelected : {}) }}
                                    >
                                        <span>{ar.name}</span>
                                        <span style={styles.artistCheck}>{selected ? "✓" : ""}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* File */}
                    <div style={styles.field}>
                        <label style={styles.label}>Audio File</label>
                        <input style={styles.input} type="file" accept="audio/*" onChange={onFileChange} />
                        {file && (
                            <div style={styles.help}>
                                Selected: {fileInfo.name} ({Math.round((fileInfo.size || 0) / 1024)} KB) — {fileInfo.type || "unknown"}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button type="submit" style={styles.primaryBtn}>
                            {submitting ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </form>

                {submitted && message && (
                    <pre style={styles.result} aria-live="polite">
            {message}
          </pre>
                )}
            </div>
        </div>
    );
};

const styles: Record<string, any> = {
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
    albumGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 15,
    },
    albumCard: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        padding: 10,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        cursor: "pointer",
        background: "#f6f6f6",
    },
    albumCardSelected: {
        borderColor: "#6880e6",
        background: "#eef2ff",
    },
    albumImg: { width: 120, height: 90, borderRadius: 8, objectFit: "cover" },
    albumName: { fontSize: 13, fontWeight: 600, textAlign: "center", color: "#808080"  },
    radio: { display: "inline-flex", alignItems: "center", gap: 8, color: "#6a6a6a" },
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
        maxHeight: 240,
        overflow: "auto",
    },
};
