import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";


export default function Groups() {
  const [teacherId, setTeacherId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  // Member states
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [groupMembers, setGroupMembers] = useState({});
  const [memberLoadingFor, setMemberLoadingFor] = useState(null);

  //
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
      }
    };
    getUser();
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Groups error:", error);
        return;
      }

      setGroups(data || []);
    } catch (err) {
      console.error("Error loading groups:", err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    if (teacherId) {
      loadGroups();
    }
  }, [teacherId, loadGroups]);

  // Load group members
  const loadGroupMembers = async (groupId) => {
    try {
      setMemberLoadingFor(groupId);
      const { data, error } = await supabase
        .from("group_members")
        .select(
          `
          *,
          users:student_id (id, first_name, last_name, email)
        `,
        )
        .eq("group_id", groupId);

      if (error) {
        console.error("Members error:", error);
        return;
      }

      // Add full_name by combining first_name and last_name
      const membersWithFullName = (data || []).map((member) => ({
        ...member,
        users: {
          ...member.users,
          full_name:
            `${member.users?.first_name || ""} ${member.users?.last_name || ""}`.trim(),
        },
      }));

      setGroupMembers((prev) => ({
        ...prev,
        [groupId]: membersWithFullName,
      }));
    } catch (err) {
      console.error("Error loading members:", err);
    } finally {
      setMemberLoadingFor(null);
    }
  };

  // Load available students (only from accepted course requests)
  const loadAvailableStudents = async () => {
    try {
      if (!teacherId) {
        console.error("Teacher ID not set");
        toast.error("Teacher ID topilmadi");
        return;
      }

      // Teacher's kurslarini olish
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", teacherId);

      if (coursesError) {
        console.error("Courses fetch error:", coursesError);
        throw coursesError;
      }

      if (!courses || courses.length === 0) {
        toast.error("Bu teacher uchun kurslar topilmadi");
        setAvailableStudents([]);
        return;
      }

      const courseIds = courses.map((c) => c.id);

      // Ushbu kurslar uchun accepted students
      const { data: requests, error: requestsError } = await supabase
        .from("course_requests")
        .select("student_id")
        .in("course_id", courseIds)
        .eq("status", "accepted");

      if (requestsError) {
        console.error("Students fetch error:", requestsError);
        throw requestsError;
      }

      if (!requests || requests.length === 0) {
        setAvailableStudents([]);
        return;
      }

      // Unique student IDs
      const studentIds = [];
      const seen = new Set();
      requests.forEach((req) => {
        if (!seen.has(req.student_id)) {
          seen.add(req.student_id);
          studentIds.push(req.student_id);
        }
      });

      // Fetch users for these students
      const { data: students, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", studentIds);

      if (usersError) {
        console.error("Users fetch error:", usersError);
        throw usersError;
      }

      // Add full_name by combining first_name and last_name
      const uniqueStudents = (students || []).map((student) => ({
        ...student,
        full_name:
          `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      }));

      console.log("Available students loaded:", uniqueStudents.length);
      setAvailableStudents(uniqueStudents);
      setSelectedStudent("");
    } catch (err) {
      console.error("Error loading students:", err);
      toast.error("Talabalarni yuklashda xatolik: " + err.message);
    }
  };

  // Add member to group
  const addMemberToGroup = async () => {
    if (!selectedStudent) {
      toast.error("Talaba tanlang");
      return;
    }

    try {
      const { error } = await supabase.from("group_members").insert([
        {
          group_id: selectedGroup.id,
          student_id: selectedStudent,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          toast.error("Bu talaba allaqachon guruhga qoshilgan");
        } else {
          toast.error("Xatolik: " + error.message);
        }
        return;
      }

      toast.success("Talaba qoshildi!");
      loadGroupMembers(selectedGroup.id);
      setSelectedStudent("");
    } catch (err) {
      console.error("Error adding member:", err);
      toast.error("Xatolik: " + err.message);
    }
  };

  // Remove member from group
  const removeMemberFromGroup = async (memberId, studentName) => {
    // Show custom confirm modal
    const confirmed = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      window.showConfirm(
        "Talabani chiqarish",
        `"${studentName}" ni guruhdan chiqarmoqchimisiz?`,
        () => {
          clearTimeout(timeout);
          resolve(true);
        }
      );
    });
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Talaba chiqarildi!");
      loadGroupMembers(selectedGroup.id);
    } catch (err) {
      console.error("Error removing member:", err);
      toast.error("Xatolik: " + err.message);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Guruh nomini kiriting");
      return;
    }

    try {
      const { error } = await supabase.from("groups").insert([
        {
          teacher_id: teacherId,
          name: groupName,
          description: groupDesc,
        },
      ]);

      if (error) {
        toast.error("Guruh yaratishda xatolik: " + error.message);
        return;
      }

      toast.success("Guruh yaratildi!");
      setGroupName("");
      setGroupDesc("");
      setShowAddGroup(false);
      loadGroups();
    } catch (err) {
      console.error("Error creating group:", err);
      toast.error("Xatolik: " + err.message);
    }
  };

  const deleteGroup = async (groupId, groupName) => {
    // Show custom confirm modal
    const confirmed = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      window.showConfirm(
        "Guruhni o'chirish",
        `"${groupName}" guruhini o'chirishga ishonchingiz komilmi?`,
        () => {
          clearTimeout(timeout);
          resolve(true);
        }
      );
    });
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) {
        toast.error("Guruhni o'chirishda xatolik: " + error.message);
        return;
      }

      toast.success("Guruh o'chirildi!");
      loadGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      toast.error("Xatolik: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {/* LEFT SIDE */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => navigate("/teacher")}
            style={styles.backBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>

          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
            Guruhlar
          </h2>
        </div>

        {/* RIGHT SIDE */}
        <button
          onClick={() => setShowAddGroup(!showAddGroup)}
          style={styles.addBtn}
        >
          ➕ Yangi guruh
        </button>
      </div>

      {showAddGroup && (
        <div style={styles.addGroupForm}>
          <h3 style={{marginBottom: "10px"}}>Guruh yaratish</h3>
          <input
            type="text"
            placeholder="Guruh nomi"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={styles.input}
          />
          <textarea
            placeholder="Tavsif (ixtiyoriy)"
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            style={styles.textarea}
          />
          <div style={styles.formButtons}>
            <button onClick={createGroup} style={styles.saveBtn}>
              💾 Saqlash
            </button>
            <button
              onClick={() => {
                setShowAddGroup(false);
                setGroupName("");
                setGroupDesc("");
              }}
              style={styles.cancelBtn}
            >
              ✕ Bekor qilish
            </button>
          </div>
        </div>
      )}

      {loading && <p style={styles.loading}>Yuklanmoqda...</p>}

      {!loading && groups.length === 0 && (
        <p style={styles.emptyState}>
          Guruhlar yo'q. Yangi guruh yaratish uchun ➕ tugmasini bosing.
        </p>
      )}

      {!loading && groups.length > 0 && (
        <div style={styles.groupsList}>
          {groups.map((group) => (
            <div key={group.id} style={styles.groupCard}>
              <div style={styles.groupInfo}>
                <h3 style={styles.groupName}>{group.name}</h3>
                {group.description && (
                  <p style={styles.groupDesc}>{group.description}</p>
                )}
                <p style={styles.groupDate}>
                  {new Date(group.created_at).toLocaleDateString("uz-UZ")} • 👥{" "}
                  {groupMembers[group.id]?.length || 0} talaba
                </p>
              </div>
              <div style={styles.groupActions}>
                <button
                  onClick={() => navigate(`group-chat/${group.id}/${encodeURIComponent(group.name)}`)}
                  style={styles.chatBtn}
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => {
                    setSelectedGroup(group);
                    setShowAddMembers(true);
                    loadGroupMembers(group.id);
                    loadAvailableStudents();
                  }}
                  style={styles.addMemberBtn}
                >
                  <i
                    className="fas fa-user-plus"
                    style={{ marginRight: "6px" }}
                  ></i>
                  Talaba qo'shish
                </button>
                <button
                  onClick={() => deleteGroup(group.id, group.name)}
                  style={styles.deleteBtn}
                >
                  <i
                    className="fas fa-trash"
                    style={{ marginRight: "6px" }}
                  ></i>
                  O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && selectedGroup && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{selectedGroup.name} - Talabalar</h2>
              <button
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedGroup(null);
                  setSelectedStudent("");
                }}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              {/* ADD MEMBER */}
              <div style={styles.addMemberSection}>
                <h3 style={{ marginBottom: "10px" }}>Yangi talaba qo'shish</h3>

                <div style={{ display: "flex", gap: "10px" }}>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    style={{ ...styles.select, flex: 1 }}
                  >
                    <option value="">-- Talabani tanlang --</option>
                    {availableStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={addMemberToGroup}
                    style={{
                      ...styles.addMemberConfirmBtn,
                      width: "120px",
                      padding: "0 10px",
                    }}
                  >
                    ➕ Qo'shish
                  </button>
                </div>
              </div>

              {/* MEMBERS LIST */}
              <div style={styles.membersSection}>
                <h3 style={{ marginBottom: "15px" }}>
                  Guruh a'zolari ({groupMembers[selectedGroup.id]?.length || 0})
                </h3>

                {memberLoadingFor === selectedGroup.id && <p>Yuklanmoqda...</p>}

                {!memberLoadingFor &&
                  (groupMembers[selectedGroup.id]?.length || 0) === 0 && (
                    <p style={styles.noMembers}>Bu guruhda talaba yo'q</p>
                  )}

                {/* LIST */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {groupMembers[selectedGroup.id]?.map((member) => (
                    <div key={member.id} style={styles.memberItem}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={styles.memberName}>
                          👤 {member.users?.full_name}
                        </span>
                        <span style={styles.memberEmail}>
                          ✉️ {member.users?.email}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          removeMemberFromGroup(
                            member.id,
                            member.users?.full_name,
                          )
                        }
                        style={styles.removeMemberBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    color: "#e2e8f0",
    background: "linear-gradient(135deg, #020617, #0f172a 40%, #020617)",
    minHeight: "100vh",
    padding: "30px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
  },

  addBtn: {
    background: "linear-gradient(135deg, #22c55e, #4ade80)",
    border: "none",
    color: "#022c22",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  addGroupForm: {
    background: "rgba(255, 255, 255, 0.08)",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "6px",
    color: "#f1f5f9",
  },

  textarea: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    minHeight: "80px",
    maxHeight: "140px",
    resize: "vertical",
    boxSizing: "border-box",
  },

  formButtons: {
    display: "flex",
    gap: "10px",
  },

  saveBtn: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.5)",
    color: "#86efac",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "0.2s",
  },

  cancelBtn: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "0.2s",
  },

  loading: {
    textAlign: "center",
    opacity: 0.7,
    padding: "20px",
  },

  emptyState: {
    textAlign: "center",
    opacity: 0.6,
    padding: "40px 20px",
    fontSize: "15px",
  },

  groupsList: {
    display: "grid",
    gap: "12px",
  },

  groupCard: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    transition: "0.3s",
    backdropFilter: "blur(10px)",
  },

  groupInfo: {
    flex: 1,
  },

  groupName: {
    fontSize: "16px",
    fontWeight: "bold",
    margin: "0 0 5px 0",
  },

  groupDesc: {
    fontSize: "13px",
    opacity: 0.7,
    margin: "0 0 5px 0",
  },

  groupDate: {
    fontSize: "12px",
    opacity: 0.5,
    margin: 0,
  },

  deleteBtn: {
    background: "#b91c1c", // deep red
    border: "1px solid #ef4444",
    color: "#fee2e2",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  chatBtn: {
    background: "#16a34a", // green
    border: "1px solid #22c55e",
    color: "#dcfce7",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  groupActions: {
    display: "flex",
    gap: "10px",
    flexShrink: 0,
  },

  addMemberBtn: {
    background: "#1d4ed8", // deep blue
    border: "1px solid #3b82f6",
    color: "#e0f2fe", // light text
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modal: {
    background: "rgba(2, 6, 23, 0.95)",
    borderRadius: "16px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    color: "#e2e8f0",
    backdropFilter: "blur(20px)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },

  modalCloseBtn: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "bold",
    transition: "0.2s",
  },

  modalContent: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },

  addMemberSection: {
    background: "rgba(255, 255, 255, 0.08)",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  select: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "6px",
    color: "#f1f5f9",
  },

  addMemberConfirmBtn: {
    width: "100%",
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.5)",
    color: "#86efac",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "0.2s",
  },

  membersSection: {
    background: "rgba(255, 255, 255, 0.06)",
    padding: "15px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  noMembers: {
    textAlign: "center",
    opacity: 0.6,
    padding: "20px",
  },

  memberItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    background: "rgba(30, 41, 59, 0.6)",
    borderRadius: "10px",
    marginBottom: "8px",
    gap: "10px",
    transition: "0.2s",
  },

  memberName: {
    margin: "0 0 3px 0",
    fontSize: "14px",
    fontWeight: "600",
  },

  memberEmail: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.7,
  },

  removeMemberBtn: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#f87171",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "0.2s",
    flexShrink: 0,
  },
  backBtn: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    color: "#cbd5f5",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
};
