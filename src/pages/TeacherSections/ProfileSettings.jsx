import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AsYouType,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
} from "libphonenumber-js";
import { supabase } from "../../supabase";

/* ================= FLAG ================= */
const countryCodeToFlag = (code) => {
  if (!code) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt()))
    .join("");
};

export default function TeacherProfile() {
  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [flag, setFlag] = useState("");

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const loadUser = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      setUserId(auth.user.id);

      const { data } = await supabase
        .from("users")
        .select("first_name, last_name, phone, email, avatar_url")
        .eq("id", auth.user.id)
        .single();

      if (data) {
        setForm({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          phone: data.phone || "",
          email: data.email || auth.user.email,
          password: "",
        });

        // 🔥 CACHE BREAKER
        setAvatarUrl(
          data.avatar_url ? data.avatar_url + "?t=" + Date.now() : ""
        );

        if (data.phone) {
          const formatter = new AsYouType();
          formatter.input(data.phone);
          setFlag(countryCodeToFlag(formatter.getCountry()));
        }
      }
    };

    loadUser();
  }, []);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setDirty(true);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= PHONE ================= */
  const handlePhoneChange = (e) => {
    setDirty(true);

    const prevDigits = form.phone.replace(/\D/g, "");
    const nextDigits = e.target.value.replace(/\D/g, "");

    if (nextDigits.length < prevDigits.length) {
      setForm({ ...form, phone: nextDigits });
      setFlag("");
      return;
    }

    if (!nextDigits) {
      setForm({ ...form, phone: "" });
      setFlag("");
      return;
    }

    const fullNumber = "+" + nextDigits;

    const formatter = new AsYouType("ZZ");
    formatter.input(fullNumber);

    const country = formatter.getCountry();
    setFlag(countryCodeToFlag(country));

    if (country) {
      const phoneNumber = parsePhoneNumberFromString(fullNumber);

      if (phoneNumber?.metadata?.nationalNumberLengths) {
        const maxLength = Math.max(
          ...phoneNumber.metadata.nationalNumberLengths
        );

        if (phoneNumber.nationalNumber.length > maxLength) {
          return;
        }
      }
    }

    const formatted = formatter.formatInternational().replace("+", "");
    setForm({ ...form, phone: formatted });
  };

  /* ================= AVATAR (FIX QILINGAN) ================= */
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;

    setUploading(true);

    const ext = file.name.split(".").pop();

    // 🔥 UNIQUE FILE NAME (CACHE MUAMMO YO‘Q)
    const fileName = `teachers/${userId}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    console.log("UPLOAD:", data, error);

    if (error || !data) {
      setToast("Avatar yuklashda xatolik");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = publicUrlData.publicUrl;

    // 🔥 CACHE BREAKER
    setAvatarUrl(newUrl + "?t=" + Date.now());

    await supabase
      .from("users")
      .update({ avatar_url: newUrl })
      .eq("id", userId);

    setToast("Avatar yangilandi");

    setTimeout(() => setToast(""), 3000);
    setUploading(false);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (form.phone && !isValidPhoneNumber(form.phone)) {
      setToast("Telefon raqam noto‘g‘ri");
      setTimeout(() => setToast(""), 3000);
      return;
    }

    if (!dirty || loading) return;

    setLoading(true);

    const { error } = await supabase
      .from("users")
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
      })
      .eq("id", userId);

    if (form.password) {
      await supabase.auth.updateUser({ password: form.password });
    }

    setToast(error ? "Xatolik yuz berdi" : "Profil saqlandi");
    setDirty(false);
    setLoading(false);

    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div style={styles.wrapper}>
      <button style={styles.backBtn} onClick={() => navigate("/teacher")}>
        ← Orqaga
      </button>

      <div style={styles.card}>
        <h1 style={styles.title}>👤 Profil sozlamalari</h1>

        <div style={styles.avatarWrapper}>
          <label style={styles.avatarLabel}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={styles.avatar} />
            ) : (
              <div style={styles.avatarIcon}>
                <i className="fa-solid fa-circle-user"></i>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarUpload}
            />

            <span style={styles.avatarHint}>
              {uploading ? "Yuklanmoqda..." : "Avatarni o'zgartirish"}
            </span>
          </label>
        </div>

        <input
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          placeholder="Ism"
          style={styles.input}
        />

        <input
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          placeholder="Familiya"
          style={styles.input}
        />

        <div style={styles.phoneWrapper}>
          <div style={styles.phonePrefix}>
            {flag && <span style={styles.flag}>{flag}</span>}
            <span style={styles.country}>
              {form.phone?.startsWith("+") ? "" : "+"}
            </span>
          </div>

          <input
            value={form.phone}
            onChange={handlePhoneChange}
            placeholder="+998 90 123 45 67"
            style={styles.phoneInput}
          />
        </div>

        <input
          value={form.email}
          disabled
          style={{ ...styles.input, opacity: 0.6 }}
        />

        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Yangi parol"
          style={styles.input}
        />

        <button
          onClick={handleSave}
          disabled={!dirty || loading}
          style={{
            ...styles.saveBtn,
            opacity: !dirty || loading ? 0.6 : 1,
            cursor: !dirty || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Saqlanmoqda..." : "💾 Saqlash"}
        </button>
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #0f172a, #020617)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    fontFamily: "Inter, sans-serif",
  },

  backBtn: {
    position: "absolute",
    top: 24,
    left: 24,
    background: "transparent",
    border: "1px solid #334155",
    color: "#93c5fd",
    padding: "10px 16px",
    borderRadius: 999,
    cursor: "pointer",
  },

  card: {
    width: 420,
    padding: 32,
    borderRadius: 24,
    background: "rgba(15,23,42,0.9)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    backdropFilter: "blur(12px)",
  },

  title: {
    color: "#fff",
    marginBottom: 24,
    textAlign: "center",
  },

  input: {
    width: "100%",
    padding: "14px 16px",
    marginBottom: 14,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "#fff",
    outline: "none",
    transition: "0.2s",
  },

  saveBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    marginTop: 10,
  },

  toast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    padding: "14px 20px",
    background: "rgba(2,6,23,0.9)",
    color: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },

  avatarWrapper: {
    display: "flex",
    justifyContent: "center",
  },
  avatarLabel: {
    cursor: "pointer",
    textAlign: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    objectFit: "cover",
  },
 avatarIcon: {
  width: 100,
  height: 100,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #1e3a8a, #6d28d9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 64,
  color: "#e5e7eb",
  boxShadow: "0 0 25px rgba(99,102,241,0.4)",
  },
  avatarHint: {
    display: "block",
    marginTop: 8,
    fontSize: 14,
    color: "#2563eb",
    marginBottom: 12
  },

  phoneWrapper: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.08)",
    background: "linear-gradient(180deg, rgba(6,10,20,0.6), rgba(8,12,24,0.6))",
    marginBottom: 16,
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },

  phonePrefix: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    color: "#cfd8ff",
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  flag: {
    fontSize: 18,
    lineHeight: 1,
  },

  country: {
    opacity: 0.8,
  },

  phoneInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 17,
    fontWeight: 600,
    outline: "none",
    padding: "8px 12px",
  },
};
