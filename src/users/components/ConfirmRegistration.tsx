import { useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {confirmRegistration} from "../services/confirm-registration-service.ts";

export const ConfirmRegistration = () => {
    const [username, setUsername] = useState("");
    const [code, setCode] = useState("");
    const [message, setMessage] = useState<string | null>(null);

    const navigate = useNavigate();

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await confirmRegistration(username, code);
            navigate("/login");
        } catch (err) {
            setMessage(`❌ Confirmation failed: ${err}`);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 3vw" }}>
            <div style={{ width: "92%", maxWidth: 500, padding: "2.5rem", background: "#0f172a", color: "#fff", borderRadius: 12 }}>
                <h2 style={{ textAlign: "center", marginBottom: 20 }}>Confirm Your Account</h2>
                <form onSubmit={onSubmit} noValidate>
                    <div style={{ display: "grid", gap: 12 }}>
                        <div>
                            <label>Username</label>
                            <input
                                name="username"
                                value={username}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                placeholder="johndoe"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label>Confirmation Code</label>
                            <input
                                name="code"
                                value={code}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                                placeholder="Enter the code from your email"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: 20, width: "100%", padding: "0.8rem 1rem", fontSize: "1.05rem" }}>
                        Confirm
                    </button>
                </form>
                {message && (
                    <div style={{ marginTop: 14, padding: "0.7rem 0.9rem", borderRadius: 8, background: "#1e293b" }}>
                        {message}
                    </div>
                )}
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