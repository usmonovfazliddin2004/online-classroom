import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { supabase } from "../supabase";
import "react-toastify/dist/ReactToastify.css";

export default function StudentSettings() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  /* ========================= INPUT ========================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ========================= AVATAR ========================= */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  /* ========================= SAVE ========================= */
  const handleSave = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Foydalanuvchi topilmadi");
      setSaving(false);
      return;
    }

    let avatarUrl = null;

    /* ===== UPLOAD ===== */
    if (avatar) {
      const fileExt = avatar.name.split(".").pop();

      // 🔥 cache muammo bo‘lmasligi uchun unique name
      const filePath = `students/${user.id}_${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatar, {
          upsert: true,
          contentType: avatar.type,
        });

      if (uploadError || !data) {
        toast.error("Rasm yuklanmadi");
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl;

      if (!avatarUrl) {
        toast.error("URL olinmadi");
        setSaving(false);
        return;
      }
    }

    /* ===== PASSWORD ===== */
    if (form.password) {
      const { error: passError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (passError) {
        toast.error("Parol yangilanmadi");
        setSaving(false);
        return;
      }
    }

    /* ===== UPDATE DATA ===== */
    const updateData = {
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      phone: form.phone,
    };

    if (avatarUrl) {
      updateData.avatar_url = avatarUrl;
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      toast.error(`Saqlashda xatolik: ${error.message}`);
      setSaving(false);
      return;
    }

    toast.success("Sozlamalar saqlandi");

    setAvatar(null);

    /* ===== REFRESH USER ===== */
    const {
      data: { user: newUser },
    } = await supabase.auth.getUser();

    if (newUser) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", newUser.id)
        .single();

      if (data) {
        setForm({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          password: "",
        });

        if (data.avatar_url) {
          // 🔥 cache breaker
          setPreview(data.avatar_url + "?t=" + Date.now());
        }
      }
    }

    setSaving(false);
  };

  /* ========================= FETCH USER ========================= */
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("Ma'lumotlarni olishda xatolik");
        return;
      }

      setForm({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        password: "",
      });

      if (data.avatar_url) {
        setPreview(data.avatar_url + "?t=" + Date.now());
      }
    };

    fetchUserData();
  }, []);

  /* ========================= MODAL ========================= */
  useEffect(() => {
    document.body.style.overflow = showLogout ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [showLogout]);

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .settings-card { animation: fadeIn 0.6s ease-out; }
        
        /* Input Hover & Focus Effects */
        input {
          position: relative;
        }
        input:hover {
          border-color: rgba(255, 255, 255, 0.25) !important;
          background: rgba(255, 255, 255, 0.07) !important;
        }
        input:focus {
          border-color: rgba(34, 197, 94, 0.5) !important;
          background: rgba(34, 197, 94, 0.08) !important;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.2) !important;
        }
        
        /* Avatar Hover Effect */
        [style*="avatarContainer"] > [style*="avatar"]:hover {
          transform: scale(1.05);
          border-color: rgba(34, 197, 94, 0.6) !important;
          box-shadow: 0 12px 40px rgba(34, 197, 94, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.08) !important;
        }
        
        /* Button Hover Effects */
        button {
          position: relative;
          overflow: hidden;
        }
        
        /* Save Button Hover */
        [style*="saveBtn"]:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(34, 197, 94, 0.5) !important;
        }
        
        /* Save Button Active */
        [style*="saveBtn"]:active:not(:disabled) {
          transform: translateY(0);
        }
        
        /* Logout Button Hover */
        [style*="logoutBtn"]:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.2)) !important;
          border-color: rgba(239, 68, 68, 0.5) !important;
          transform: translateY(-1px);
        }
        
        /* Modal Buttons Hover */
        [style*="yes"]:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(34, 197, 94, 0.5) !important;
        }
        
        [style*="no"]:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15)) !important;
          border-color: rgba(239, 68, 68, 0.5) !important;
          transform: translateY(-2px);
        }
        
        /* Upload Button Hover */
        [style*="uploadBtn"]:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.15)) !important;
          border-color: rgba(34, 197, 94, 0.6) !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(34, 197, 94, 0.2) !important;
        }
        
        /* Icon Animations */
        [style*="inputIcon"]:hover {
          opacity: 1 !important;
          filter: brightness(1.2);
        }
        
        /* Smooth Transitions */
        * {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        input, button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <ToastContainer />

      <div style={styles.card} className="settings-card">
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ Shaxsiy sozlamalar</h2>
          <p style={styles.subtitle}>Profilingizni boshqarish</p>
        </div>

        {/* AVATAR SECTION */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Profil rasmingiz</div>
          <div style={styles.avatarWrapper}>
            <div style={styles.avatarContainer}>
              <div style={styles.avatar}>
                {preview ? (
                  <img src={preview} alt="avatar" style={styles.avatarImg} />
                ) : (
                  <div style={styles.avatarPlaceholder}>👤</div>
                )}
                <div style={styles.avatarOverlay}>
                  <span style={{ fontSize: "20px" }}>📷</span>
                </div>
              </div>
              <label style={styles.uploadBtn}>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
                Rasm o'zlashtirish
              </label>
            </div>
            <div style={styles.avatarInfo}>
              <p style={styles.avatarInfoText}>JPG, PNG yoki WebP formatida</p>
              <p style={styles.avatarInfoText}>Maksimal hajm: 5MB</p>
            </div>
          </div>
        </div>

        {/* PERSONAL INFO SECTION */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Shaxsiy ma'lumot</div>
          
          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                style={styles.input}
                name="firstName"
                placeholder="Ism"
                value={form.firstName}
                onChange={handleChange}
              />
              <div style={styles.inputIcon}>👤</div>
            </div>

            <div style={styles.inputWrapper}>
              <input
                style={styles.input}
                name="lastName"
                placeholder="Familiya"
                value={form.lastName}
                onChange={handleChange}
              />
              <div style={styles.inputIcon}>👤</div>
            </div>
          </div>

          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
            />
            <div style={styles.inputIcon}>✉️</div>
          </div>

          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              name="phone"
              placeholder="Telefon"
              value={form.phone}
              onChange={handleChange}
            />
            <div style={styles.inputIcon}>📱</div>
          </div>
        </div>

        {/* SECURITY SECTION */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Xavfsizlik</div>
          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              type="password"
              name="password"
              placeholder="Yangi parol (ixtiyoriy)"
              value={form.password}
              onChange={handleChange}
            />
            <div style={styles.inputIcon}>🔐</div>
          </div>
          <p style={styles.helperText}>Parolni boshqa qilish uchun yangi parol kiriting</p>
        </div>

        {/* ACTION BUTTONS */}
        <div style={styles.actionsContainer}>
          <button 
            style={{
              ...styles.saveBtn,
              ...(saving && { opacity: 0.8 })
            }} 
            onClick={handleSave} 
            disabled={saving}
            className={saving ? "save-btn-loading" : ""}
          >
            {saving ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span style={{ display: "inline-block", animation: "pulse 1.5s infinite" }}>●</span>
                Saqlanmoqda...
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span>💾</span>
                Saqlash
              </span>
            )}
          </button>

          <button 
            style={styles.logoutBtn} 
            onClick={() => setShowLogout(true)}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span>🚪</span>
              Akkauntdan chiqish
            </span>
          </button>
        </div>
      </div>

      {showLogout && (
          <div style={styles.overlay} onClick={() => setShowLogout(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.logoutIcon}>⚠️</div>
              <h3 style={styles.text}>Chiqishni tasdiqlaysizmi?</h3>
              <p style={styles.logoutText}>
                Agar chiqib ketsangiz, qayta login qilishingiz kerak bo'ladi.
              </p>
              <div style={styles.modalDivider}></div>
              <div style={styles.actions}>
                <button 
                  style={styles.yes}
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/login");
                  }}
                >
                  <span>✓</span>
                  Ha, chiqish
                </button>

                <button 
                  style={styles.no} 
                  onClick={() => setShowLogout(false)}
                >
                  <span>✕</span>
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

/* ===== STYLES ===== */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Inter, system-ui",
    color: "#fff",
    padding: "20px",
  },

  card: {
    width: "100%",
    maxWidth: "540px",
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(30px)",
    padding: "40px",
    borderRadius: "28px",
    boxShadow: "0 25px 70px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  header: {
    marginBottom: "35px",
    paddingBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },

  title: {
    fontSize: "26px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    background: "linear-gradient(135deg, #fff, #cbd5e1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  subtitle: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.5)",
    margin: 0,
  },

  section: {
    marginBottom: "28px",
  },

  sectionTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  avatarWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },

  avatarContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },

  avatar: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #334155, #64748b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    border: "3px solid rgba(34, 197, 94, 0.3)",
    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.05)",
    position: "relative",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },

  avatarPlaceholder: {
    fontSize: "50px",
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "all 0.3s ease",
  },

  uploadBtn: {
    fontSize: "13px",
    cursor: "pointer",
    padding: "10px 20px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    color: "#86efac",
    transition: "all 0.3s ease",
    fontWeight: "600",
    display: "inline-block",
  },

  avatarInfo: {
    textAlign: "center",
    width: "100%",
  },

  avatarInfoText: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.4)",
    margin: "4px 0",
  },

  inputRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },

  inputWrapper: {
    position: "relative",
    marginBottom: "12px",
  },

  input: {
    width: "100%",
    padding: "12px 14px 12px 40px",
    borderRadius: "12px",
    border: "1.5px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#fff",
    outline: "none",
    transition: "all 0.3s ease",
    fontSize: "14px",
    boxSizing: "border-box",
  },

  inputIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "16px",
    pointerEvents: "none",
    opacity: 0.6,
    transition: "all 0.3s ease",
  },

  helperText: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.4)",
    margin: "6px 0 0 0",
    paddingLeft: "4px",
  },

  actionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },

  saveBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 12px 30px rgba(34, 197, 94, 0.35)",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  logoutBtn: {
    width: "100%",
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))",
    border: "1.5px solid rgba(239, 68, 68, 0.3)",
    padding: "12px",
    borderRadius: "12px",
    color: "#fca5a5",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  overlay: {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    pointerEvents: "all",
    backdropFilter: "blur(5px)",
  },

  modal: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    padding: "40px 35px",
    maxWidth: "380px",
    width: "90%",
    borderRadius: "24px",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.8)",
  },

  modalDivider: {
    height: "1px",
    background: "rgba(255, 255, 255, 0.1)",
    margin: "20px 0",
  },

  logoutIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },

  text: {
    fontSize: "20px",
    fontWeight: "700",
    margin: "0 0 10px 0",
  },

  logoutText: {
    opacity: 0.7,
    fontSize: "14px",
    margin: "0",
    lineHeight: "1.5",
    color: "rgba(255, 255, 255, 0.6)",
  },

  actions: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
  },

  yes: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "14px",
    padding: "12px 24px",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    cursor: "pointer",
    borderRadius: "10px",
    border: "none",
    color: "white",
    fontWeight: "700",
    transition: "all 0.3s ease",
    boxShadow: "0 8px 20px rgba(34, 197, 94, 0.3)",
    minWidth: "120px",
  },

  no: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "14px",
    padding: "12px 24px",
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))",
    cursor: "pointer",
    borderRadius: "10px",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    fontWeight: "700",
    transition: "all 0.3s ease",
    minWidth: "120px",
  },
};
