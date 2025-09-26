import { useEffect, useRef, useState, type ChangeEvent, type FC } from "react";
import { useParams } from "react-router-dom";
import { getContent } from "../service/content-service";
import type { GetContentResponse } from "../models/aws-calls";
import { getFromCache, removeFromCache, saveToCache } from "../service/cache-service";


export const ContentView: FC = () => {
    const { contentId } = useParams();
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [content, setContent] = useState<GetContentResponse | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDownloaded, setIsDownloaded] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                if (!contentId) return;
                const content: GetContentResponse = await getContent(contentId);
                setContent(content);

                const cached = await getFromCache(contentId);
                setIsDownloaded(!!cached);

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
                    {content?.fileUrl && (
                        <audio
                            ref={audioRef}
                            src={content.fileUrl}
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