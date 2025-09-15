import { useState, type CSSProperties, type FC, type FormEvent, type KeyboardEvent } from "react";
import { createArtist } from "../services/artist-service";

export const CreateArtistForm: FC = () => {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAddGenre = () => {
    const newGenre = genreInput.trim();
    if (newGenre && !genres.includes(newGenre)) {
      setGenres([...genres, newGenre]);
    }
    setGenreInput("");
  };

  const handleGenreKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddGenre();
    }
  };

  const handleRemoveGenre = (genre: string) => {
    setGenres(genres.filter((g) => g !== genre));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const newArtist = { name, bio, genres };
      const result = await createArtist(newArtist);
      setMessage(`Artist created! ID: ${result.ArtistId}`);
      setName("");
      setBio("");
      setGenres([]);
      setGenreInput("");
    } catch (err) {
      setMessage("Failed to create artist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 3vw" }}>
      <div style={{ width: "92%", maxWidth: 840, padding: "2.5rem", background: "#0f172a", color: "#fff", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, justifyContent: "center", textAlign: "center" }}>
          <img src="/logo_transparent.png" alt="CloudTunes" style={{ width: "7.5vw", maxWidth: 72, minWidth: 40, height: "auto" }} />
          <h2 style={{ margin: 0, fontSize: "clamp(1.25rem, 2.2vw, 2rem)" }}>Add a New Artist</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label>Name</label>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. My Name" style={inputStyle} />
            </div>
            <div>
              <label>Bio</label>
              <textarea name="bio" value={bio} onChange={(e) => setBio(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label>Genres</label>
              <div style={genreContainerStyle}>
                {genres.map((genre) => (
                  <span key={genre} style={genreBubbleStyle}>
                    {genre}
                    <button
                      type="button"
                      onClick={() => handleRemoveGenre(genre)}
                      style={removeButtonStyle}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  onKeyDown={handleGenreKeyDown}
                  placeholder="Type a genre and press Enter"
                  style={{ ...inputStyle, flex: 1, border: "none", background: "transparent", minWidth: 100 }}
                />
              </div>
            </div>
          </div>
          <button type="submit" style={{ marginTop: 20, width: "100%", padding: "0.8rem 1rem", fontSize: "1.05rem" }}>
            {loading ? "Creating..." : "Create Artist"}
          </button>
        </form>
        {message && (
          <div style={{ marginTop: 14, padding: "0.7rem 0.9rem", borderRadius: 8, background: "#7f1d1d" }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.8rem",
  background: "#111827",
  color: "#fff",
  border: "1px solid #334155",
  borderRadius: 8,
  outline: "none",
  marginTop: 4,
};

const genreContainerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: "6px 8px",
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 8,
  marginTop: 4,
};

const genreBubbleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#2563eb",
  color: "#fff",
  padding: "4px 8px",
  borderRadius: 16,
  fontSize: "0.9rem",
};

const removeButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  fontSize: "1rem",
  lineHeight: 1,
};
