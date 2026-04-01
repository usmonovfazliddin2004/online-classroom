import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";

export default function StudentGroups() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentId(user.id);
      }
    };
    getUser();
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      console.log("📍 Loading groups for studentId:", studentId);
      
      // Get all groups where this student is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("student_id", studentId);

      console.log("📍 Membership data:", membershipData, "Error:", membershipError);

      if (membershipError) {
        console.error("❌ Membership fetch error:", membershipError);
        setGroups([]);
        return;
      }

      if (!membershipData || membershipData.length === 0) {
        console.log("⚠️ No groups found for this student");
        setGroups([]);
        return;
      }

      const groupIds = membershipData.map((m) => m.group_id);
      console.log("📍 Group IDs:", groupIds);

      // Get group details for these IDs
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      console.log("📍 Groups data:", groupsData, "Error:", groupsError);

      if (groupsError) {
        console.error("❌ Groups fetch error:", groupsError);
        setGroups([]);
        return;
      }

      if (!groupsData || groupsData.length === 0) {
        console.log("⚠️ No group data returned");
        setGroups([]);
        return;
      }

      // Get teacher details for all groups
      const teacherIds = groupsData.map((g) => g.teacher_id);
      console.log("📍 Teacher IDs:", teacherIds);
      
      const { data: teachers, error: teachersError } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", teacherIds);

      console.log("📍 Teachers data:", teachers, "Error:", teachersError);

      if (teachersError) {
        console.error("❌ Teachers fetch error:", teachersError);
        setGroups(groupsData || []);
        return;
      }

      // Merge teacher data into groups
      const groupsWithTeachers = groupsData.map((group) => {
        const teacher = teachers.find((t) => t.id === group.teacher_id);
        return {
          ...group,
          users: teacher,
        };
      });

      console.log("✅ Groups with teachers:", groupsWithTeachers);
      setGroups(groupsWithTeachers);
    } catch (err) {
      console.error("❌ Error loading groups:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      loadGroups();
    }
  }, [studentId, loadGroups]);

  const loadGroupMembers = async (groupId) => {
    try {
      console.log("📍 Loading members for group:", groupId);
      
      // Get all member IDs from this group
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("id, student_id")
        .eq("group_id", groupId);

      if (memberError) {
        console.error("❌ Members error:", memberError);
        return;
      }

      console.log("📍 Member data:", memberData);

      if (!memberData || memberData.length === 0) {
        setGroupMembers([]);
        return;
      }

      const studentIds = memberData.map((m) => m.student_id);
      console.log("📍 Student IDs:", studentIds);

      // Get user details for all students
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", studentIds);

      console.log("📍 Users data:", users, "Error:", usersError);

      if (usersError) {
        console.error("❌ Users fetch error:", usersError);
        return;
      }

      // Merge user data into members
      const membersWithUsers = memberData.map((member) => {
        const user = users.find((u) => u.id === member.student_id);
        return {
          id: member.id,
          student_id: member.student_id,
          users: {
            ...user,
            full_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          },
        };
      });

      console.log("✅ Members with users:", membersWithUsers);
      setGroupMembers(membersWithUsers);
    } catch (err) {
      console.error("❌ Error loading members:", err);
    }
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    await loadGroupMembers(group.id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>👥 Guruhlarim</h2>
      </div>

      {loading && <p style={styles.loading}>Yuklanmoqda...</p>}

      {!loading && groups.length === 0 && (
        <p style={styles.emptyState}>Siz hali birorta guruhga qo'shilmagansiz. O'qituvchilardan ko'rik oling! 📚</p>
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
                <p style={styles.groupTeacher}>
                  👨‍🏫 O'qituvchi: {group.users?.first_name} {group.users?.last_name}
                </p>
                <p style={styles.groupDate}>
                  {new Date(group.created_at).toLocaleDateString("uz-UZ")}
                </p>
              </div>
              <button
                onClick={() => handleSelectGroup(group)}
                style={styles.viewBtn}
              >
                📋 Ko'rish
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Group Details Modal */}
      {selectedGroup && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{selectedGroup.name}</h2>
              <div style={styles.modalActions}>
                <button
                  onClick={() => navigate(`group-chat/${selectedGroup.id}/${selectedGroup.name}`)}
                  style={styles.chatBtn}
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => {
                    setSelectedGroup(null);
                    setGroupMembers([]);
                  }}
                  style={styles.modalCloseBtn}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.detailsSection}>
                <h3>Guruh haqida</h3>
                {selectedGroup.description && (
                  <p>{selectedGroup.description}</p>
                )}
                <p style={styles.teacherInfo}>
                  👨‍🏫 O'qituvchi: {selectedGroup.users?.first_name} {selectedGroup.users?.last_name}
                </p>
                <p style={styles.dateInfo}>
                  Yaratilgan: {new Date(selectedGroup.created_at).toLocaleDateString("uz-UZ")}
                </p>
              </div>

              <div style={styles.membersSection}>
                <h3 style={{marginBottom: "10px"}}>Guruh a'zolari ({groupMembers.length})</h3>
                {groupMembers.length === 0 && (
                  <p style={styles.noMembers}>A'zolar yo'q</p>
                )}
                {groupMembers.map((member) => (
                  <div key={member.id} style={styles.memberItem}>
                    <div>
                      <p style={styles.memberName}>{member.users?.full_name}</p>
                      <p style={styles.memberEmail}>{member.users?.email}</p>
                    </div>
                  </div>
                ))}
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
    color: "#fff",
  },

  header: {
    marginBottom: "20px",
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
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    transition: "0.2s",
  },

  groupInfo: {
    flex: 1,
  },

  groupName: {
    fontSize: "20px",
    fontWeight: "bold",
    margin: "0 0 8px 0",
  },

  groupDesc: {
    fontSize: "15px",
    opacity: 0.7,
    margin: "0 0 8px 0",
  },

  groupTeacher: {
    fontSize: "15px",
    opacity: 0.8,
    margin: "0 0 5px 0",
  },

  groupDate: {
    fontSize: "14px",
    opacity: 0.5,
    margin: 0,
  },

  viewBtn: {
    background: "rgba(59, 130, 246, 0.2)",
    border: "1px solid rgba(59, 130, 246, 0.5)",
    color: "#7dd3fc",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    transition: "0.2s",
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
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
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

  detailsSection: {
    background: "rgba(255, 255, 255, 0.06)",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  teacherInfo: {
    fontSize: "15px",
    margin: "8px 0",
    opacity: 0.9,
  },

  dateInfo: {
    fontSize: "14px",
    margin: "8px 0",
    opacity: 0.7,
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
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "8px",
    marginBottom: "8px",
  },

  memberName: {
    margin: "0 0 3px 0",
    fontSize: "16px",
    fontWeight: "600",
  },

  memberEmail: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.7,
  },

  modalActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  chatBtn: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.5)",
    color: "#86efac",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    transition: "0.2s",
  },
};
