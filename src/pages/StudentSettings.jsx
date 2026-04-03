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
      <ToastContainer />

      <div style={styles.card}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Sozlamalar
        </h2>

        {/* AVATAR */}
        <div style={styles.avatarWrapper}>
          <div style={styles.avatar}>
            {preview ? (
              <img src={preview} alt="avatar" style={styles.avatarImg} />
            ) : (
              "👤"
            )}
          </div>

          <label style={styles.uploadBtn}>
            Rasm yuklash
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <input
          style={styles.input}
          name="firstName"
          placeholder="Ism"
          value={form.firstName}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          name="lastName"
          placeholder="Familiya"
          value={form.lastName}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          name="phone"
          placeholder="Telefon"
          value={form.phone}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          type="password"
          name="password"
          placeholder="Yangi parol (ixtiyoriy)"
          value={form.password}
          onChange={handleChange}
        />

        <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>

        <button style={styles.logoutBtn} onClick={() => setShowLogout(true)}>
          Chiqish
        </button>

        {showLogout && (
          <div style={styles.overlay} onClick={() => setShowLogout(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.logoutIcon}>⚠️</div>
              <h3 style={styles.text}>Chiqishni tasdiqlaysizmi?</h3>
              <p style={styles.logoutText}>
                {" "}
                Agar chiqib ketsangiz, qayta login qilishingiz kerak
                bo‘ladi.{" "}
              </p>
              <div style={styles.actions}>
                <button style={styles.yes}
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/login");
                  }}
                >
                 <i className="fa-solid fa-right-from-bracket"></i> Ha
                </button>

                <button style={styles.no} onClick={() => setShowLogout(false)}><i className="fa-solid fa-xmark"></i>Yo‘q</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== STYLES ===== */
const styles = {
  page: {
    minHeight: "80vh",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Inter, system-ui",
    color: "#fff",
  },


  card: {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    padding: "35px",
    borderRadius: "24px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  avatarWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "25px",
  },

  avatar: {
    width: "95px",
    height: "95px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #334155, #475569)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: "10px",
    border: "3px solid rgba(255,255,255,0.2)",
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  uploadBtn: {
    fontSize: "13px",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.1)",
    transition: "0.3s",
  },

  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    marginBottom: "14px",
    outline: "none",
    transition: "0.3s",
  },

  saveBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
    transition: "0.3s",
    boxShadow: "0 10px 25px rgba(34,197,94,0.4)",
  },

  logoutBtn: {
    marginTop: "12px",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    border: "none",
    padding: "12px",
    borderRadius: "12px",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    width: "100%",
    fontWeight: "600",
    boxShadow: "0 10px 25px rgba(239,68,68,0.4)",
  },

  overlay: {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    pointerEvents: "all", // 🔥 HAMMA CLICKNI USHLAYDI
  },

  modal: {
    background: "#0f172a",
    padding: "40px 30px",
    width: "420px",
    borderRadius: "20px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },

  yes: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "14px",
    width: "120px",
    background: "#22c55e", // yashil
    cursor: "pointer",
    borderRadius: "10px",
    padding: "10px",
    border: "none",
    color: "white",
    fontWeight: "bold",
  },

  no: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "14px",
    width: "120px",
    background: "#ef4444", // qizil
    cursor: "pointer",
    borderRadius: "10px",
    padding: "10px",
    border: "none",
    color: "white",
    fontWeight: "bold",
  },

  actions: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "20px",
  },

  logoutIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  logoutText: {
    opacity: 0.8,
    marginTop: "6px",
  },

  text: {
    fontSize: "22px",
    fontWeight: "600",
  },
};
