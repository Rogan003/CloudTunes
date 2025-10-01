import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {globalSignOut} from "../../users/services/login-service.ts";
import {TokenStorage} from "../../users/services/user-token-storage-service.ts";
import { AuthService } from "../../users/services/auth-service";
import {getFeed} from "../../music/services/feed-service.ts";
import {deleteAlbum, deleteArtist, deleteContent, getAllAlbums, getAllArtists, getAllContents} from "../../contents/service/content-service.ts";
import type {ContentCard} from "../../shared/models/content-models.ts";
import type {AlbumCard, ArtistCard} from "../../music/models/music-models.ts";

interface FeedItem {
    contentId: string;
    score: number;
    title?: string;
    imageUrl?: string;
}

type AdminTab = "songs" | "albums" | "artists";

export const Home = () => {
    useEffect(() => {
        if (!TokenStorage.getAccessToken()) {
            navigate("/login")
        }
        if (isUser) {
            loadFeed();
        }
        if (isAdmin) {
            loadAdminData();
        }
    }, [])

    const navigate = useNavigate()

    const logout = () => {
        globalSignOut(TokenStorage.getAccessToken()!)
        TokenStorage.clearTokens()
        navigate("/login")
    }

    const createArtist = () => {
        navigate("/create-artist")
    }

    const uploadContent = () => {
        navigate("/upload-content")
    }

    const uploadSongsAlbum = () => {
        navigate("/upload-songs-album")
    }

    const seeSubscriptions = () => {
        navigate("/subscriptions")
    }

    const discoverContent = () => {
        navigate("/discover")
    }

    const loadFeed = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getFeed();
            setFeedItems(response.items || []);
        } catch (err) {
            console.error("Failed to load feed:", err);
            setError("Failed to load your personalized feed");
        } finally {
            setLoading(false);
        }
    };

    const loadAdminData = async () => {
        setAdminLoading(true);
        try {
            const [albums, artists, songs] = await Promise.all([
                getAllAlbums(),
                getAllArtists(),
                getAllContents()
            ]);
            setAllAlbums(albums);
            setAllArtists(artists);
            setAllSongs(songs);

        } catch (err) {
            console.error("Failed to load admin data:", err);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleDeleteSong = async (contentId: string, title: string) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        try {
            await deleteContent(contentId);
            setAllSongs(prev => prev.filter(s => s.contentId !== contentId));
        } catch (err) {
            alert("Failed to delete song: " + (err instanceof Error ? err.message : "Unknown error"));
        }
    };

    const handleDeleteAlbum = async (albumId: string, name: string) => {
        if (!window.confirm(`Delete album "${name}"? This will also delete all songs in it.`)) return;
        try {
            await deleteAlbum(albumId);
            setAllAlbums(prev => prev.filter(a => a.id !== albumId));
            // Reload songs since they've been deleted too
            await loadAdminData();
        } catch (err) {
            alert("Failed to delete album: " + (err instanceof Error ? err.message : "Unknown error"));
        }
    };

    const handleDeleteArtist = async (artistId: string, name: string) => {
        if (!window.confirm(`Delete artist "${name}"? This will remove them from all songs.`)) return;
        try {
            await deleteArtist(artistId);
            setAllArtists(prev => prev.filter(a => a.id !== artistId));
        } catch (err) {
            alert("Failed to delete artist: " + (err instanceof Error ? err.message : "Unknown error"));
        }
    };


    // Pagination helpers
    const paginateSongs = () => {
        const start = songsPage * itemsPerPage;
        return allSongs.slice(start, start + itemsPerPage);
    };

    const paginateAlbums = () => {
        const start = albumsPage * itemsPerPage;
        return allAlbums.slice(start, start + itemsPerPage);
    };

    const paginateArtists = () => {
        const start = artistsPage * itemsPerPage;
        return allArtists.slice(start, start + itemsPerPage);
    };

    const viewSong = (contentId: string) => {
        navigate(`/songs/${contentId}`);
    };

    const isUser = AuthService.hasRole("user");
    const isAdmin = AuthService.hasRole("admin");

    // User feed state
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Admin state
    const [activeTab, setActiveTab] = useState<AdminTab>("songs");
    const [allSongs, setAllSongs] = useState<ContentCard[]>([]);
    const [allAlbums, setAllAlbums] = useState<AlbumCard[]>([]);
    const [allArtists, setAllArtists] = useState<ArtistCard[]>([]);
    const [adminLoading, setAdminLoading] = useState(false);

    // Pagination state
    const [songsPage, setSongsPage] = useState(0);
    const [albumsPage, setAlbumsPage] = useState(0);
    const [artistsPage, setArtistsPage] = useState(0);
    const itemsPerPage = 12;

    const totalSongsPages = Math.ceil(allSongs.length / itemsPerPage);
    const totalAlbumsPages = Math.ceil(allAlbums.length / itemsPerPage);
    const totalArtistsPages = Math.ceil(allArtists.length / itemsPerPage);

    return (
        <div style={{ padding: 24, color: "#e5e7eb" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <button onClick={() => logout()}>Logout</button>
                {isAdmin && <button onClick={() => createArtist()}>Create Artist</button>}
                {isAdmin && <button onClick={() => uploadContent()}>Upload Content</button>}
                {isAdmin && <button onClick={() => uploadSongsAlbum()}>Upload Whole Album</button>}
                {isUser && <button onClick={() => seeSubscriptions()}>My Subscriptions</button>}
                {isUser && <button onClick={() => discoverContent()}>Discover</button>}
            </div>

            {/* Feed section for users */}
            {isUser && (
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 600 }}>
                            Your Personalized Feed
                        </h2>
                        <button
                            onClick={loadFeed}
                            style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                            disabled={loading}
                        >
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            padding: 16,
                            marginBottom: 24,
                            background: "#7f1d1d",
                            borderRadius: 8,
                            color: "#fecaca"
                        }}>
                            {error}
                        </div>
                    )}

                    {loading && feedItems.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
                            Loading your feed...
                        </div>
                    ) : feedItems.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: 48,
                            background: "#1f2937",
                            borderRadius: 12,
                            color: "#9ca3af"
                        }}>
                            <p style={{ marginBottom: 16 }}>No content in your feed yet!</p>
                            <p style={{ fontSize: "0.9rem" }}>
                                Start by subscribing to artists, albums, or genres to get personalized recommendations.
                            </p>
                            <button
                                onClick={discoverContent}
                                style={{ marginTop: 16 }}
                            >
                                Discover Content
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: 24
                        }}>
                            {feedItems.slice(0, 10).map((item, index) => (
                                <div
                                    key={item.contentId}
                                    onClick={() => viewSong(item.contentId)}
                                    style={{
                                        background: "#1f2937",
                                        borderRadius: 12,
                                        padding: 16,
                                        cursor: "pointer",
                                        transition: "transform 0.2s, box-shadow 0.2s",
                                        position: "relative"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-4px)";
                                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    {/* Rank badge */}
                                    <div style={{
                                        position: "absolute",
                                        top: 8,
                                        left: 8,
                                        background: "#2563eb",
                                        color: "white",
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.75rem",
                                        fontWeight: 600
                                    }}>
                                        {index + 1}
                                    </div>

                                    {/* Image placeholder */}
                                    <div style={{
                                        width: "100%",
                                        paddingBottom: "100%",
                                        background: item.imageUrl
                                            ? `url(${item.imageUrl}) center/cover`
                                            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        borderRadius: 8,
                                        marginBottom: 12
                                    }} />

                                    {/* Title */}
                                    <h3 style={{
                                        margin: "0 0 8px 0",
                                        fontSize: "1rem",
                                        fontWeight: 600,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap"
                                    }}>
                                        {item.title || `Song ${item.contentId.substring(0, 8)}`}
                                    </h3>

                                    {/* Score */}
                                    <p style={{
                                        margin: 0,
                                        fontSize: "0.875rem",
                                        color: "#9ca3af"
                                    }}>
                                        Score: {Math.round(item.score)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Admin Panel */}
            {isAdmin && (
                <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: 24 }}>
                        Admin Panel
                    </h2>

                    {/* Tabs */}
                    <div style={styles.tabs}>
                        <button
                            onClick={() => setActiveTab("songs")}
                            style={{ ...styles.tab, ...(activeTab === "songs" ? styles.tabActive : {}) }}
                        >
                            Songs ({allSongs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("albums")}
                            style={{ ...styles.tab, ...(activeTab === "albums" ? styles.tabActive : {}) }}
                        >
                            Albums ({allAlbums.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("artists")}
                            style={{ ...styles.tab, ...(activeTab === "artists" ? styles.tabActive : {}) }}
                        >
                            Artists ({allArtists.length})
                        </button>
                    </div>

                    {adminLoading ? (
                        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>Loading...</div>
                    ) : (
                        <>
                            {/* Songs Tab */}
                            {activeTab === "songs" && (
                                <div>
                                    <div style={styles.grid}>
                                        {paginateSongs().map((song) => (
                                            <div key={song.contentId} style={styles.adminCard}>
                                                <div
                                                    onClick={() => viewSong(song.contentId)}
                                                    style={{
                                                        ...styles.cardImage,
                                                        background: song.imageUrl ? `url(${song.imageUrl}) center/cover` : styles.gradientBg,
                                                        cursor: "pointer"
                                                    }}
                                                />
                                                <h3 style={styles.cardTitle}>{song.title}</h3>
                                                <div style={styles.cardActions}>
                                                    <button onClick={() => handleDeleteSong(song.contentId, song.title)} style={styles.deleteBtn}>Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {totalSongsPages > 1 && (
                                        <div style={styles.pagination}>
                                            <button
                                                onClick={() => setSongsPage(p => Math.max(0, p - 1))}
                                                disabled={songsPage === 0}
                                                style={styles.pageBtn}
                                            >
                                                Previous
                                            </button>
                                            <span style={{ color: "#9ca3af" }}>
                                                Page {songsPage + 1} of {totalSongsPages}
                                            </span>
                                            <button
                                                onClick={() => setSongsPage(p => Math.min(totalSongsPages - 1, p + 1))}
                                                disabled={songsPage >= totalSongsPages - 1}
                                                style={styles.pageBtn}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Albums Tab */}
                            {activeTab === "albums" && (
                                <div>
                                    <div style={styles.grid}>
                                        {paginateAlbums().map((album) => (
                                            <div key={album.id} style={styles.adminCard}>
                                                <div
                                                    onClick={() => navigate(`/albums/${album.id}`)}
                                                    style={{
                                                        ...styles.cardImage,
                                                        background: album.imageUrl ? `url(${album.imageUrl}) center/cover` : styles.gradientBg,
                                                        cursor: "pointer"
                                                    }}
                                                />
                                                <h3 style={styles.cardTitle}>{album.name}</h3>
                                                <div style={styles.cardActions}>
                                                    <button onClick={() => handleDeleteAlbum(album.id, album.name)} style={styles.deleteBtn}>Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {totalAlbumsPages > 1 && (
                                        <div style={styles.pagination}>
                                            <button onClick={() => setAlbumsPage(p => Math.max(0, p - 1))} disabled={albumsPage === 0} style={styles.pageBtn}>
                                                Previous
                                            </button>
                                            <span style={{ color: "#9ca3af" }}>Page {albumsPage + 1} of {totalAlbumsPages}</span>
                                            <button onClick={() => setAlbumsPage(p => Math.min(totalAlbumsPages - 1, p + 1))} disabled={albumsPage >= totalAlbumsPages - 1} style={styles.pageBtn}>
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Artists Tab */}
                            {activeTab === "artists" && (
                                <div>
                                    <div style={styles.grid}>
                                        {paginateArtists().map((artist) => (
                                            <div key={artist.id} style={styles.adminCard}>
                                                <div
                                                    onClick={() => navigate(`/artists/${artist.id}`)}
                                                    style={{
                                                        ...styles.cardImage,
                                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "3rem"
                                                    }}
                                                >
                                                    🎤
                                                </div>
                                                <h3 style={styles.cardTitle}>{artist.name}</h3>
                                                <div style={styles.cardActions}>
                                                    <button onClick={() => handleDeleteArtist(artist.id, artist.name)} style={styles.deleteBtn}>Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {totalArtistsPages > 1 && (
                                        <div style={styles.pagination}>
                                            <button onClick={() => setArtistsPage(p => Math.max(0, p - 1))} disabled={artistsPage === 0} style={styles.pageBtn}>
                                                Previous
                                            </button>
                                            <span style={{ color: "#9ca3af" }}>Page {artistsPage + 1} of {totalArtistsPages}</span>
                                            <button onClick={() => setArtistsPage(p => Math.min(totalArtistsPages - 1, p + 1))} disabled={artistsPage >= totalArtistsPages - 1} style={styles.pageBtn}>
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, any> = {
    feedCard: {
        background: "#1f2937",
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative"
    },
    adminCard: {
        background: "#1f2937",
        borderRadius: 12,
        padding: 16,
        position: "relative"
    },
    rankBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        background: "#2563eb",
        color: "white",
        width: 28,
        height: 28,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 600
    },
    cardImage: {
        width: "100%",
        paddingBottom: "100%",
        borderRadius: 8,
        marginBottom: 12
    },
    gradientBg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    cardTitle: {
        margin: "0 0 8px 0",
        fontSize: "1rem",
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    cardScore: {
        margin: 0,
        fontSize: "0.875rem",
        color: "#9ca3af"
    },
    tabs: {
        display: "flex",
        gap: 8,
        marginBottom: 24,
        borderBottom: "2px solid #374151"
    },
    tab: {
        padding: "12px 24px",
        background: "transparent",
        border: "none",
        color: "#9ca3af",
        cursor: "pointer",
        fontSize: "1rem",
        fontWeight: 500,
        borderBottom: "2px solid transparent",
        marginBottom: "-2px"
    },
    tabActive: {
        color: "#3b82f6",
        borderBottomColor: "#3b82f6"
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 24,
        marginBottom: 24
    },
    cardActions: {
        display: "flex",
        gap: 8,
        marginTop: 12
    },
    editBtn: {
        flex: 1,
        padding: "8px 12px",
        background: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 500
    },
    deleteBtn: {
        flex: 1,
        padding: "8px 12px",
        background: "#dc2626",
        color: "white",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 500
    },
    pagination: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: "24px 0"
    },
    pageBtn: {
        padding: "8px 16px",
        background: "#374151",
        color: "#e5e7eb",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 500
    }
};
