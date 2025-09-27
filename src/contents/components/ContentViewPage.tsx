import { useEffect, useRef, useState, type ChangeEvent, type FC } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {deleteContent, editContent, getAllAlbums, getAllArtists, getContent, getRatingByUser, rateContent} from "../service/content-service";
import type { GetContentResponse } from "../models/aws-calls";
import { getFromCache, removeFromCache, saveToCache } from "../service/cache-service";

export const ContentView: FC = () => {
    const { contentId } = useParams();
    const navigate = useNavigate();
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [content, setContent] = useState<GetContentResponse | null>(null);
    const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDownloaded, setIsDownloaded] = useState(false);

    // ----- Edit Content part:
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string>("");
    const [albums, setAlbums] = useState<Array<{ id: string; name: string; imageUrl?: string }>>([]);
    const [albumMode, setAlbumMode] = useState<"existing" | "new">("existing");
    const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
    const [newAlbumName, setNewAlbumName] = useState<string>("");
    const [artists, setArtists] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
    const [genreInput, setGenreInput] = useState<string>("");
    const [genres, setGenres] = useState<string[]>([]);
    const toggleArtist = (id: string) => setSelectedArtistIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const addGenre = () => {
        const g = genreInput.trim();
        if (g && !genres.includes(g)) setGenres((prev) => [...prev, g]);
        setGenreInput("");
    };
    const removeGenre = (g: string) => setGenres((prev) => prev.filter((x) => x !== g));
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
            const base64 = result.split(",")[1] || "";
            setFileBase64(base64);
        };
        reader.readAsDataURL(f);
    };

    // ----- Ratings (1-5 stars) -----
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [submittingRating, setSubmittingRating] = useState<boolean>(false);

    const onSubmitRating = async () => {
        if (!content || !content.contentId) return;
        if (rating < 1 || rating > 5) {
            alert("Please select a rating from 1 to 5.");
            return;
        }
        try {
            setSubmittingRating(true);
            await rateContent(content.contentId, rating);
            alert("Thanks! Your rating has been recorded.");

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Failed to submit rating: ${msg}`);

        } finally {
            setSubmittingRating(false);
        }
    };

    // load the existing rating
    useEffect(() => {
        const loadRatings = async () => {
            if (!contentId) return;
            try {
                const r = await getRatingByUser(contentId);
                if (r) setRating(r.rating);

            } catch {
                // nothing
            }
        };
        void loadRatings();
    }, []);


    // ----- View Content part:
    useEffect(() => {
        const fetchContent = async () => {
            try {
                if (!contentId) return;

                const cached = await getFromCache(contentId);
                setIsDownloaded(!!cached);
                if (cached) setAudioFileUrl(URL.createObjectURL(cached));

                const content: GetContentResponse = await getContent(contentId);
                setContent(content);
                if (!audioFileUrl) setAudioFileUrl(content.fileUrl);

            } catch (err: any) {
                alert("An error occurred while fetching content: " + err.message);
            }
        };

        fetchContent();
    }, []);

    const toggleDownload = async () => {
        if (!content) return;
        if (isDownloaded) {
            await removeFromCache(content.contentId);
            setIsDownloaded(false);
        } else {
            const response = await fetch(content.fileUrl);
            const blob = await response.blob();
            await saveToCache(content.contentId, blob);
            handleDownload(blob, content.filename);
            setIsDownloaded(true);
        }
    };

    const handleDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    // ----- Edit Content part:
    useEffect(() => {
        if (!isEditing || !content) return;

        // load all current data
        setTitle(content.title ?? "");
        setImageUrl(content.imageUrl ?? "");
        setGenres(Array.isArray(content.genres) ? content.genres.slice() : []);
        setSelectedArtistIds(Array.isArray(content.artistIds) ? content.artistIds.slice() : []);

        if (content.albumId) {
            setAlbumMode("existing");
            setSelectedAlbumId(content.albumId);
            setNewAlbumName("");

        } else {
            setAlbumMode("new");
            setSelectedAlbumId("");
            setNewAlbumName(content.albumName ?? "");
        }

        // load albums and artists to select
        let cancelled = false;
        const load = async () => {
            try {
                const [albumsRes, artistsRes] = await Promise.all([getAllAlbums(), getAllArtists()]);
                if (!cancelled) {
                    setAlbums(albumsRes);
                    setArtists(artistsRes);
                    if (albumMode === "existing") {
                        const exists = albumsRes.some(a => a.id === (content.albumId ?? ""));
                        if (!exists && albumsRes.length > 0) setSelectedAlbumId(albumsRes[0].id);
                    }
                }

            } catch {
                if (!cancelled) {
                    setAlbums([]);
                    setArtists([]);
                }
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [isEditing]);

    // ----- View Content part:
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current || duration === 0) return;
        const percent = (audioRef.current.currentTime / duration) * 100;
        setProgress(percent);
    };

    const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current || duration === 0) return;
        const newTime = (parseFloat(e.target.value) / 100) * duration;
        audioRef.current.currentTime = newTime;
    };

    function formatTime(time: number): string {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    // ----- Edit Content part:
    const onEditStart = () => setIsEditing(true);
    const onEditCancel = () => setIsEditing(false);

    const onEditConfirm = async () => {
        if (!contentId) return;
        try {
            const update: {
                title?: string;
                imageUrl?: string;
                albumId?: string;
                albumName?: string;
                genres?: string[];
                artistIds?: string[];
                fileBase64?: string,
            } = {
                title: title.trim(),
                imageUrl: imageUrl.trim() || undefined,
                genres,
                artistIds: selectedArtistIds,
            };
            if (albumMode === "existing") {
                update.albumId = selectedAlbumId || undefined;
                update.albumName = undefined;
            } else {
                update.albumId = undefined;
                update.albumName = newAlbumName.trim() || undefined;
            }
            if (fileBase64) {
                update.fileBase64 = fileBase64;
            }

            const updated = await editContent(contentId, update);
            setContent(updated);
            setIsEditing(false);
            alert("Content updated.");

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Failed to edit content: ${msg}`);
        }
    };

    const onDelete = async () => {
        if (!contentId) return;
        if (!confirm("Are you sure you want to delete this content? This cannot be undone.")) return;
        try {
            await deleteContent(contentId);
            alert("Content deleted.");
            navigate("/");

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Failed to delete content: ${msg}`);
        }
    };

    if (isEditing) {
        return (
            <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
                <div style={{
                    background: "#dddddd",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}>
                    <h2 style={{ margin: 0, color: "#223d77"}}>Edit Content</h2>
                    <p style={{ marginTop: 6, color: "#667085" }}>Update track details, album, artists, and genres.</p>

                    <div style={{ display: "grid", gap: 16 }}>
                        {/* Title */}
                        <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ fontWeight: 600, color: "#636363" }}>Title</label>
                            <input
                                style={{
                                    background: "#f9fafb", border: "1px solid #d1d5db", color: "#636363",
                                    borderRadius: 8, padding: "10px 12px", outline: "none", fontSize: 14
                                }}
                                placeholder="Song title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Artwork URL */}
                        <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ fontWeight: 600, color: "#636363" }}>Image URL</label>
                            <input
                                style={{
                                    background: "#f9fafb", border: "1px solid #d1d5db", color: "#636363",
                                    borderRadius: 8, padding: "10px 12px", outline: "none", fontSize: 14
                                }}
                                placeholder="https://..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                            />
                        </div>

                        {/* Album */}
                        <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ fontWeight: 600, color: "#636363" }}>Album</label>
                            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6a6a6a" }}>
                                    <input
                                        type="radio"
                                        name="albumMode"
                                        value="existing"
                                        checked={albumMode === "existing"}
                                        onChange={() => setAlbumMode("existing")}
                                    />
                                    <span>Existing</span>
                                </label>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6a6a6a" }}>
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
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                                    gap: 15,
                                    marginTop: 8
                                }}>
                                    {albums.map((a) => {
                                        const selected = selectedAlbumId === a.id;
                                        return (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => setSelectedAlbumId(a.id)}
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 8,
                                                    alignItems: "center",
                                                    padding: 10,
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius: 12,
                                                    cursor: "pointer",
                                                    background: selected ? "#eef2ff" : "#f6f6f6",
                                                    borderColor: selected ? "#6880e6" : "#e5e7eb",
                                                }}
                                                title={a.name}
                                            >
                                                <img
                                                    src={a.imageUrl || "https://media.istockphoto.com/id/481475560/vector/vinyl-record-template.jpg?s=612x612&w=0&k=20&c=fZgBryspxNnRn8qMa1mEquff_T6wENAY1HXMtNEMyh4="}
                                                    alt={a.name}
                                                    style={{ width: 120, height: 90, borderRadius: 8, objectFit: "cover" }}
                                                />
                                                <div style={{ fontSize: 13, fontWeight: 600, textAlign: "center", color: "#808080" }}>
                                                    {a.name}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <input
                                    style={{
                                        background: "#f9fafb", border: "1px solid #d1d5db", color: "#636363",
                                        borderRadius: 8, padding: "10px 12px", outline: "none", fontSize: 14, marginTop: 8
                                    }}
                                    placeholder="New album name"
                                    value={newAlbumName}
                                    onChange={(e) => setNewAlbumName(e.target.value)}
                                />
                            )}
                        </div>

                        {/* Genres */}
                        <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ fontWeight: 600, color: "#636363" }}>Genres</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input
                                    style={{
                                        background: "#f9fafb", border: "1px solid #d1d5db", color: "#636363",
                                        borderRadius: 8, padding: "10px 12px", outline: "none", fontSize: 14, flex: 1
                                    }}
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
                                <button
                                    type="button"
                                    onClick={addGenre}
                                    style={{
                                        background: "#f3f4f6",
                                        color: "#111827",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                            {genres.length > 0 && (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                    {genres.map((g) => (
                                        <span
                                            key={g}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                color: "#6b7280",
                                                background: "#f3f4f6",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 15,
                                                padding: "9px 11px",
                                                fontSize: 12,
                                            }}
                                        >
                                            {g}
                                            <button
                                                type="button"
                                                onClick={() => removeGenre(g)}
                                                aria-label={`Remove ${g}`}
                                                style={{
                                                    border: "none",
                                                    background: "transparent",
                                                    cursor: "pointer",
                                                    padding: 0,
                                                    paddingLeft: 4,
                                                    color: "#6b7280",
                                                    fontSize: 14,
                                                    lineHeight: 1,
                                                }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Artists */}
                        <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ fontWeight: 600, color: "#636363" }}>Artists</label>
                            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                                {artists.map((ar) => {
                                    const selected = selectedArtistIds.includes(ar.id);
                                    return (
                                        <button
                                            key={ar.id}
                                            type="button"
                                            onClick={() => toggleArtist(ar.id)}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                background: selected ? "#6880e6" : "#8299f4",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <span>{ar.name}</span>
                                            <span style={{ color: "#38538e", fontWeight: 700 }}>{selected ? "✓" : ""}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* File (optional replace) */}
                        <div style={styles.field}>
                            <label style={styles.label}>Replace Audio File</label>
                            <input style={styles.input} type="file" accept="audio/*" onChange={onFileChange} />
                            {file && (
                                <div style={styles.help}>
                                    Selected: {fileInfo.name} ({Math.round((fileInfo.size || 0) / 1024)} KB) — {fileInfo.type || "unknown"}
                                </div>
                            )}
                            {!file && content?.fileUrl && (
                                <div style={styles.help}>
                                    Current file: <a href={content.fileUrl} target="_blank" rel="noreferrer">listen</a>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                            <button
                                type="button"
                                onClick={onEditCancel}
                                style={{
                                    background: "#f3f4f6",
                                    color: "#111827",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                Exit
                            </button>
                            <button
                                type="button"
                                onClick={onEditConfirm}
                                style={{
                                    background: "#10b981",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ----- View Content part:
    return (
        <div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={toggleDownload}>
                    {isDownloaded ? "Remove from offline" : "Download for offline"}
                </button>
            </div>
            <div
                style={{
                    display: "flex",
                    padding: "1.5rem",
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                {/* Left side - content info */}
                <div style={{ flex: 1, textAlign: "center" }}>
                    <h2 style={{ margin: "0 0 0.5rem" }}>{content?.title}</h2>
                    <p style={{ margin: "0.3rem 0" }}>
                        <strong>Album:</strong> {content?.albumName}
                    </p>
                    <p style={{ margin: "0.3rem 0" }}>
                        <strong>Genres:</strong> {content?.genres.join(", ")}
                    </p>
                    <p style={{ margin: "0.3rem 0" }}>
                        <strong>Filesize:</strong> {content?.filesize}
                    </p>
                    <p style={{ margin: "0.3rem 0" }}>
                        <strong>Uploaded:</strong>
                        {content !== null ? new Date(content?.createdAt).toLocaleString() : new Date().toLocaleDateString()}
                    </p>

                    {/* Edit, Delete and Rate Content buttons */}
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={onEditStart}
                            style={{
                                background: "#10b981",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "0.5rem 1rem",
                                cursor: "pointer",
                            }}
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            onClick={onDelete}
                            style={{
                                background: "#ef4444",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "0.5rem 1rem",
                                cursor: "pointer",
                            }}
                        >
                            Delete
                        </button>
                    </div>

                    {/* Ratings */}
                    <div style={{ marginTop: 16, display: "grid", gap: 8, placeItems: "center" }}>
                        <div style={{ fontWeight: 600 }}>Rate this song</div>
                        <div style={{ display: "flex", gap: 6 }}>
                            {[1, 2, 3, 4, 5].map((star) => {
                                const active = (hoverRating || rating) >= star;
                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                        style={{
                                            cursor: "pointer",
                                            fontSize: 24,
                                            lineHeight: 1,
                                            border: "none",
                                            background: "transparent",
                                            color: active ? "#fbbf24" : "#d1d5db",
                                        }}
                                    >
                                        ★
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button
                                type="button"
                                onClick={onSubmitRating}
                                disabled={submittingRating}
                                style={{
                                    background: submittingRating ? "#93c5fd" : "#3b82f6",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    cursor: submittingRating ? "not-allowed" : "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                {submittingRating ? "Submitting..." : "Submit rating"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right side - image and player */}
                <div style={{ flex: 1, textAlign: "center" }}>
                    {content?.imageUrl && (
                        <img
                            src={content.imageUrl}
                            alt={content.title}
                            style={{
                                maxWidth: "220px",
                                width: "100%",
                                borderRadius: 12,
                                marginBottom: "1rem",
                            }}
                        />
                    )}

                    {/* Audio player */}
                    {audioFileUrl && (
                        <audio
                            ref={audioRef}
                            src={audioFileUrl}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={() => setIsPlaying(false)}
                        />
                    )}

                    <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
                        <button
                            onClick={togglePlay}
                            style={{
                                background: "#1d4ed8",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "0.5rem 1rem",
                                cursor: "pointer",
                            }}
                        >
                            {isPlaying ? "Pause" : "Play"}
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={handleSeek}
                            style={{ flex: 1 }}
                        />
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, any> = {
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
};