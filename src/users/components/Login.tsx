import {type ChangeEvent, type CSSProperties, type FormEvent, useState} from "react";
import {login} from "../services/login-service.ts";
import {Link, useNavigate} from "react-router-dom";
import {TokenStorage} from "../services/user-token-storage-service.ts";

export const Login = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setMessage("Username and password are required.");
      return;
    }

    try {
        const tokens = await login(form.username, form.password);
        TokenStorage.saveTokens(tokens);
        navigate("/")
    } catch (err) {
        setMessage(`Login error: ${err}`);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 3vw" }}>
      <div style={{ width: "92%", maxWidth: 840, padding: "2.5rem", background: "#0f172a", color: "#fff", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, justifyContent: "center", textAlign: "center" }}>
          <img src="/logo_transparent.png" alt="CloudTunes" style={{ width: "7.5vw", maxWidth: 72, minWidth: 40, height: "auto" }} />
          <h2 style={{ margin: 0, fontSize: "clamp(1.25rem, 2.2vw, 2rem)" }}>Log in to CloudTunes</h2>
        </div>
        <form onSubmit={onSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label>Username</label>
              <input name="username" value={form.username} onChange={onChange} placeholder="Ex. My Username" style={inputStyle} />
            </div>
            <div>
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={onChange} style={inputStyle} />
            </div>
          </div>
          <button type="submit" style={{ marginTop: 20, width: "100%", padding: "0.8rem 1rem", fontSize: "1.05rem" }}>Log in</button>
        </form>
        {message && (
          <div style={{ marginTop: 14, padding: "0.7rem 0.9rem", borderRadius: 8, background: "#7f1d1d" }}>
            {message}
          </div>
        )}
        <p style={{ textAlign: "center", marginTop: 14 }}>
          New here? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

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