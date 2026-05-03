import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { toast } from "react-toastify";

export default function TeacherCVEditor({ isModal = false }) {
  const [cv, setCV] = useState({
    bio: "",
    expertise: "",
    experience_years: 0,
    education: "",
    certifications: "",
    specializations: "",
    teaching_style: "",
    languages: "",
    achievements: "",
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        await fetchCV(data.user.id);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const fetchCV = async (teacherId) => {
    const { data, error } = await supabase
      .from("teacher_cvs")
      .select("*")
      .eq("teacher_id", teacherId)
      .single();

    if (data) {
      setCV(data);
    } else if (error?.code !== "PGRST116") {
      console.error("Error fetching CV:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCV({ ...cv, [name]: value });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { data: existingCV } = await supabase
        .from("teacher_cvs")
        .select("id")
        .eq("teacher_id", user.id)
        .single();

      if (existingCV) {
        const { error } = await supabase
          .from("teacher_cvs")
          .update(cv)
          .eq("teacher_id", user.id);

        if (error) throw error;
        toast.success("CV yangilandi!");
      } else {
        const { error } = await supabase.from("teacher_cvs").insert([
          {
            teacher_id: user.id,
            ...cv,
          },
        ]);

        if (error) throw error;
        toast.success("CV saqlandi!");
      }
    } catch (error) {
      toast.error(`Xatolik: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loadingText}>Yuklanmoqda...</div>;

  return (
    <div style={isModal ? styles.modalContainer : styles.container}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cv-editor { animation: fadeIn 0.5s ease-out; }
        textarea {
          resize: vertical;
          font-family: inherit;
        }
        textarea:focus {
          border-color: rgba(34, 197, 94, 0.5) !important;
          background: rgba(34, 197, 94, 0.08) !important;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.2) !important;
        }
      `}</style>

      <div style={styles.card} className="cv-editor">
        <div style={styles.header}>
          <h2 style={styles.title}>👨‍🏫 O'qituvchi Profili</h2>
          <p style={styles.subtitle}>CV ma'lumotlarini to'ldiring</p>
        </div>

        <div style={styles.form}>
          {/* BIO */}
          <div style={styles.section}>
            <label style={styles.label}>Qisqacha Bio</label>
            <textarea
              name="bio"
              value={cv.bio}
              onChange={handleChange}
              placeholder="O'zingiz haqida qisqacha ma'lumot..."
              style={{ ...styles.textarea, minHeight: "80px" }}
              maxLength="500"
            />
            <span style={styles.charCount}>
              {cv.bio.length}/500
            </span>
          </div>

          {/* EXPERTISE */}
          <div style={styles.section}>
            <label style={styles.label}>Mutaxassislik</label>
            <textarea
              name="expertise"
              value={cv.expertise}
              onChange={handleChange}
              placeholder="Qaysi sohalarda mutaxassis? (masalan: React, JavaScript, Web Design)"
              style={{ ...styles.textarea, minHeight: "60px" }}
              maxLength="300"
            />
            <span style={styles.charCount}>
              {cv.expertise.length}/300
            </span>
          </div>

          {/* EXPERIENCE */}
          <div style={styles.twoColumn}>
            <div style={styles.section}>
              <label style={styles.label}>Tajriba (yil)</label>
              <input
                type="number"
                name="experience_years"
                value={cv.experience_years}
                onChange={handleChange}
                min="0"
                max="70"
                style={styles.input}
              />
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Tillar</label>
              <input
                type="text"
                name="languages"
                value={cv.languages}
                onChange={handleChange}
                placeholder="O'zbekcha, Inglizcha, Ruscha..."
                style={styles.input}
              />
            </div>
          </div>

          {/* EDUCATION */}
          <div style={styles.section}>
            <label style={styles.label}>Ta'lim</label>
            <textarea
              name="education"
              value={cv.education}
              onChange={handleChange}
              placeholder="Nomidagi universitet, ma'lumot darajasi..."
              style={{ ...styles.textarea, minHeight: "60px" }}
              maxLength="300"
            />
          </div>

          {/* CERTIFICATIONS */}
          <div style={styles.section}>
            <label style={styles.label}>Sertifikatlar</label>
            <textarea
              name="certifications"
              value={cv.certifications}
              onChange={handleChange}
              placeholder="Sertifikat nomlari va ijrodan chiqaruvchi..."
              style={{ ...styles.textarea, minHeight: "60px" }}
              maxLength="300"
            />
          </div>

          {/* SPECIALIZATIONS */}
          <div style={styles.section}>
            <label style={styles.label}>Ixtisoslashuvlar</label>
            <textarea
              name="specializations"
              value={cv.specializations}
              onChange={handleChange}
              placeholder="Masalan: Frontend Development, Mobile Apps..."
              style={{ ...styles.textarea, minHeight: "60px" }}
              maxLength="300"
            />
          </div>

          {/* TEACHING STYLE */}
          <div style={styles.section}>
            <label style={styles.label}>O'qitish uslubi</label>
            <textarea
              name="teaching_style"
              value={cv.teaching_style}
              onChange={handleChange}
              placeholder="Siz qanday o'qitishni afzal ko'rasiz?"
              style={{ ...styles.textarea, minHeight: "80px" }}
              maxLength="300"
            />
          </div>

          {/* ACHIEVEMENTS */}
          <div style={styles.section}>
            <label style={styles.label}>Yutuqlari</label>
            <textarea
              name="achievements"
              value={cv.achievements}
              onChange={handleChange}
              placeholder="O'quvchilarning muvaffaqiyatlari, mashhur talabalar..."
              style={{ ...styles.textarea, minHeight: "80px" }}
              maxLength="300"
            />
          </div>

          {/* SAVE BUTTON */}
          <button
            style={{ ...styles.saveBtn, opacity: saving ? 0.8 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saqlanmoqda..." : "💾 Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    padding: "30px 20px",
  },

  modalContainer: {
    padding: "20px 0",
  },

  card: {
    maxWidth: "600px",
    margin: "0 auto",
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(30px)",
    padding: "35px",
    borderRadius: "24px",
    boxShadow: "0 25px 70px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#fff",
  },

  header: {
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },

  title: {
    fontSize: "24px",
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

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#fff",
    outline: "none",
    transition: "all 0.3s ease",
    fontSize: "14px",
  },

  textarea: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#fff",
    outline: "none",
    transition: "all 0.3s ease",
    fontSize: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
  },

  charCount: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "right",
  },

  saveBtn: {
    marginTop: "10px",
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
  },

  loadingText: {
    textAlign: "center",
    padding: "40px",
    color: "#fff",
  },
};
