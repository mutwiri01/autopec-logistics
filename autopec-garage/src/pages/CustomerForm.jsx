/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import {
  FaCar,
  FaUser,
  FaPhone,
  FaPaperPlane,
  FaImage,
  FaVideo,
  FaTimes,
  FaCloudUploadAlt,
  FaCamera,
  FaStop,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUserPlus,
  FaUserCheck,
  FaSearch,
  FaHistory,
  FaPlus,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaClock,
  FaWrench,
  FaTools,
  FaCarSide,
  FaSyncAlt,
  FaArrowLeft,
} from "react-icons/fa";
import {
  submitRepairRequest,
  trackRepair,
  isValidMediaFile,
  formatFileSize,
} from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StatusBadge from "../components/StatusBadge";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  border: "2px solid #e0e0e0",
  borderRadius: "10px",
  fontSize: "15px",
  fontFamily: "'Barlow', sans-serif",
  background: "#fafafa",
  color: "#1a1a2e",
  transition: "all 0.2s",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.85rem",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#555",
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

const ToggleSelector = ({ mode, onChange }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "28px",
    }}
  >
    {[
      {
        key: "new",
        icon: <FaUserPlus size={22} />,
        label: "New Customer",
        sub: "First time? Start here",
      },
      {
        key: "existing",
        icon: <FaUserCheck size={22} />,
        label: "Existing Customer",
        sub: "Track or add a repair",
      },
    ].map(({ key, icon, label, sub }) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        style={{
          padding: "20px 16px",
          borderRadius: "12px",
          border: `2px solid ${mode === key ? "#c0392b" : "#e0e0e0"}`,
          background:
            mode === key ? "linear-gradient(135deg,#c0392b,#96281b)" : "white",
          color: mode === key ? "white" : "#555",
          cursor: "pointer",
          transition: "all 0.25s",
          textAlign: "center",
          boxShadow: mode === key ? "0 4px 20px rgba(192,57,43,0.3)" : "none",
        }}
      >
        <div style={{ marginBottom: "8px", opacity: mode === key ? 1 : 0.6 }}>
          {icon}
        </div>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            opacity: 0.75,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      </button>
    ))}
  </div>
);

/* ─── Existing Customer Lookup ─────────────────────────────────────────────── */
const ExistingCustomerView = ({ onAddRepair, onBack }) => {
  const [regNumber, setRegNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [customerData, setCustomerData] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!regNumber.trim() || !phone.trim()) {
      setLookupError("Both registration number and phone number are required.");
      return;
    }
    setLooking(true);
    setLookupError("");
    setCustomerData(null);
    try {
      // Normalize: strip spaces so "KCA 123T" matches stored "KCA123T"
      const normalized = regNumber.trim().replace(/\s+/g, "").toUpperCase();
      const repair = await trackRepair(normalized);
      // Verify phone matches
      if (
        !repair.phoneNumber ||
        repair.phoneNumber.replace(/\s/g, "") !== phone.replace(/\s/g, "")
      ) {
        setLookupError(
          "No matching record found. Please check your registration number and phone number.",
        );
      } else {
        setCustomerData(repair);
      }
    } catch (err) {
      setLookupError(
        err.message || "No record found. Please check your details.",
      );
    } finally {
      setLooking(false);
    }
  };

  const statusSteps = ["submitted", "in_garage", "in_progress", "completed"];
  const stepLabels = {
    submitted: "Submitted",
    in_garage: "In Garage",
    in_progress: "In Progress",
    completed: "Completed",
  };
  const stepIcons = {
    submitted: <FaCarSide />,
    in_garage: <FaTools />,
    in_progress: <FaWrench />,
    completed: <FaCheckCircle />,
  };
  const stepColors = {
    submitted: "#f39c12",
    in_garage: "#0984e3",
    in_progress: "#00b894",
    completed: "#27ae60",
  };

  if (customerData) {
    const currentStepIdx = statusSteps.indexOf(customerData.status);
    return (
      <div style={{ animation: "fadeUp 0.4s ease both" }}>
        {/* Customer Header Card */}
        <div
          style={{
            background: "linear-gradient(135deg,#1a1a2e,#16213e)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "20px",
            color: "white",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg,#c0392b,#f39c12)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                {customerData.registrationNumber}
              </div>
              <div
                style={{ opacity: 0.7, fontSize: "0.9rem", marginTop: "4px" }}
              >
                {customerData.carModel || "Vehicle"} ·{" "}
                {customerData.customerName || "Customer"}
              </div>
              <div
                style={{ opacity: 0.5, fontSize: "0.8rem", marginTop: "2px" }}
              >
                {customerData.phoneNumber}
              </div>
            </div>
            <StatusBadge status={customerData.status} size="lg" />
          </div>
        </div>

        {/* Progress Stepper */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#888",
              marginBottom: "16px",
            }}
          >
            Repair Progress
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            {statusSteps.map((step, idx) => {
              const done = idx <= currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <React.Fragment key={step}>
                  {idx > 0 && (
                    <div
                      style={{
                        flex: 1,
                        height: "3px",
                        background:
                          idx <= currentStepIdx
                            ? stepColors[statusSteps[currentStepIdx]]
                            : "#e0e0e0",
                        transition: "background 0.4s",
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: done
                          ? stepColors[statusSteps[currentStepIdx]]
                          : "#e0e0e0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: done ? "white" : "#aaa",
                        fontSize: "14px",
                        border: active
                          ? `3px solid ${stepColors[step]}`
                          : "3px solid transparent",
                        boxSizing: "border-box",
                        transition: "all 0.3s",
                        boxShadow: active
                          ? `0 0 0 3px ${stepColors[step]}33`
                          : "none",
                      }}
                    >
                      {stepIcons[step]}
                    </div>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: active ? 700 : 500,
                        color: active
                          ? stepColors[step]
                          : done
                            ? "#555"
                            : "#aaa",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {stepLabels[step]}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Latest Repair Details */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#888",
              marginBottom: "12px",
            }}
          >
            Latest Repair
          </div>
          <div
            style={{
              background: "#fafafa",
              borderRadius: "8px",
              padding: "14px",
              borderLeft: "4px solid #c0392b",
              color: "#424242",
              lineHeight: 1.6,
              fontSize: "0.95rem",
              marginBottom: "12px",
            }}
          >
            {customerData.problemDescription}
          </div>
          {customerData.mechanicNotes && (
            <div>
              <div style={{ ...labelStyle, marginBottom: "6px" }}>
                <FaWrench style={{ color: "#00b894" }} /> Mechanic Notes
              </div>
              <div
                style={{
                  background: "#e8f8f5",
                  borderRadius: "8px",
                  padding: "12px",
                  borderLeft: "4px solid #00b894",
                  color: "#424242",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                }}
              >
                {customerData.mechanicNotes}
              </div>
            </div>
          )}
          <div
            style={{
              marginTop: "12px",
              fontSize: "0.8rem",
              color: "#aaa",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span>Submitted: {formatDate(customerData.createdAt)}</span>
            <span>
              Updated:{" "}
              {formatDate(customerData.updatedAt || customerData.createdAt)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              onAddRepair({
                registrationNumber: customerData.registrationNumber,
                customerName: customerData.customerName,
                phoneNumber: customerData.phoneNumber,
                carModel: customerData.carModel,
              })
            }
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "14px 20px",
              background: "linear-gradient(135deg,#c0392b,#96281b)",
              color: "white",
              border: "none",
              borderRadius: "50px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(192,57,43,0.3)",
            }}
          >
            <FaPlus /> Add New Repair
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "14px 20px",
              background: "white",
              color: "#555",
              border: "2px solid #e0e0e0",
              borderRadius: "50px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaArrowLeft /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div
        style={{
          background: "#f0f6ff",
          border: "1px solid #c3d9f0",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
        }}
      >
        <FaInfoCircle
          style={{ color: "#0984e3", marginTop: "2px", flexShrink: 0 }}
        />
        <p style={{ fontSize: "0.9rem", color: "#1a4f7a", lineHeight: 1.5 }}>
          Enter your <strong>vehicle registration</strong> and{" "}
          <strong>phone number</strong> to view your repair history and add new
          issues.
        </p>
      </div>

      <form onSubmit={handleLookup}>
        <div style={{ display: "grid", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>
              <FaCar /> Registration Number
            </label>
            <input
              type="text"
              value={regNumber}
              onChange={(e) =>
                setRegNumber(e.target.value.replace(/\s+/g, "").toUpperCase())
              }
              placeholder="e.g., KCA123A"
              style={inputStyle}
              maxLength={20}
            />
          </div>
          <div>
            <label style={labelStyle}>
              <FaPhone /> Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0700 000 000"
              style={inputStyle}
            />
          </div>
        </div>

        {lookupError && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #feb2b2",
              color: "#c0392b",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              fontSize: "0.9rem",
            }}
          >
            <FaExclamationTriangle style={{ flexShrink: 0 }} />
            {lookupError}
          </div>
        )}

        <button
          type="submit"
          disabled={looking}
          style={{
            width: "100%",
            padding: "14px",
            background: looking
              ? "#ccc"
              : "linear-gradient(135deg,#1a1a2e,#16213e)",
            color: "white",
            border: "none",
            borderRadius: "50px",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: looking ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {looking ? (
            <>
              <FaSyncAlt style={{ animation: "spin 1s linear infinite" }} />
              Looking Up...
            </>
          ) : (
            <>
              <FaSearch /> Find My Records
            </>
          )}
        </button>
      </form>
    </div>
  );
};

/* ─── Main Repair Form ────────────────────────────────────────────────────── */
const RepairForm = ({
  prefillData = {},
  isExistingCustomer = false,
  onSuccess,
  onBack,
}) => {
  const [formData, setFormData] = useState({
    registrationNumber: prefillData.registrationNumber || "",
    problemDescription: "",
    customerName: prefillData.customerName || "",
    phoneNumber: prefillData.phoneNumber || "",
    carModel: prefillData.carModel || "",
    multimedia: [],
  });
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureType, setCaptureType] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileErrors, setFileErrors] = useState([]);
  const [totalSize, setTotalSize] = useState(0);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const MAX_FILES = 3;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 10 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    const size = formData.multimedia.reduce((acc, f) => acc + f.size, 0);
    setTotalSize(size);
  }, [formData.multimedia]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const cleanupMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const startCapture = async (type) => {
    setError(null);
    setCaptureType(type);
    setShowCaptureModal(true);
    try {
      const constraints = {
        video: type === "photo" || type === "video",
        audio: type === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (type === "video") {
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: "video/webm",
          });
        } catch {
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
        setupMediaRecorder("video");
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      setShowCaptureModal(false);
    }
  };

  const setupMediaRecorder = (type) => {
    const chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      if (formData.multimedia.length >= MAX_FILES) {
        setError(`Max ${MAX_FILES} files allowed`);
        stopCapture();
        return;
      }
      if (blob.size > MAX_VIDEO_SIZE) {
        setError(`Video exceeds 10MB limit`);
        stopCapture();
        return;
      }
      const file = new File([blob], `video_${Date.now()}.webm`, {
        type: "video/webm",
      });
      setFormData((p) => ({ ...p, multimedia: [...p.multimedia, file] }));
      stopCapture();
    };
  };

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      let s = 0;
      recordingIntervalRef.current = setInterval(() => {
        s++;
        setRecordingTime(s);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (formData.multimedia.length >= MAX_FILES) {
          setError(`Max ${MAX_FILES} files`);
          stopCapture();
          return;
        }
        if (blob.size > MAX_IMAGE_SIZE) {
          setError(`Photo exceeds 5MB`);
          stopCapture();
          return;
        }
        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setFormData((p) => ({ ...p, multimedia: [...p.multimedia, file] }));
        stopCapture();
      },
      "image/jpeg",
      0.75,
    );
  };

  const stopCapture = () => {
    cleanupMediaStream();
    setShowCaptureModal(false);
    setCaptureType(null);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const errors = [];
    const valid = [];
    if (formData.multimedia.length + files.length > MAX_FILES) {
      setError(
        `Max ${MAX_FILES} files. You have ${formData.multimedia.length} already.`,
      );
      return;
    }
    files.forEach((f) => {
      const v = isValidMediaFile(f);
      if (v.valid) valid.push(f);
      else errors.push(v.error);
    });
    if (errors.length) {
      setFileErrors(errors);
      setTimeout(() => setFileErrors([]), 5000);
    }
    if (valid.length)
      setFormData((p) => ({ ...p, multimedia: [...p.multimedia, ...valid] }));
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFormData((p) => ({
      ...p,
      multimedia: p.multimedia.filter((_, i) => i !== idx),
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (formData.multimedia.length + files.length > MAX_FILES) {
      setError(`Max ${MAX_FILES} files.`);
      return;
    }
    const valid = files.filter((f) => isValidMediaFile(f).valid);
    if (valid.length)
      setFormData((p) => ({ ...p, multimedia: [...p.multimedia, ...valid] }));
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    try {
      if (!formData.registrationNumber || !formData.problemDescription)
        throw new Error(
          "Registration number and problem description are required",
        );
      if (formData.registrationNumber.length < 3)
        throw new Error("Registration number must be at least 3 characters");
      if (formData.phoneNumber && formData.phoneNumber.length < 10)
        throw new Error("Please enter a valid phone number");
      if (totalSize > MAX_TOTAL_SIZE)
        throw new Error(`Total file size exceeds 10MB`);

      const interval = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 88) {
            clearInterval(interval);
            return 88;
          }
          return p + 8;
        });
      }, 400);

      await submitRepairRequest(formData);
      clearInterval(interval);
      setUploadProgress(100);
      onSuccess && onSuccess(formData.registrationNumber);
    } catch (err) {
      setError(err.message || "Error submitting. Please try again.");
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const hasFiles = formData.multimedia.length > 0;

  return (
    <form onSubmit={handleSubmit}>
      {isExistingCustomer && onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "20px",
            padding: "0",
          }}
        >
          <FaArrowLeft /> Back to Profile
        </button>
      )}

      {isExistingCustomer && (
        <div
          style={{
            background: "#e8f8f5",
            border: "1px solid rgba(0,184,148,0.3)",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "20px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            fontSize: "0.9rem",
            color: "#00695c",
          }}
        >
          <FaCheckCircle style={{ color: "#00b894", flexShrink: 0 }} />
          Customer verified — adding a new repair to your existing record.
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #feb2b2",
            color: "#c0392b",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            fontSize: "0.9rem",
          }}
        >
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {fileErrors.length > 0 && (
        <div
          style={{
            background: "#fff8f0",
            border: "1px solid #f5cba7",
            color: "#a04000",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "0.88rem",
          }}
        >
          {fileErrors.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {loading && (
        <div
          style={{
            background: "linear-gradient(135deg,#1a1a2e,#16213e)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              marginBottom: "12px",
            }}
          >
            ⏳ Please be patient as we check and verify the uploaded files…
          </div>
          <div
            style={{
              height: "6px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${uploadProgress}%`,
                background: "linear-gradient(90deg,#c0392b,#f39c12)",
                borderRadius: "3px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div style={{ marginTop: "8px", fontSize: "0.85rem", opacity: 0.7 }}>
            {uploadProgress}% complete
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ gridColumn: "1/-1" }}>
          <label style={labelStyle}>
            <FaCar /> Registration Number *
          </label>
          <input
            type="text"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                registrationNumber: e.target.value
                  .replace(/\s+/g, "")
                  .toUpperCase(),
              })
            }
            required
            style={{
              ...inputStyle,
              ...(isExistingCustomer
                ? {
                    background: "#f0f2f5",
                    color: "#888",
                    cursor: "not-allowed",
                  }
                : {}),
            }}
            placeholder="e.g., KCA123A"
            maxLength={20}
            readOnly={isExistingCustomer}
          />
        </div>

        <div>
          <label style={labelStyle}>
            <FaUser /> Customer Name
          </label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            style={{
              ...inputStyle,
              ...(isExistingCustomer
                ? {
                    background: "#f0f2f5",
                    color: "#888",
                    cursor: "not-allowed",
                  }
                : {}),
            }}
            placeholder="Full name"
            readOnly={isExistingCustomer}
          />
        </div>

        <div>
          <label style={labelStyle}>
            <FaPhone /> Phone Number
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            style={{
              ...inputStyle,
              ...(isExistingCustomer
                ? {
                    background: "#f0f2f5",
                    color: "#888",
                    cursor: "not-allowed",
                  }
                : {}),
            }}
            placeholder="0700 000 000"
            readOnly={isExistingCustomer}
          />
        </div>

        <div style={{ gridColumn: "1/-1" }}>
          <label style={labelStyle}>Car Model</label>
          <input
            type="text"
            name="carModel"
            value={formData.carModel}
            onChange={handleChange}
            style={inputStyle}
            placeholder="e.g., Toyota Hilux 2019"
          />
        </div>

        <div style={{ gridColumn: "1/-1" }}>
          <label style={labelStyle}>
            <FaWrench /> Problem Description *
          </label>
          <textarea
            name="problemDescription"
            value={formData.problemDescription}
            onChange={handleChange}
            required
            rows={4}
            style={{ ...inputStyle, resize: "vertical", minHeight: "110px" }}
            placeholder="Describe the problem in detail (sounds, symptoms, when it started)..."
          />
        </div>
      </div>

      {/* Media Upload Section */}
      <div
        style={{
          background: "#fafafa",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            <FaCloudUploadAlt /> Photos & Videos
          </label>
          <span
            style={{
              fontSize: "0.8rem",
              color:
                formData.multimedia.length >= MAX_FILES ? "#c0392b" : "#888",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
            }}
          >
            {formData.multimedia.length}/{MAX_FILES} ·{" "}
            {(totalSize / 1024 / 1024).toFixed(1)}MB / 10MB
          </span>
        </div>

        {/* Capture Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <button
            type="button"
            onClick={() => startCapture("photo")}
            disabled={formData.multimedia.length >= MAX_FILES}
            style={{
              padding: "12px",
              background:
                formData.multimedia.length >= MAX_FILES
                  ? "#e0e0e0"
                  : "linear-gradient(135deg,#0984e3,#0652dd)",
              color: formData.multimedia.length >= MAX_FILES ? "#aaa" : "white",
              border: "none",
              borderRadius: "10px",
              cursor:
                formData.multimedia.length >= MAX_FILES
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            <FaCamera size={20} />
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => startCapture("video")}
            disabled={formData.multimedia.length >= MAX_FILES}
            style={{
              padding: "12px",
              background:
                formData.multimedia.length >= MAX_FILES
                  ? "#e0e0e0"
                  : "linear-gradient(135deg,#c0392b,#96281b)",
              color: formData.multimedia.length >= MAX_FILES ? "#aaa" : "white",
              border: "none",
              borderRadius: "10px",
              cursor:
                formData.multimedia.length >= MAX_FILES
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            <FaVideo size={20} />
            Record Video
          </button>
        </div>

        {/* Drag & Drop */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() =>
            formData.multimedia.length < MAX_FILES &&
            fileInputRef.current?.click()
          }
          style={{
            border: `2px dashed ${dragActive ? "#c0392b" : "#ccc"}`,
            borderRadius: "10px",
            padding: "18px",
            textAlign: "center",
            background: dragActive ? "rgba(192,57,43,0.04)" : "white",
            cursor:
              formData.multimedia.length >= MAX_FILES
                ? "not-allowed"
                : "pointer",
            transition: "all 0.2s",
            opacity: formData.multimedia.length >= MAX_FILES ? 0.5 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
            disabled={formData.multimedia.length >= MAX_FILES}
          />
          <FaCloudUploadAlt
            style={{ fontSize: "28px", color: "#c0392b", marginBottom: "8px" }}
          />
          <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "4px" }}>
            {formData.multimedia.length >= MAX_FILES
              ? "Maximum files reached"
              : "Drop files here or click to upload"}
          </p>
          <p style={{ color: "#aaa", fontSize: "0.78rem" }}>
            Images (5MB), Videos (10MB)
          </p>
        </div>

        {/* File Previews */}
        {hasFiles && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            {formData.multimedia.map((file, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  borderRadius: "8px",
                  overflow: "hidden",
                  aspectRatio: "1",
                  background: "#f0f0f0",
                  border: "1px solid #e0e0e0",
                }}
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#e8f4fd",
                      color: "#0984e3",
                    }}
                  >
                    <FaVideo size={24} />
                    <span
                      style={{
                        fontSize: "10px",
                        marginTop: "4px",
                        color: "#666",
                      }}
                    >
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "rgba(192,57,43,0.9)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaTimes size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || totalSize > MAX_TOTAL_SIZE}
        style={{
          width: "100%",
          padding: "16px",
          background:
            loading || totalSize > MAX_TOTAL_SIZE
              ? "#ccc"
              : "linear-gradient(135deg,#c0392b,#96281b)",
          color: "white",
          border: "none",
          borderRadius: "50px",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor:
            loading || totalSize > MAX_TOTAL_SIZE ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          boxShadow: loading ? "none" : "0 4px 20px rgba(192,57,43,0.35)",
          transition: "all 0.25s",
        }}
      >
        <FaPaperPlane />
        {loading ? "Please wait…" : "Submit Repair Request"}
      </button>

      {/* Capture Modal */}
      {showCaptureModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "560px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "#1a1a2e",
                }}
              >
                {captureType === "photo" ? "📷 Take Photo" : "🎬 Record Video"}
              </h3>
              <button
                onClick={stopCapture}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {(captureType === "photo" || captureType === "video") && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={captureType === "photo"}
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  background: "#000",
                  marginBottom: "16px",
                  maxHeight: "300px",
                  objectFit: "cover",
                }}
              />
            )}

            {isRecording && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  color: "#c0392b",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#c0392b",
                    animation: "pulse 1s infinite",
                  }}
                />
                REC {formatTime(recordingTime)}
              </div>
            )}

            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              {captureType === "photo" && (
                <button
                  onClick={takePhoto}
                  style={{
                    background: "linear-gradient(135deg,#0984e3,#0652dd)",
                    color: "white",
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: "50px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <FaCamera /> Capture
                </button>
              )}
              {captureType === "video" &&
                (!isRecording ? (
                  <button
                    onClick={startRecording}
                    style={{
                      background: "linear-gradient(135deg,#c0392b,#96281b)",
                      color: "white",
                      border: "none",
                      padding: "12px 28px",
                      borderRadius: "50px",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <FaVideo /> Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    style={{
                      background: "#27ae60",
                      color: "white",
                      border: "none",
                      padding: "12px 28px",
                      borderRadius: "50px",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <FaStop /> Stop & Save
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

/* ─── Success Screen ─────────────────────────────────────────────────────── */
const SuccessScreen = ({ regNumber, onReset }) => (
  <div
    style={{
      textAlign: "center",
      padding: "20px 0",
      animation: "fadeUp 0.4s ease both",
    }}
  >
    <div
      style={{
        width: "80px",
        height: "80px",
        background: "linear-gradient(135deg,#27ae60,#1e8449)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
        boxShadow: "0 8px 24px rgba(39,174,96,0.35)",
      }}
    >
      <FaCheckCircle style={{ fontSize: "36px", color: "white" }} />
    </div>
    <h2
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "1.8rem",
        fontWeight: 800,
        color: "#1a1a2e",
        marginBottom: "10px",
        letterSpacing: "0.04em",
      }}
    >
      Request Submitted!
    </h2>
    <p
      style={{
        color: "#666",
        marginBottom: "8px",
        fontSize: "1rem",
        lineHeight: 1.5,
      }}
    >
      Your repair request for{" "}
      <strong style={{ color: "#c0392b" }}>{regNumber}</strong> has been
      received.
    </p>
    <p style={{ color: "#888", marginBottom: "28px", fontSize: "0.9rem" }}>
      Our team will contact you shortly. You can track progress using your
      registration number and phone.
    </p>
    <button
      onClick={onReset}
      style={{
        width: "100%",
        maxWidth: "320px",
        padding: "14px",
        background: "linear-gradient(135deg,#c0392b,#96281b)",
        color: "white",
        border: "none",
        borderRadius: "50px",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: "1rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(192,57,43,0.3)",
      }}
    >
      Submit Another Request
    </button>
  </div>
);

/* ─── Root Component ─────────────────────────────────────────────────────── */
const CustomerForm = () => {
  const [mode, setMode] = useState("new"); // "new" | "existing"
  const [phase, setPhase] = useState("select"); // "select" | "lookup" | "form" | "success"
  const [successReg, setSuccessReg] = useState("");
  const [prefill, setPrefill] = useState({});
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);

  const handleModeChange = (m) => {
    setMode(m);
    setPhase(m === "existing" ? "lookup" : "form");
    setPrefill({});
    setIsExistingCustomer(false);
  };

  const handleAddRepair = (customerData) => {
    setPrefill(customerData);
    setIsExistingCustomer(true);
    setPhase("form");
  };

  const handleSuccess = (reg) => {
    setSuccessReg(reg);
    setPhase("success");
  };

  const handleReset = () => {
    setMode("new");
    setPhase("select");
    setPrefill({});
    setIsExistingCustomer(false);
    setSuccessReg("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Header />

      {/* Hero Banner */}
      <div
        style={{
          background:
            "linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)",
          padding: "32px 20px",
          marginBottom: "0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg,#c0392b,#f39c12,#c0392b)",
          }}
        />
        <div className="container" style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              background: "rgba(192,57,43,0.2)",
              borderRadius: "14px",
              marginBottom: "14px",
              border: "1px solid rgba(192,57,43,0.3)",
            }}
          >
            <FaWrench style={{ fontSize: "22px", color: "#c0392b" }} />
          </div>
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "2rem",
              fontWeight: 800,
              color: "white",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Car Repair Request
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem" }}>
            Submit your vehicle issue — our mechanics will get it sorted.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="container" style={{ padding: "0 16px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "28px 24px",
            maxWidth: "680px",
            margin: "-1px auto 40px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            border: "1px solid #e0e0e0",
          }}
        >
          {/* Customer type toggle — show only when not in form phase */}
          {phase !== "form" && phase !== "success" && (
            <ToggleSelector mode={mode} onChange={handleModeChange} />
          )}

          {phase === "select" && <RepairForm onSuccess={handleSuccess} />}

          {phase === "form" && mode === "new" && (
            <RepairForm onSuccess={handleSuccess} />
          )}

          {phase === "lookup" && (
            <ExistingCustomerView
              onAddRepair={handleAddRepair}
              onBack={() => {
                setPhase("select");
                setMode("new");
              }}
            />
          )}

          {phase === "form" && isExistingCustomer && (
            <RepairForm
              prefillData={prefill}
              isExistingCustomer
              onSuccess={handleSuccess}
              onBack={() => {
                setPhase("lookup");
                setMode("existing");
              }}
            />
          )}

          {phase === "success" && (
            <SuccessScreen regNumber={successReg} onReset={handleReset} />
          )}
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        input:focus, textarea:focus, select:focus {
          outline: none !important;
          border-color: #c0392b !important;
          box-shadow: 0 0 0 3px rgba(192,57,43,0.08) !important;
        }
        @media (max-width: 480px) {
          form > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerForm;
