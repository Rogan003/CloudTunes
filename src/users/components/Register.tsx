import {type ChangeEvent, type CSSProperties, type FC, type FormEvent, type ReactNode, useMemo, useState} from "react";
import type {User} from "../models/user-models.ts";
import {register} from "../services/register-service.ts";
import {Link, useNavigate} from "react-router-dom";

export const Register = () => {
  const [form, setForm] = useState<User>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    username: "",
    email: "",
    password: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate()

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasNumber = /\d/;
    const hasLowercaseLetter = /[a-z]/;
    const hasUppercaseLetter = /[A-Z]/;

    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.username.trim()) e.username = "Username is required";
    else if (form.username.length < 3) e.username = "Username must be at least 3 characters";

    if (!form.email.trim()) e.email = "Email is required";
    else if (!emailRegex.test(form.email)) e.email = "Invalid email format";

    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8 || !hasNumber.test(form.password) || !hasLowercaseLetter.test(form.password)
        || !hasUppercaseLetter.test(form.password)) e.password =
        "Password must be 8+ chars and include both lowercase and uppercase letters and numbers";

    if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required";
    else {
      const dateOfBirthDate = new Date(form.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dateOfBirthDate.getFullYear() - (today < new Date(today.getFullYear(), dateOfBirthDate.getMonth(), dateOfBirthDate.getDate()) ? 1 : 0);
      if (isNaN(dateOfBirthDate.getTime())) e.dateOfBirth = "Invalid date";
      else if (age < 13) e.dateOfBirth = "You must be at least 13 years old";
    }

    return e;
  }, [form]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length === 0) {
        try {
            await register(form);
            navigate("/confirm-registration")
        } catch (err) {
            setMessage(`Registration error: ${err}`);
        }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 3vw" }}>
      <div style={{ width: "92%", maxWidth: 900, padding: "2.5rem", background: "#0f172a", color: "#fff", borderRadius: 12  }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, justifyContent: "center", textAlign: "center" }}>
          <img src="/logo_transparent.png" alt="CloudTunes" style={{ width: "7.5vw", maxWidth: 72, minWidth: 40, height: "auto" }} />
          <h2 style={{ margin: 0, fontSize: "clamp(1.25rem, 2.2vw, 2rem)" }}>Create your CloudTunes account</h2>
        </div>
        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>First name</label>
                <input name="firstName" value={form.firstName} onChange={onChange} placeholder="John" style={inputStyle} />
                {submitted && errors.firstName && <Error>{errors.firstName}</Error>}
              </div>
              <div>
                <label>Last name</label>
                <input name="lastName" value={form.lastName} onChange={onChange} placeholder="Doe" style={inputStyle} />
                {submitted && errors.lastName && <Error>{errors.lastName}</Error>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Username</label>
                <input name="username" value={form.username} onChange={onChange} placeholder="johndoe" style={inputStyle} />
                {submitted && errors.username && <Error>{errors.username}</Error>}
              </div>
              <div>
                <label>Date of birth</label>
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} style={inputStyle} />
                {submitted && errors.dateOfBirth && <Error>{errors.dateOfBirth}</Error>}
              </div>
            </div>
            <div>
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" style={inputStyle} />
              {submitted && errors.email && <Error>{errors.email}</Error>}
            </div>
            <div>
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" style={inputStyle} />
              {submitted && errors.password && <Error>{errors.password}</Error>}
              <small style={{ color: "#94a3b8" }}>Use at least 8 characters with a number and a letter.</small>
            </div>
          </div>
          <button type="submit" style={{ marginTop: 20, width: "100%", padding: "0.8rem 1rem", fontSize: "1.05rem" }}>Register</button>
        </form>
          {message && (
              <div style={{ marginTop: 14, padding: "0.7rem 0.9rem", borderRadius: 8, background: "#7f1d1d" }}>
                  {message}
              </div>
          )}
        <p style={{ textAlign: "center", marginTop: 14 }}>
          Already have an account? <Link to="/login">Log in</Link>
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

const Error: FC<{ children: ReactNode }> = ({ children }) => (
  <div style={{ color: "#fca5a5", marginTop: 4, fontSize: 12 }}>{children}</div>
);