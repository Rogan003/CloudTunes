import { useEffect, useRef, useState, type ChangeEvent, type FC } from "react";
import { useParams } from "react-router-dom";
import { getContent } from "../service/content-service";
import type { GetContentResponse } from "../models/aws-calls";


export const ContentView: FC = () => {
    const { contentId } = useParams();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [content, setContent] = useState<GetContentResponse | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    // hardcoded examples for now
    // const content = {
    //     contentId: 1,
    //     filename: "filename",
    //     filetype: "filetype",
    //     filesize: "123",
    //     title: "title",
    //     imageUrl: "https://elearningchips.com/wp-content/uploads/2017/02/ph_024_043_pw1.jpg",
    //     albumId: 1,
    //     albumName: "albumname",
    //     createdAt: "12/12/2025",
    //     updatedAt: "13/12/2025",
    //     genres: ["pop", "rock"],
    //     artistIds: [1, 2]
    // };
    // const fileUrl = "https://file-examples.com/storage/fee1b0f7cc68d56d19535f0/2017/11/file_example_MP3_700KB.mp3";

    useEffect(() => {
        const fetchContent = async () => {
            try {
                if (!contentId) return;
                const content: GetContentResponse = await getContent(contentId);
                setContent(content);

            } catch (err: any) {
                alert("An error occurred while fetching content: " + err.message);
            }
        };

        fetchContent();
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(percent);
    };

    const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const newTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
    };

    return (
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
                <audio
                    ref={audioRef}
                    src={content?.fileUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                />

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

                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    style={{ width: "100%", marginTop: "1rem" }}
                    />
            </div>
        </div>
    );
};