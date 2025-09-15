import { useState, type CSSProperties, type FC, type FormEvent } from "react";
import { createArtist } from "../services/artist-service";

export const CreateArtistForm: FC = () => {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const newArtist = {
        name,
        bio,
        genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
      };
      const result = await createArtist(newArtist);
      setMessage(`Artist created! ID: ${result.ArtistId}`);
      setName("");
      setBio("");
      setGenres("");
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
              <label>Genre</label>
              <input
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="e.g. Rock, Pop, Jazz"
                required
                style={inputStyle}
                />
                {/* Initially comma separated, will be changed for something better */}
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
