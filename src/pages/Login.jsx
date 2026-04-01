import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Iltimos, barcha maydonlarni to'ldiring");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email noto'g'ri formatda");
      return;
    }

    // ✅ 1. SUPABASE AUTH LOGIN
    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError("Email yoki parol noto‘g‘ri");
      return;
    }

    const userId = data.user.id;

    // ✅ 2. USERS TABLE DAN ROLE OLISH
    const { data: userData, error: userError } =
      await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

    if (userError) {
      setError("Foydalanuvchi roli topilmadi");
      return;
    }

    setError("");

    // ✅ 3. ROLE GA QARAB YO‘NALTIRISH
    if (userData.role === "student") {
      navigate("/student");
    } else if (userData.role === "teacher") {
      navigate("/teacher");
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Tizimga kirish</h2>
        <p>Online Classroom</p>

        {error && <div className="error">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Kirish</button>

        <span className="hint">
          Hisobingiz yo'qmi?{" "}
          <Link to="/signup">Ro'yxatdan o'ting</Link>
        </span>
      </form>
    </div>
  );
}
