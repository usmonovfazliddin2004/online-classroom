export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Tasdiqlash", 
  message = "Ushbu amalni bajarishga ishonchingiz komilmi?",
  confirmText = "Ha",
  cancelText = "Yo'q"
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={styles.confirmBtn}
          >
            {confirmText}
          </button>
          <button 
            onClick={onClose}
            style={styles.cancelBtn}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "linear-gradient(145deg, #1e293b, #0f172a)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
    maxWidth: "400px",
    width: "90%",
    animation: "scaleIn 0.2s ease",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  message: {
    margin: "0 0 20px 0",
    fontSize: "15px",
    color: "#cbd5e1",
    lineHeight: "1.5",
  },
  actions: {
    display: "flex",
    gap: "12px",
  },
  confirmBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#94a3b8",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};

// Add animation styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
`;
document.head.appendChild(styleSheet);