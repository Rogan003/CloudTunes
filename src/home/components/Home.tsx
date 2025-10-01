import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {globalSignOut} from "../../users/services/login-service.ts";
import {TokenStorage} from "../../users/services/user-token-storage-service.ts";
import { AuthService } from "../../users/services/auth-service";
import {getFeed} from "../../music/services/feed-service.ts";

interface FeedItem {
    contentId: string;
    score: number;
    title?: string;
    imageUrl?: string;
}

export const Home = () => {
    useEffect(() => {
        if (!TokenStorage.getAccessToken()) {
            navigate("/login")
        }
        if (isUser) {
            loadFeed();
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

    const viewSong = (contentId: string) => {
        navigate(`/songs/${contentId}`);
    };

    const isUser = AuthService.hasRole("user");
    const isAdmin = AuthService.hasRole("admin");

    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div style={{ padding: 24, color: "#e5e7eb" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <button onClick={() => logout()}>Logout</button>
                {isAdmin && <button onClick={() => createArtist()}>Create Artist</button>}
                {isAdmin && <button onClick={() => uploadContent()}>Upload Content</button>}
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

            {/* Admin welcome message */}
            {isAdmin && !isUser && (
                <div style={{
                    maxWidth: 800,
                    margin: "0 auto",
                    textAlign: "center",
                    padding: 48
                }}>
                    <h1 style={{ fontSize: "2rem", marginBottom: 16 }}>
                        Welcome, Admin! 👋
                    </h1>
                    <p style={{ color: "#9ca3af", fontSize: "1.1rem" }}>
                        Use the buttons above to create artists or upload new content.
                    </p>
                </div>
            )}
        </div>
    );
};