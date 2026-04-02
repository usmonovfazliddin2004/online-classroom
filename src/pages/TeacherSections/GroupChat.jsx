import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import LocationModal from "../LocationModal";
import "../../index.css";

// Import qilingan komponentlar
import MessageInput from "./components/MessageInput";
import MessageList from "./components/MessageList";
import RecordingControls from "./components/RecordingControls";
import LessonModal from "./components/LessonModal";
import VideoChat from "./components/VideoChat";

export default function GroupChat({ isTeacher }) {
  const { groupId, groupName } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingType, setRecordingType] = useState("audio");
  const mediaRecorderRef = useRef(null);
  const [lessons, setLessons] = useState([]);
  const [showRecordings, setShowRecordings] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const [localStream, setLocalStream] = useState(null);
  const [_isLiveChat, setIsLiveChat] = useState(false);
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [liveStartTime, setLiveStartTime] = useState(null);
  const [teacherLiveStatus, setTeacherLiveStatus] = useState(false);
  const [showJoinButton, setShowJoinButton] = useState(false);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  const [remotePosition, setRemotePosition] = useState({
    x: 200,
    y: 100,
  });

  const [isDraggingRemote, setIsDraggingRemote] = useState(false);

  // Ishtirokchilar paneli uchun state
  const [participantsPanelPosition, setParticipantsPanelPosition] = useState({
    x: window.innerWidth - 300,
    y: 20,
  });

  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [panelDragOffset, setPanelDragOffset] = useState({ x: 0, y: 0 });

  const [participantsPanelSize, setParticipantsPanelSize] = useState({
    width: 280,
    height: 400,
  });

  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [panelResizeStart, setPanelResizeStart] = useState({ x: 0, y: 0 });
  const [panelStartSize, setPanelStartSize] = useState({ width: 0, height: 0 });

  const [videoPosition, setVideoPosition] = useState({
    x: window.innerWidth - 240,
    y: window.innerHeight - 160,
  });

  const [isDragging, setIsDragging] = useState(false);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [videoSize, setVideoSize] = useState({
    width: 220,
    height: 140,
  });

  const [isResizing, setIsResizing] = useState(false);

  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

  const [peerConnections, setPeerConnections] = useState({});

  const [participants, setParticipants] = useState([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [_onlineParticipants, setOnlineParticipants] = useState([]); // eslint-disable-line no-unused-vars
  const [joinedParticipants, setJoinedParticipants] = useState([]); // ✅ NEW: Track who joined live stream

  // WebRTC functions
  const createPeerConnection = useCallback(async (participantId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = () => {
      // Remote track received
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from("webrtc_signaling").insert([
          {
            group_id: groupId,
            sender_id: userId,
            receiver_id: participantId,
            type: "ice-candidate",
            data: event.candidate,
          },
        ]);
      }
    };

    setPeerConnections((prev) => ({ ...prev, [participantId]: pc }));
    return pc;
  }, [groupId, userId, localStream]);

  const startLiveChat = async () => {
    if (!isTeacher) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
    setIsLiveChat(true);
    setLiveStartTime(new Date());
    setTeacherLiveStatus(true);

    // Send live chat start notification
    await supabase.from("group_messages").insert([
      {
        group_id: groupId,
        sender_id: userId,
        message: "🔴 LIVE: O'qituvchi video chatni boshladi",
        message_type: "system",
      },
    ]);

    // Notify all participants about live chat start
    const { data: groupParticipants } = await supabase
      .from("group_members")
      .select("student_id")
      .eq("group_id", groupId);

    if (groupParticipants) {
      for (const participant of groupParticipants) {
        if (participant.student_id !== userId) {
          await supabase.from("webrtc_signaling").insert([
            {
              group_id: groupId,
              sender_id: userId,
              receiver_id: participant.student_id,
              type: "live-start",
              data: { message: "Teacher started live chat" },
            },
          ]);
        }
      }
    }
  };

  const stopLiveChat = useCallback(async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setIsLiveChat(false);
    setTeacherLiveStatus(false);

    // Calculate duration
    const duration = liveStartTime ? Math.floor((new Date() - liveStartTime) / 1000) : 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationText = minutes > 0 ? `${minutes} min ${seconds} sek` : `${seconds} sek`;

    // Send live chat stop notification with duration
    await supabase.from("group_messages").insert([
      {
        group_id: groupId,
        sender_id: userId,
        message: `✅ Video chat tugadi. Davom etgan vaqti: ${durationText}`,
        message_type: "system",
      },
    ]);

    // Notify all participants about live chat end
    const { data: groupParticipants } = await supabase
      .from("group_members")
      .select("student_id")
      .eq("group_id", groupId);

    if (groupParticipants) {
      for (const participant of groupParticipants) {
        if (participant.student_id !== userId) {
          await supabase.from("webrtc_signaling").insert([
            {
              group_id: groupId,
              sender_id: userId,
              receiver_id: participant.student_id,
              type: "live-end",
              data: { message: "Teacher ended live chat" },
            },
          ]);
        }
      }
    }

    // Close peer connections
    Object.values(peerConnections).forEach((pc) => pc.close());
    setPeerConnections({});
  }, [localStream, liveStartTime, groupId, userId, peerConnections]);

  // ✅ FIX: Define stopVideoChat BEFORE it's used in useEffect to avoid TDZ error
  const stopVideoChat = useCallback(() => {
    if (isTeacher) {
      stopLiveChat();
    } else {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      setLocalStream(null);
      setIsLiveChat(false);
      // ✅ FIX: Show join button again if teacher's live chat is still active
      if (teacherLiveStatus) {
        setShowJoinButton(true);
      }
    }
  }, [isTeacher, localStream, stopLiveChat, teacherLiveStatus]);

  const peerConnectionsRef = useRef({});

  useEffect(() => {
    peerConnectionsRef.current = peerConnections;
  }, [peerConnections]);

  useEffect(() => {
    if (!groupId || !userId) return;

    const subscription = supabase
      .channel(`webrtc-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "webrtc_signaling",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { sender_id, receiver_id, type, data } = payload.new;

          // Only handle messages for current user
          if (receiver_id !== userId) return;

          if (type === "offer") {
            const pc = peerConnectionsRef.current[sender_id] || (await createPeerConnection(sender_id));
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await supabase.from("webrtc_signaling").insert([
              {
                group_id: groupId,
                sender_id: userId,
                receiver_id: sender_id,
                type: "answer",
                data: answer,
              },
            ]);
          }

          if (type === "answer") {
            const pc = peerConnectionsRef.current[sender_id];
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data));
            }
          }

          if (type === "ice-candidate") {
            const pc = peerConnectionsRef.current[sender_id];
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(data));
            }
          }

          // Talaba tomonda o'qituvchi video streamini qabul qilish
          if (type === "offer" && !isTeacher) {
            const pc = peerConnectionsRef.current[sender_id] || (await createPeerConnection(sender_id));
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await supabase.from("webrtc_signaling").insert([
              {
                group_id: groupId,
                sender_id: userId,
                receiver_id: sender_id,
                type: "answer",
                data: answer,
              },
            ]);
          }

          if (type === "answer") {
            const pc = peerConnectionsRef.current[sender_id];
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data));
            }
          }

          if (type === "ice-candidate") {
            const pc = peerConnectionsRef.current[sender_id];
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(data));
            }
          }

          if (type === "kick") {
            alert("Sizni o'qituvchi live chatdan chiqarib yubordi");
            stopVideoChat();
            return;
          }

          if (type === "live-start") {
            setTeacherLiveStatus(true);
            setShowJoinButton(true);
          }

          // ✅ FIX: Handle live-end signal from teacher
          if (type === "live-end") {
            setTeacherLiveStatus(false);
            setShowJoinButton(false);
            // Stop student's video chat if they were connected
            if (localStream) {
              stopVideoChat();
            }
          }
        },
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [groupId, userId, createPeerConnection, localStream, stopVideoChat]);

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
    });
    setStartSize({
      width: videoSize.width,
      height: videoSize.height,
    });
  };

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    setVideoSize({
      width: Math.max(150, startSize.width + dx),
      height: Math.max(100, startSize.height + dy),
    });
  }, [isResizing, resizeStart, startSize]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!groupId || !userId) return;

    const loadParticipants = async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("student_id, users(first_name, last_name)")
        .eq("group_id", groupId);

      if (!error) {
        setParticipants(data || []);
        setParticipantsCount(data?.length || 0);
      }
    };

    loadParticipants();

    const channel = supabase.channel(`online-${groupId}`, {
      config: {
        presence: { key: userId },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineIds = Object.keys(state);
      setOnlineParticipants(onlineIds);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: userId,
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [groupId, userId]);

  const [videoSource, setVideoSource] = useState("camera");
  const videoPreviewRef = useRef(null);
  const currentStreamRef = useRef(null);
  const animationRef = useRef(null);
  const cameraPreviewRef = useRef(null);

  const [focused, setFocused] = useState(null);

  const getInputStyle = (name) => ({
    ...styles.input1,
    border:
      focused === name
        ? "1px solid #3b82f6"
        : "1px solid rgba(255,255,255,0.08)",
    boxShadow: focused === name ? "0 0 0 3px rgba(59,130,246,0.25)" : "none",
    WebkitAppearance: "none",
  });

  const [editingLesson, setEditingLesson] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const isUpdatingRef = useRef(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDesc, setScheduleDesc] = useState("");
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduledLessons, setScheduledLessons] = useState([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  const [search, setSearch] = useState("");

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const loadGroups = async () => {
    const { data } = await supabase.from("groups").select("*");
    setGroups(data || []);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - videoPosition.x,
      y: e.clientY - videoPosition.y,
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setVideoPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRemoteMouseDown = () => {
    setIsDraggingRemote(true);
  };

  const handleRemoteMouseMove = useCallback((e) => {
    if (!isDraggingRemote) return;
    setRemotePosition({
      x: e.clientX - 150,
      y: e.clientY - 100,
    });
  }, [isDraggingRemote]);

  const handleRemoteMouseUp = useCallback(() => {
    setIsDraggingRemote(false);
  }, []);

  // Ishtirokchilar panelini ko'chirish
  const handlePanelMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingPanel(true);
    setPanelDragOffset({
      x: e.clientX - participantsPanelPosition.x,
      y: e.clientY - participantsPanelPosition.y,
    });
  };

  const handlePanelMouseMove = useCallback((e) => {
    if (!isDraggingPanel) return;
    setParticipantsPanelPosition({
      x: e.clientX - panelDragOffset.x,
      y: e.clientY - panelDragOffset.y,
    });
  }, [isDraggingPanel, panelDragOffset]);

  const handlePanelMouseUp = useCallback(() => {
    setIsDraggingPanel(false);
  }, []);

  // Ishtirokchilar panelini hajmini oshirish
  const handlePanelResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizingPanel(true);
    setPanelResizeStart({
      x: e.clientX,
      y: e.clientY,
    });
    setPanelStartSize({
      width: participantsPanelSize.width,
      height: participantsPanelSize.height,
    });
  };

  const handlePanelResizeMouseMove = useCallback((e) => {
    if (!isResizingPanel) return;
    const dx = e.clientX - panelResizeStart.x;
    const dy = e.clientY - panelResizeStart.y;
    setParticipantsPanelSize({
      width: Math.max(200, panelStartSize.width + dx),
      height: Math.max(200, panelStartSize.height + dy),
    });
  }, [isResizingPanel, panelResizeStart, panelStartSize]);

  const handlePanelResizeMouseUp = useCallback(() => {
    setIsResizingPanel(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleResizeMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleResizeMouseMove);
      window.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    if (isDraggingRemote) {
      window.addEventListener("mousemove", handleRemoteMouseMove);
      window.addEventListener("mouseup", handleRemoteMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleRemoteMouseMove);
      window.removeEventListener("mouseup", handleRemoteMouseUp);
    };
  }, [isDraggingRemote, handleRemoteMouseMove, handleRemoteMouseUp]);

  // Ishtirokchilar paneli event listenerlari
  useEffect(() => {
    if (isDraggingPanel) {
      window.addEventListener("mousemove", handlePanelMouseMove);
      window.addEventListener("mouseup", handlePanelMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handlePanelMouseMove);
      window.removeEventListener("mouseup", handlePanelMouseUp);
    };
  }, [isDraggingPanel, handlePanelMouseMove, handlePanelMouseUp]);

  useEffect(() => {
    if (isResizingPanel) {
      window.addEventListener("mousemove", handlePanelResizeMouseMove);
      window.addEventListener("mouseup", handlePanelResizeMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handlePanelResizeMouseMove);
      window.removeEventListener("mouseup", handlePanelResizeMouseUp);
    };
  }, [isResizingPanel, handlePanelResizeMouseMove, handlePanelResizeMouseUp]);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const [showFileMenu, setShowFileMenu] = useState(false);

  const [filter, setFilter] = useState("all");

  const [showLocationModal, setShowLocationModal] = useState(false);

  const messagesContainerRef = useRef(null);
  const prevMessagesLength = useRef(0);

  const filteredLessons = lessons.filter((lesson) => {
    if (filter === "all") return true;
    return lesson.file_type === filter;
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!groupId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("group_messages")
        .select(
          `
          *,
          users:sender_id (first_name, last_name)
        `,
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (!error) {
        setMessages(data || []);
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100,
        );
      }
    };

    loadMessages();

    const subscription = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("group_messages")
              .select(`*, users:sender_id(first_name,last_name)`)
              .eq("id", payload.new.id)
              .single();

            if (!data) return;

            // If this is a system message about live chat starting, show join button for students
            if (!isTeacher && data.message_type === "system" && data.message.includes("🔴 LIVE")) {
              setTeacherLiveStatus(true);
              setShowJoinButton(true);
            }

            setMessages((prev) => {
              const filtered = prev.filter((m) => {
                if (!String(m.id).startsWith("temp-")) return true;
                if (m.message_type === "location") {
                  return m.message !== data.message;
                }
                return true;
              });
              return [...filtered, data];
            });
          }

          if (payload.eventType === "UPDATE") {
            isUpdatingRef.current = true;
            const { data } = await supabase
              .from("group_messages")
              .select(`*, users:sender_id(first_name,last_name)`)
              .eq("id", payload.new.id)
              .single();

            if (!data) return;

            setMessages((prev) =>
              prev.map((m) => (m.id === data.id ? data : m)),
            );
          }

          if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [groupId]);

  const loadLessons = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from("group_lessons")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (!error) {
      setLessons(data || []);
    }
  }, [groupId]);

  const loadScheduledLessons = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from("scheduled_lessons")
      .select("*")
      .eq("group_id", groupId)
      .order("scheduled_at", { ascending: true });

    if (!error) {
      setScheduledLessons(data || []);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      loadLessons();
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      loadScheduledLessons();
    }
  }, [groupId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }

    if (messages.length > prevMessagesLength.current) {
      el.scrollTop = el.scrollHeight;
    }

    prevMessagesLength.current = messages.length;
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempId = "temp-" + Date.now();

    const tempMessage = {
      id: tempId,
      message: newMessage,
      sender_id: userId,
      message_type: "text",
      created_at: new Date().toLocaleString("sv-SE"),
      users: { first_name: "You", last_name: "" },
    };

    setNewMessage("");

    const { error } = await supabase.from("group_messages").insert([
      {
        group_id: groupId,
        sender_id: userId,
        message: tempMessage.message,
        message_type: "text",
      },
    ]);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const scheduleLesson = async () => {
    const { data: existingLessons } = await supabase
      .from("scheduled_lessons")
      .select("*")
      .eq("group_id", groupId);

    const newTime = new Date(scheduleDate);

    const isConflict = existingLessons?.some((lesson) => {
      const lessonTime = new Date(lesson.scheduled_at);
      const diff = Math.abs(lessonTime - newTime) / (1000 * 60);
      return diff < 60;
    });

    if (isConflict) {
      alert("❌ Bu vaqtda boshqa dars bor!");
      return;
    }
    const now = new Date();
    const selected = new Date(scheduleDate);

    if (selected <= now) {
      alert("❌ O'tgan vaqtni tanlab bo'lmaydi!");
      return;
    }

    if (!scheduleTitle || !scheduleDate) {
      alert("Mavzu va vaqtni kiriting!");
      return;
    }

    const { data, error } = await supabase
      .from("scheduled_lessons")
      .insert([
        {
          group_id: groupId,
          teacher_id: userId,
          title: scheduleTitle,
          description: scheduleDesc,
          scheduled_at: scheduleDate,
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Xatolik: " + error.message);
      return;
    }

    await supabase.from("group_messages").insert([
      {
        group_id: groupId,
        sender_id: userId,
        message: JSON.stringify({
          type: "schedule",
          lessonId: data.id,
          title: scheduleTitle,
          desc: scheduleDesc,
          date: scheduleDate,
        }),
        message_type: "schedule",
      },
    ]);

    setShowScheduleModal(false);
    setScheduleTitle("");
    setScheduleDesc("");
    setScheduleDate("");

    await loadScheduledLessons();

    alert("✅ Dars belgilandi!");
  };

  const deleteScheduledLesson = async (id) => {
    if (!window.confirm("Darsni o'chirmoqchimisiz?")) return;

    const { error } = await supabase
      .from("scheduled_lessons")
      .delete()
      .eq("id", id);

    if (!error) {
      setScheduledLessons((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const updateScheduledLesson = async () => {
    if (!editingLesson) return;

    const now = new Date();
    const selected = new Date(editDate);

    if (selected <= now) {
      alert("❌ O'tgan vaqtni tanlab bo'lmaydi!");
      return;
    }

    const { error } = await supabase
      .from("scheduled_lessons")
      .update({
        title: editTitle,
        description: editDesc,
        scheduled_at: editDate,
      })
      .eq("id", editingLesson.id);

    if (error) return;

    const { data: messages } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .eq("message_type", "schedule");

    const targetMsg = messages?.find((m) => {
      try {
        const parsed = JSON.parse(m.message);
        return parsed.lessonId === editingLesson.id;
      } catch {
        return false;
      }
    });

    if (targetMsg) {
      await supabase
        .from("group_messages")
        .update({
          message: JSON.stringify({
            type: "schedule",
            title: editTitle,
            desc: editDesc,
            date: editDate,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetMsg.id);
    }

    setScheduledLessons((prev) =>
      prev.map((l) =>
        l.id === editingLesson.id
          ? {
              ...l,
              title: editTitle,
              description: editDesc,
              scheduled_at: editDate,
            }
          : l,
      ),
    );

    setShowEditModal(false);
    setEditingLesson(null);

    alert("✅ Yangilandi!");
  };

  const isSendingLocation = useRef(false);

  const sendLocation = async (pos) => {
    if (isSendingLocation.current) return;
    isSendingLocation.current = true;

    try {
      const tempId = "temp-" + Date.now();

      const locationData = JSON.stringify({
        lat: pos.lat,
        lng: pos.lng,
      });

      const tempMessage = {
        id: tempId,
        message: locationData,
        sender_id: userId,
        message_type: "location",
        created_at: new Date().toLocaleString("sv-SE"),
        users: { first_name: "You", last_name: "" },
      };

      setMessages((prev) => [...prev, tempMessage]);

      const { error } = await supabase.from("group_messages").insert([
        {
          group_id: groupId,
          sender_id: userId,
          message: locationData,
          message_type: "location",
        },
      ]);

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } finally {
      isSendingLocation.current = false;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tempId = Date.now();
    const fileName = `${Date.now()}-${file.name}`;

    const tempMessage = {
      id: tempId,
      message: "📎 Yuklanmoqda...",
      sender_id: userId,
      message_type: "file",
      created_at: new Date().toISOString(),
      users: { first_name: "You", last_name: "" },
    };

    setMessages((prev) => [...prev, tempMessage]);

    const { error } = await supabase.storage
      .from("group-files")
      .upload(fileName, file);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert(error.message);
      return;
    }

    const { data } = supabase.storage
      .from("group-files")
      .getPublicUrl(fileName);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...m, message: data.publicUrl } : m,
      ),
    );

    await supabase.from("group_messages").insert([
      {
        group_id: groupId,
        sender_id: userId,
        message: data.publicUrl,
        message_type: "file",
      },
    ]);
  };

  const startRecording = async () => {
    try {
      // Get microphone audio FIRST - this is the primary audio source
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2,
        },
      });

      // Verify audio track is working
      const audioTrack = micStream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No microphone audio track");
      }

      // Check if audio track has signal (not silent)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const micSource = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      micSource.connect(analyser);
      
      // Get screen stream with video
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false, // Don't capture system audio to avoid conflicts
      });

      // Create canvas for compositing
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 1920;
      canvas.height = 1080;

      // Create video element for screen
      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      await screenVideo.play();

      // Create video element for camera (picture-in-picture)
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false, // Audio already captured from micStream
      });

      const cameraVideo = document.createElement("video");
      cameraVideo.srcObject = cameraStream;
      cameraVideo.muted = true;
      await cameraVideo.play();

      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = cameraStream;
      }

      // Create destination stream for recording
      const dest = audioContext.createMediaStreamDestination();
      micSource.connect(dest);

      // Draw function for canvas
      const draw = () => {
        // Clear canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw screen video (full)
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        // Draw camera video (picture-in-picture, bottom right)
        const camWidth = 320;
        const camHeight = 240;
        ctx.drawImage(
          cameraVideo,
          canvas.width - camWidth - 20,
          canvas.height - camHeight - 20,
          camWidth,
          camHeight
        );

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();

      // Capture canvas video stream
      const canvasStream = canvas.captureStream(30);

      // Create final combined stream
      const combinedStream = new MediaStream();
      
      // Add video track from canvas
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (videoTrack) {
        combinedStream.addTrack(videoTrack);
        console.log("✅ Video track added:", videoTrack.label);
      }

      // Add audio track from microphone
      const audioTrackFromDest = dest.stream.getAudioTracks()[0];
      if (audioTrackFromDest) {
        combinedStream.addTrack(audioTrackFromDest);
        console.log("✅ Audio track added:", audioTrackFromDest.label);
      }

      // Verify combined stream
      console.log("📊 Combined stream tracks:", combinedStream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })));

      // Preview the combined stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = combinedStream;
        videoPreviewRef.current.muted = false;
        videoPreviewRef.current.volume = 1;
      }

      // Determine best MIME type
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=h264,aac",
        "video/webm",
      ];
      
      let selectedMimeType = "video/webm";
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      console.log("🎬 Selected MIME type:", selectedMimeType);

      // Create MediaRecorder with proper options
      const options = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps
        audioBitsPerSecond: 192000, // 192 kbps
      };

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;

      console.log("🎥 MediaRecorder created");
      console.log("🎥 Stream tracks:", mediaRecorder.stream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
      })));

      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log("📦 Data chunk received, size:", e.data.size);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("⏹️ Recording stopped, total chunks:", chunks.length);
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecordedChunks([blob]);
        cancelAnimationFrame(animationRef.current);

        // Clean up
        screenStream.getTracks().forEach(track => track.stop());
        cameraStream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };

      mediaRecorder.onerror = (e) => {
        console.error("❌ MediaRecorder error:", e.error);
      };

      // Start recording
      mediaRecorder.start(1000);
      console.log("▶️ Recording started");
      setIsRecording(true);

    } catch (err) {
      console.error("❌ Recording error:", err);
      alert("❌ Xatolik: " + err.message);
    }
  };

  const startVideoChat = async () => {
    if (isTeacher) {
      await startLiveChat();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setLocalStream(stream);
        currentStreamRef.current = stream;
        setIsLiveChat(true);

        // ✅ FIX: Mark student as joined when they start video chat
        setJoinedParticipants(prev => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });

        // ✅ FIX: Send join notification to teacher
        await supabase.from("webrtc_signaling").insert([
          {
            group_id: groupId,
            sender_id: userId,
            receiver_id: participants.find(p => p.student_id !== userId)?.student_id || userId, // Teacher ID needed
            type: "student-joined",
            data: { message: "Student joined live chat", studentId: userId },
          },
        ]);

        // ✅ FIX: Create offer to teacher for receiving their stream
        const teacherId = participants.find(p => p.users)?.student_id; // Need to get teacher ID properly
        if (teacherId) {
          const pc = await createPeerConnection(teacherId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          await supabase.from("webrtc_signaling").insert([
            {
              group_id: groupId,
              sender_id: userId,
              receiver_id: teacherId,
              type: "offer",
              data: offer,
            },
          ]);
        }
      } catch (err) {
        console.error("❌ Video chat error:", err);
        alert("❌ Video chatga ulanishda xatolik: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();

      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach((track) => track.stop());

      cancelAnimationFrame(animationRef.current);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }

      setIsRecording(false);
    }
  };

  const uploadRecording = async (title) => {
    if (recordedChunks.length === 0 || !isTeacher) {
      alert("Teacher bo'lmaysiz yoki recording yo'q");
      return;
    }

    const file = recordedChunks[0];
    const fileName = `${groupId}-${Date.now()}.${recordingType === "audio" ? "webm" : "webm"}`;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("❌ Siz login qilmagan bo'lishingiz kerak!");
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from("group-recordings")
        .upload(fileName, file, {
          cacheControl: "3600",
          contentType: file.type,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        alert(
          "Storage xatosi: " +
            uploadError.message +
            "\n\nBucket: group-recordings\nCheck if it's PUBLIC!",
        );
        return;
      }

      const { data: publicData } = supabase.storage
        .from("group-recordings")
        .getPublicUrl(fileName);

      const fileUrl = publicData.publicUrl;

      const { error: dbError } = await supabase
        .from("group_lessons")
        .insert([
          {
            group_id: groupId,
            teacher_id: userId,
            title:
              title || `${recordingType === "audio" ? "Audio" : "Video"} Dars`,
            description: `Uploaded: ${new Date().toLocaleString("uz-UZ")}`,
            file_url: fileUrl,
            file_type: recordingType,
            duration_seconds: Math.floor(Math.random() * 3600),
          },
        ])
        .select();

      if (dbError) {
        console.error("❌ Database error:", dbError);
        alert("Database xatosi: " + dbError.message);
        return;
      }

      alert("✅ Recording saqlandi va havola qilindi!");
      setRecordedChunks([]);
      setShowRecordings(true);
      await loadLessons();
    } catch (err) {
      console.error("❌ Exception:", err);
      alert("Xatolik: " + err.message);
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm("Xabarni o'chirmoqchimisiz?")) return;

    const { error } = await supabase
      .from("group_messages")
      .delete()
      .eq("id", id);

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const shareToGroups = async () => {
    if (!selectedLesson || selectedGroups.length === 0) return;

    const inserts = selectedGroups.map((gid) => ({
      group_id: gid,
      sender_id: userId,
      message: selectedLesson.file_url,
      message_type: selectedLesson.file_type,
    }));

    const { error } = await supabase.from("group_messages").insert(inserts);

    if (!error) {
      setShowShareModal(false);
      setSelectedGroups([]);
    }
  };

  const switchVideoSource = async (type) => {
    if (!currentStreamRef.current) return;

    let newVideoTrack;
    let newStream;

    try {
      if (type === "camera") {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        newVideoTrack = newStream.getVideoTracks()[0];
      }

      if (type === "screen") {
        newStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        newVideoTrack = newStream.getVideoTracks()[0];
      }

      if (!newVideoTrack) return;

      const oldTrack = currentStreamRef.current.getVideoTracks()[0];

      if (oldTrack) {
        currentStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }

      currentStreamRef.current.addTrack(newVideoTrack);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
        videoPreviewRef.current.srcObject = currentStreamRef.current;
      }
    } catch (err) {
      alert("❌ O'zgartirishda xatolik: " + err.message);
    }
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm("Darsni o'chirmoqchimisiz?")) return;

    const fileName = lesson.file_url.split("/").pop();

    await supabase.storage.from("group-recordings").remove([fileName]);

    const { error } = await supabase
      .from("group_lessons")
      .delete()
      .eq("id", lesson.id);

    if (!error) {
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
    }
  };

  const updateMessage = async (id, type) => {
    if (String(id).startsWith("temp-")) return;

    if (type === "text") {
      if (editingText === "") {
        setEditingId(null);
        return;
      }

      const { error } = await supabase
        .from("group_messages")
        .update({
          message: editingText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return;
      }
    } else {
      const { error } = await supabase
        .from("group_messages")
        .update({
          caption: editingText || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return;
      }
    }

    setEditingId(null);
    setEditingText("");
  };

  const getFileIcon = (url) => {
    if (url.match(/\.(jpg|jpeg|png|gif)/)) return "🖼";
    if (url.match(/\.(mp4|mov|webm)/)) return "🎥";
    if (url.match(/\.(pdf)/)) return "📕";
    if (url.match(/\.(doc|docx)/)) return "📄";
    return "📎";
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getLessonStatus = (date) => {
    const now = new Date();
    const lessonTime = new Date(date);
    const diff = lessonTime - now;

    if (diff <= 0 && diff > -60 * 60 * 1000) {
      return "live";
    }

    if (diff > 0 && diff <= 10 * 60 * 1000) {
      return "soon";
    }

    return "normal";
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 15px",
          backdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.3)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            cursor: "pointer",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(37,99,235,0.5))";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <i className="fas fa-chevron-left" style={{ fontSize: "14px" }}></i>
        </button>

        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: "600",
            color: "#fff",
            textAlign: "center",
            flex: 1,
          }}
        >
          Guruh nomi: {groupName}
        </h3>

        {isTeacher ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowScheduleModal(true)}
              style={{
                padding: "6px 10px",
                borderRadius: "10px",
                border: "none",
                background: "rgba(34,197,94,0.2)",
                color: "#86efac",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              📅 Schedule
            </button>

            <button
              onClick={() => setShowScheduled((prev) => !prev)}
              style={{
                padding: "6px 10px",
                borderRadius: "10px",
                border: "none",
                background: "rgba(234,179,8,0.2)",
                color: "#facc15",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              📂 Rejalar
            </button>

            <button
              onClick={() => setShowRecordings(!showRecordings)}
              style={{
                padding: "6px 12px",
                borderRadius: "10px",
                border: "none",
                background: "rgba(59,130,246,0.2)",
                color: "#93c5fd",
                cursor: "pointer",
                fontSize: "13px",
                transition: "0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.2)";
              }}
            >
              <i className="fas fa-video" style={{ marginRight: "5px" }}></i>
              Darslar ({lessons.length})
            </button>
          </div>
        ) : (
          <div style={{ width: "38px" }}></div>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setShowRecordings(false)}
          style={{
            ...styles.tabBtn,
            background: !showRecordings
              ? "rgba(59, 130, 246, 0.3)"
              : "transparent",
          }}
        >
          💬 Chat
        </button>

        {isTeacher && (
          <button
            onClick={() => setShowRecordings(true)}
            style={{
              ...styles.tabBtn,
              background: showRecordings
                ? "rgba(59, 130, 246, 0.3)"
                : "transparent",
            }}
          >
            📹 Recorded Lessons
          </button>
        )}
      </div>

      {/* Chat Section */}
      {!showRecordings && (
        <div style={styles.chatContainer}>
          {showScheduled && scheduledLessons.length > 0 && (
            <div
              style={{
                padding: "10px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p style={{ fontSize: "13px", opacity: 0.7 }}>
                📅 Rejalashtirilgan darslar
              </p>

              {scheduledLessons.map((lesson) => {
                const status = getLessonStatus(lesson.scheduled_at);

                return (
                  <div
                    key={lesson.id}
                    style={{
                      padding: "10px",
                      marginTop: "6px",
                      borderRadius: "10px",
                      background:
                        status === "live"
                          ? "rgba(239,68,68,0.2)"
                          : status === "soon"
                            ? "rgba(234,179,8,0.2)"
                            : "rgba(34,197,94,0.1)",
                      border:
                        status === "live"
                          ? "1px solid rgba(239,68,68,0.5)"
                          : status === "soon"
                            ? "1px solid rgba(234,179,8,0.5)"
                            : "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "12px" }}>
                      {status === "live"
                        ? "🔴 LIVE NOW"
                        : status === "soon"
                          ? "⏰ 10 min qoldi"
                          : ""}
                    </p>

                    <p style={{ margin: "2px 0", fontSize: "13px" }}>
                      📚 {lesson.title}
                    </p>

                    <p style={{ margin: 0, fontSize: "12px", opacity: 0.7 }}>
                      ⏰ {new Date(lesson.scheduled_at).toLocaleString("uz-UZ")}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "6px",
                        marginTop: "6px",
                      }}
                    >
                      <button
                        onClick={() => {
                          setEditingLesson(lesson);
                          setEditTitle(lesson.title);
                          setEditDesc(lesson.description || "");
                          setEditDate(lesson.scheduled_at);
                          setShowEditModal(true);
                        }}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "none",
                          background: "rgba(59,130,246,0.2)",
                          color: "#93c5fd",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => deleteScheduledLesson(lesson.id)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "none",
                          background: "rgba(239,68,68,0.2)",
                          color: "#f87171",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Messages - MessageList komponenti */}
          <MessageList
            messages={messages}
            userId={userId}
            editingId={editingId}
            editingText={editingText}
            setEditingText={setEditingText}
            setEditingId={setEditingId}
            onUpdateMessage={updateMessage}
            onDeleteMessage={deleteMessage}
            messagesEndRef={messagesEndRef}
            messagesContainerRef={messagesContainerRef}
            formatTime={formatTime}
            getFileIcon={getFileIcon}
          />

          {/* Input - MessageInput komponenti */}
          <MessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={sendMessage}
            onFileUpload={handleFileUpload}
            onLocationClick={() => setShowLocationModal(true)}
            showFileMenu={showFileMenu}
            setShowFileMenu={setShowFileMenu}
          />

          {showLocationModal && (
            <LocationModal
              onSend={async (pos) => {
                await sendLocation(pos);
                setShowLocationModal(false);
              }}
              onClose={() => setShowLocationModal(false)}
            />
          )}

          {/* Teacher Live Status Indicator & Join Button for Students */}
          {!showRecordings && !isTeacher && teacherLiveStatus && !localStream && showJoinButton && (
            <div
              style={{
                padding: "12px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
                animation: "pulse 2s infinite",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🔴</span>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#fca5a5" }}>
                    O'qituvchi LIVE dars boshladi!
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#fca5a5", opacity: 0.8 }}>
                    Darsda qatnashish uchun pastdagi tugmani bosing
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setShowJoinButton(false);
                  await startVideoChat();
                }}
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.4)";
                }}
              >
                📹 Qo'shilish
              </button>
            </div>
          )}

          {/* Recording Controls - RecordingControls komponenti */}
          {!showRecordings && isTeacher && (
            <RecordingControls
              isRecording={isRecording}
              recordingType={recordingType}
              setRecordingType={setRecordingType}
              videoSource={videoSource}
              setVideoSource={setVideoSource}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onStartVideoChat={startVideoChat}
              onStopVideoChat={stopVideoChat}
              onSwitchVideoSource={switchVideoSource}
              recordedChunks={recordedChunks}
              onUploadRecording={uploadRecording}
            />
          )}

          {/* Video Chat - VideoChat komponenti */}
          {localStream && (
            <VideoChat
              localStream={localStream}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              videoPosition={videoPosition}
              videoSize={videoSize}
              remotePosition={remotePosition}
              onHandleMouseDown={handleMouseDown}
              onHandleRemoteMouseDown={handleRemoteMouseDown}
              onHandleResizeMouseDown={handleResizeMouseDown}
              onHandlePanelMouseDown={handlePanelMouseDown}
              onHandlePanelResizeMouseDown={handlePanelResizeMouseDown}
              participantsCount={participantsCount}
              participants={participants}
              joinedParticipants={joinedParticipants}
              currentUserId={userId}
              isTeacher={isTeacher}
            />
          )}
        </div>
      )}

      {/* Lessons Section */}
      {showRecordings && isTeacher && (
        <div style={styles.lessonsContainer} className="no-scrollbar">
          <h4 style={{ marginBottom: "15px" }}>
            📹 Recorded Lessons ({lessons.length})
          </h4>

          <div style={{ marginBottom: "10px", gap: "4px", display: "flex" }}>
            <button style={styles.filterBtn} onClick={() => setFilter("all")}>
              All
            </button>
            <button style={styles.filterBtn} onClick={() => setFilter("audio")}>
              🎙 Audio
            </button>
            <button style={styles.filterBtn} onClick={() => setFilter("video")}>
              🎥 Video
            </button>
          </div>

          {lessons.length === 0 ? (
            <p style={styles.emptyText}>Hali dars yo'q</p>
          ) : (
            filteredLessons.map((lesson) => (
              <div key={lesson.id} style={styles.lessonItem}>
                <div>
                  <h5>{lesson.title}</h5>
                  <p>{lesson.description}</p>
                  <p style={styles.lessonMeta}>
                    {new Date(lesson.created_at).toLocaleDateString("uz-UZ")} •{" "}
                    {lesson.file_type === "audio" ? "🎙️ Audio" : "🎥 Video"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href={lesson.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.playBtn}
                  >
                    ▶️ Play
                  </a>

                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setShowShareModal(true);
                    }}
                    style={styles.shareBtn}
                  >
                    <i className="fas fa-share"></i>
                  </button>

                  <button
                    onClick={() => deleteLesson(lesson)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      background: "rgba(239, 68, 68, 0.08)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "13px",
                      transition: "0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(239, 68, 68, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(239, 68, 68, 0.08)";
                    }}
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals - LessonModal komponenti */}
      <LessonModal
        showScheduleModal={showScheduleModal}
        setShowScheduleModal={setShowScheduleModal}
        scheduleTitle={scheduleTitle}
        setScheduleTitle={setScheduleTitle}
        scheduleDesc={scheduleDesc}
        setScheduleDesc={setScheduleDesc}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        onScheduleLesson={scheduleLesson}
        getInputStyle={getInputStyle}
        setFocused={setFocused}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editDesc={editDesc}
        setEditDesc={setEditDesc}
        editDate={editDate}
        setEditDate={setEditDate}
        onUpdateScheduledLesson={updateScheduledLesson}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        selectedGroups={selectedGroups}
        setSelectedGroups={setSelectedGroups}
        filteredGroups={filteredGroups}
        search={search}
        setSearch={setSearch}
        onShareToGroups={shareToGroups}
      />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    color: "#fff",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    padding: "20px",
    overflow: "hidden",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 15px",
    marginBottom: "12px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0,0,0,0.2)",
    backdropFilter: "blur(6px)",
  },

  recordingsBtn: {
    background: "rgba(59, 130, 246, 0.2)",
    border: "1px solid rgba(59, 130, 246, 0.5)",
    color: "#7dd3fc",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  tabs: {
    display: "flex",
    gap: "10px",
    padding: "10px 10px",
    marginBottom: "10px",
  },

  tabBtn: {
    padding: "10px 16px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "transparent",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "0.2s",
  },

  chatContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: "10px",
    minHeight: 0,
  },

  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    padding: "10px",
    gap: "6px",

    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },

  messageItem: {
    display: "flex",
    flexDirection: "column",
    padding: "10px 65px 10px 14px",
    borderRadius: "14px",
    maxWidth: "70%",
    fontSize: "14px",
    position: "relative",
  },

  messageSender: {
    fontSize: "15px",
    opacity: 0.7,
    margin: "0 0 5px 0",
    fontWeight: "600",
  },

  messageText: {
    margin: "0 0 5px 0",
    fontSize: "14px",
  },

  messageTime: {
    fontSize: "11px",
    opacity: 0.6,
    marginTop: "6px",
    alignSelf: "flex-start",
  },
  inputSection: {
    display: "flex",
    gap: "10px",
    padding: "10px",
    background: "rgba(0,0,0,0.2)",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
  },

  input: {
    flex: 1,
    padding: "10px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
  },

  input1: {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.25s ease",
    backdropFilter: "blur(8px)",
    WebkitAppearance: "none",
    marginBottom: "16px",
  },
  inputDate: {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    backdropFilter: "blur(8px)",
    transition: "all 0.25s ease",
  },

  sendBtn: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.5)",
    color: "#86efac",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  recordingSection: {
    background: "rgba(255,255,255,0.05)",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    position: "relative",
  },

  recordingControls: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },

  select: {
    flex: 1,
    padding: "10px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
  },

  recordBtn: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    color: "#f87171",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  stopBtn: {
    background: "rgba(168, 85, 247, 0.2)",
    border: "1px solid rgba(168, 85, 247, 0.5)",
    color: "#d8b4fe",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  recordedPreview: {
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    padding: "12px",
    borderRadius: "6px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  uploadBtn: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.5)",
    color: "#86efac",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  lessonsContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },

  emptyText: {
    textAlign: "center",
    opacity: 0.6,
    marginTop: "20px",
  },

  lessonItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    marginBottom: "10px",
    gap: "15px",
  },

  lessonMeta: {
    fontSize: "12px",
    opacity: 0.6,
    margin: "5px 0 0 0",
  },

  playBtn: {
    background: "rgba(59, 130, 246, 0.2)",
    border: "1px solid rgba(59, 130, 246, 0.5)",
    color: "#7dd3fc",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    position: "absolute",
    top: "4px",
    right: "6px",
    background: "transparent",
    border: "none",
    color: "#f87171",
    cursor: "pointer",
    fontSize: "14px",
    opacity: 0,
    transition: "0.2s",
  },

  filterBtn: {
    padding: "6px 12px",
    marginRight: "5px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: "rgba(59,130,246,0.2)",
    color: "#7dd3fc",
  },
  attachBtn: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#9ca3af",
    transition: "0.2s",
  },

  fileMenu: {
    position: "absolute",
    bottom: "45px",
    right: "0",
    minWidth: "180px",
    background: "#1f2937",
    borderRadius: "10px",
    padding: "8px 0",
    boxShadow: "0 8px 25px rgba(0,0,0,0.6)",
    zIndex: 9999,
    transform: "translateX(0%)",
  },

  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#e5e7eb",
    fontSize: "14px",
    transition: "0.2s",
  },

  fileItemHover: {
    background: "rgba(255,255,255,0.08)",
  },
  fileBox: {
    background: "rgba(255,255,255,0.08)",
    padding: "10px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    maxWidth: "250px",
  },

  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  fileIcon: {
    fontSize: "24px",
  },

  fileName: {
    margin: 0,
    fontSize: "13px",
    color: "#fff",
    fontWeight: "500",
  },

  fileLink: {
    fontSize: "12px",
    color: "#60a5fa",
    textDecoration: "none",
  },
  shareBtn: {
    background: "rgba(59, 130, 246, 0.2)",
    border: "1px solid rgba(59, 130, 246, 0.5)",
    color: "#7dd3fc",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },

  modal: {
    width: "100%",
    maxWidth: "420px",
    padding: "28px",
    borderRadius: "20px",
    background: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    color: "#fff",
    animation: "fadeIn 0.3s ease",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  groupList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "15px",
  },

  groupItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    transition: "0.2s",
  },

  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },

  cancelBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    cursor: "pointer",
  },

  sendBtnModal: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
};

/* ===== RESPONSIVE STYLES ===== */
const responsiveStyles = `
  /* ===== TABLET (768px - 1023px) ===== */
  @media (max-width: 1023px) {
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }

  /* ===== MOBILE (767px and below) ===== */
  @media (max-width: 767px) {
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }
`;

// Add responsive styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = responsiveStyles;
  document.head.appendChild(styleSheet);
}
