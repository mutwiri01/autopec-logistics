/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import {
  FaTools,
  FaCheckCircle,
  FaCarSide,
  FaWrench,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaSearch,
  FaSync,
  FaImage,
  FaVideo,
  FaDownload,
  FaExpand,
  FaExclamationTriangle,
  FaUser,
  FaPhone,
  FaCar,
  FaCalendarAlt,
  FaClock,
  FaShare,
  FaChevronDown,
  FaChevronUp,
  FaListUl,
  FaLayerGroup,
  FaIdCard,
  FaClipboardList,
  FaFilter,
  FaBell,
  FaTachometerAlt,
  FaAngleRight,
  FaEye,
  FaArrowLeft,
  FaListAlt,
} from "react-icons/fa";
import {
  getAllRepairs,
  updateRepairStatus,
  deleteRepair,
} from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StatusBadge, { STATUS_CONFIG } from "../components/StatusBadge";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (d) =>
  new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtFull = (d) =>
  new Date(d).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_FLOW = ["submitted", "in_garage", "in_progress", "completed"];

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#888",
  marginBottom: "6px",
};

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, color, icon }) => (
  <div
    style={{
      background: "white",
      borderRadius: "12px",
      padding: "18px 16px",
      border: "1px solid #e0e0e0",
      borderTop: `3px solid ${color}`,
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      transition: "box-shadow 0.2s",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ color: "#aaa", fontSize: "22px" }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "2rem",
          fontWeight: 800,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
    <span
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#888",
      }}
    >
      {label}
    </span>
  </div>
);

/* ─── Fullscreen Media Modal ────────────────────────────────────────────── */
const MediaModal = ({ media, onClose }) => {
  if (!media) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.96)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <button
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          color: "white",
          fontSize: "18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      >
        <FaTimes />
      </button>
      {media.type === "image" ? (
        <img
          src={media.url}
          alt=""
          style={{
            maxWidth: "100%",
            maxHeight: "90vh",
            objectFit: "contain",
            borderRadius: "8px",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : media.type === "video" ? (
        <video
          src={media.url}
          controls
          autoPlay
          style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "8px" }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "16px",
            maxWidth: "500px",
            width: "100%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              marginBottom: "16px",
            }}
          >
            Audio
          </h3>
          <audio src={media.url} controls autoPlay style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
};

/* ─── Customer Profile View ─────────────────────────────────────────────── */
const CustomerProfile = ({ repairs, onClose }) => {
  if (!repairs || repairs.length === 0) return null;
  const latest = repairs[0];
  const shareUrl = `${window.location.origin}/?track=${encodeURIComponent(latest.registrationNumber)}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Repair Status — ${latest.registrationNumber}`,
        text: `Track your car repair for ${latest.registrationNumber}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard?.writeText(shareUrl);
      alert("Profile link copied to clipboard!");
    }
  };

  const currentStep = STATUS_FLOW.indexOf(latest.status);
  const stepColors = {
    submitted: "#f39c12",
    in_garage: "#0984e3",
    in_progress: "#00b894",
    completed: "#27ae60",
  };
  const stepIcons = {
    submitted: <FaCarSide />,
    in_garage: <FaTools />,
    in_progress: <FaWrench />,
    completed: <FaCheckCircle />,
  };
  const stepLabels = {
    submitted: "Submitted",
    in_garage: "In Garage",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "0",
          animation: "slideUp 0.35s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Profile Header */}
        <div
          style={{
            background: "linear-gradient(135deg,#1a1a2e,#16213e)",
            padding: "24px 24px 20px",
            borderRadius: "20px 20px 0 0",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg,#c0392b,#f39c12)",
            }}
          />
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaTimes />
          </button>

          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                background: "rgba(192,57,43,0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c0392b",
                fontSize: "22px",
                border: "1px solid rgba(192,57,43,0.3)",
                flexShrink: 0,
              }}
            >
              <FaIdCard />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "white",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                  marginBottom: "6px",
                }}
              >
                {latest.registrationNumber}
              </div>
              <div
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}
              >
                {latest.carModel || "Vehicle"} ·{" "}
                {latest.customerName || "Customer"}
              </div>
              {latest.phoneNumber && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.85rem",
                    marginTop: "4px",
                  }}
                >
                  {latest.phoneNumber}
                </div>
              )}
            </div>
            <StatusBadge status={latest.status} size="lg" />
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Progress Bar */}
          <div
            style={{
              background: "#f5f5f5",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ ...labelStyle, marginBottom: "12px" }}>
              Current Progress
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {STATUS_FLOW.map((step, idx) => {
                const done = idx <= currentStep;
                const active = idx === currentStep;
                return (
                  <React.Fragment key={step}>
                    {idx > 0 && (
                      <div
                        style={{
                          flex: 1,
                          height: "3px",
                          background:
                            idx <= currentStep
                              ? stepColors[STATUS_FLOW[currentStep]]
                              : "#ddd",
                          transition: "background 0.3s",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          background: done
                            ? stepColors[STATUS_FLOW[currentStep]]
                            : "#ddd",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: done ? "white" : "#aaa",
                          fontSize: "13px",
                          border: active
                            ? `3px solid ${stepColors[step]}`
                            : "3px solid transparent",
                          boxSizing: "border-box",
                          boxShadow: active
                            ? `0 0 0 3px ${stepColors[step]}33`
                            : "none",
                          transition: "all 0.3s",
                        }}
                      >
                        {stepIcons[step]}
                      </div>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: active ? 700 : 500,
                          color: active
                            ? stepColors[step]
                            : done
                              ? "#555"
                              : "#bbb",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.04em",
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

          {/* Customer Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {[
              {
                label: "Customer",
                value: latest.customerName || "—",
                icon: <FaUser />,
              },
              {
                label: "Phone",
                value: latest.phoneNumber || "—",
                icon: <FaPhone />,
              },
              {
                label: "Vehicle",
                value: latest.carModel || "—",
                icon: <FaCar />,
              },
              {
                label: "First Visit",
                value: fmt(latest.createdAt),
                icon: <FaCalendarAlt />,
              },
              {
                label: "Total Repairs",
                value: repairs.length,
                icon: <FaClipboardList />,
              },
              {
                label: "Last Update",
                value: fmt(latest.updatedAt || latest.createdAt),
                icon: <FaClock />,
              },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                style={{
                  background: "#fafafa",
                  borderRadius: "10px",
                  padding: "14px",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div style={labelStyle}>
                  {icon} {label}
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "#1a1a2e",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Latest Mechanic Notes */}
          {latest.mechanicNotes && (
            <div
              style={{
                background: "#e8f8f5",
                borderRadius: "10px",
                padding: "16px",
                borderLeft: "4px solid #00b894",
                marginBottom: "20px",
              }}
            >
              <div
                style={{ ...labelStyle, color: "#00897b", marginBottom: "8px" }}
              >
                <FaWrench /> Mechanic Notes
              </div>
              <p
                style={{
                  color: "#424242",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                {latest.mechanicNotes}
              </p>
            </div>
          )}

          {/* Repair History */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ ...labelStyle, marginBottom: "12px" }}>
              <FaListAlt /> Repair History ({repairs.length})
            </div>
            <div style={{ display: "grid", gap: "10px" }}>
              {repairs.map((r, idx) => (
                <div
                  key={r._id}
                  style={{
                    background: "#fafafa",
                    borderRadius: "10px",
                    padding: "14px",
                    border: "1px solid #e0e0e0",
                    borderLeft: `3px solid ${STATUS_CONFIG[r.status]?.color || "#ccc"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>
                      {fmtFull(r.createdAt)}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                  <p
                    style={{
                      color: "#424242",
                      fontSize: "0.9rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.problemDescription}
                  </p>
                  {r.multimedia?.length > 0 && (
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.78rem",
                        marginTop: "6px",
                      }}
                    >
                      📎 {r.multimedia.length} attachment(s)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg,#1a1a2e,#0f3460)",
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
            }}
          >
            <FaShare /> Share Profile with Customer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Repair Card ───────────────────────────────────────────────────────── */
const RepairCard = ({
  repair,
  isExpanded,
  onToggle,
  onStatusUpdate,
  onDelete,
  onViewProfile,
  customerRepairs,
  actionLoading,
  onOpenMedia,
}) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(repair.mechanicNotes || "");
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await updateRepairStatus(repair._id, {
        status: repair.status,
        mechanicNotes: notes.trim(),
      });
      setEditingNotes(false);
    } catch {
      alert("Error saving notes.");
    } finally {
      setSaving(false);
    }
  };

  const statusColor = STATUS_CONFIG[repair.status]?.color || "#888";

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e0e0e0",
        borderLeft: `4px solid ${statusColor}`,
        overflow: "hidden",
        boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,0.1)" : "none",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Card Header */}
      <div
        style={{ padding: "16px", cursor: "pointer", userSelect: "none" }}
        onClick={onToggle}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#1a1a2e",
                  letterSpacing: "0.04em",
                }}
              >
                {repair.registrationNumber}
              </span>
              <StatusBadge status={repair.status} />
              {repair.multimedia?.length > 0 && (
                <span
                  style={{
                    background: "#f0f6ff",
                    color: "#0984e3",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "0.72rem",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    border: "1px solid #c3d9f0",
                  }}
                >
                  📎 {repair.multimedia.length}
                </span>
              )}
            </div>
            <div
              style={{
                color: "#666",
                fontSize: "0.88rem",
                marginBottom: "4px",
              }}
            >
              {repair.carModel || "Unknown model"} ·{" "}
              {repair.customerName || "Anonymous"}
            </div>
            <div style={{ color: "#aaa", fontSize: "0.8rem" }}>
              {fmt(repair.createdAt)}
              {repair.phoneNumber && ` · ${repair.phoneNumber}`}
            </div>
          </div>
          <div style={{ color: "#ccc", flexShrink: 0, marginTop: "4px" }}>
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </div>
        </div>

        {/* Problem preview */}
        {!isExpanded && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px 12px",
              background: "#fafafa",
              borderRadius: "8px",
              color: "#666",
              fontSize: "0.88rem",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {repair.problemDescription}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ borderTop: "1px solid #f0f0f0" }}>
          {/* Full problem description */}
          <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={labelStyle}>
              <FaClipboardList /> Problem Description
            </div>
            <div
              style={{
                background: "#fafafa",
                borderRadius: "8px",
                padding: "12px",
                color: "#424242",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                borderLeft: "3px solid #c0392b",
              }}
            >
              {repair.problemDescription}
            </div>
          </div>

          {/* Media */}
          {repair.multimedia?.length > 0 && (
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={labelStyle}>
                <FaImage /> Attachments
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))",
                  gap: "8px",
                }}
              >
                {repair.multimedia.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "8px",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "#f0f0f0",
                      border: "1px solid #e0e0e0",
                      position: "relative",
                    }}
                    onClick={() => onOpenMedia(m)}
                  >
                    {m.type === "image" ? (
                      <img
                        src={m.url}
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
                          gap: "4px",
                        }}
                      >
                        <FaVideo size={18} />
                        <span style={{ fontSize: "10px", color: "#666" }}>
                          Video
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(0,0,0,0.3)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "rgba(0,0,0,0)")
                      }
                    >
                      <FaExpand
                        style={{
                          color: "white",
                          opacity: 0,
                          transition: "opacity 0.2s",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mechanic Notes */}
          <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div style={labelStyle}>
                <FaEdit /> Mechanic Notes
              </div>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  style={{
                    background: "none",
                    border: "1px solid #e0e0e0",
                    borderRadius: "20px",
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    color: "#666",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <FaEdit size={11} /> {repair.mechanicNotes ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes about the repair…"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: "0.9rem",
                    resize: "vertical",
                    boxSizing: "border-box",
                    marginBottom: "10px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    style={{
                      background: "linear-gradient(135deg,#27ae60,#1e8449)",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      cursor: saving ? "not-allowed" : "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    <FaSave size={11} /> {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotes(repair.mechanicNotes || "");
                    }}
                    disabled={saving}
                    style={{
                      background: "none",
                      border: "1px solid #e0e0e0",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#888",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: repair.mechanicNotes ? "#e8f8f5" : "#fafafa",
                  borderRadius: "8px",
                  padding: "12px",
                  borderLeft: `3px solid ${repair.mechanicNotes ? "#00b894" : "#e0e0e0"}`,
                  color: repair.mechanicNotes ? "#424242" : "#aaa",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  fontStyle: repair.mechanicNotes ? "normal" : "italic",
                  minHeight: "44px",
                }}
              >
                {repair.mechanicNotes || "No notes added yet."}
              </div>
            )}
          </div>

          {/* Status Update */}
          <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ ...labelStyle, marginBottom: "12px" }}>
              Update Status
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: "8px",
              }}
            >
              {STATUS_FLOW.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const active = repair.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => !active && onStatusUpdate(repair._id, s)}
                    disabled={active || actionLoading}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `2px solid ${active ? cfg.color : "#e0e0e0"}`,
                      background: active ? cfg.bg : "white",
                      color: active ? cfg.color : "#666",
                      cursor: active || actionLoading ? "default" : "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                      opacity: actionLoading && !active ? 0.5 : 1,
                    }}
                  >
                    {cfg?.icon || null}
                    {STATUS_CONFIG[s]?.label || s}
                    {active && " ✓"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => onViewProfile(repair.registrationNumber)}
                style={{
                  background: "#f0f6ff",
                  color: "#0984e3",
                  border: "1px solid #c3d9f0",
                  padding: "7px 14px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FaIdCard size={11} /> View Profile
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ color: "#ddd", fontSize: "0.75rem" }}>
                #{repair._id.slice(-6)}
              </span>
              <button
                onClick={() => onDelete(repair._id)}
                disabled={actionLoading}
                style={{
                  background: "#fff5f5",
                  color: "#c0392b",
                  border: "1px solid #fbd6d6",
                  padding: "7px 14px",
                  borderRadius: "20px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  opacity: actionLoading ? 0.5 : 1,
                }}
              >
                <FaTrash size={11} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Dashboard ────────────────────────────────────────────────────── */
const MechanicDashboard = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [profileReg, setProfileReg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRepairs = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await getAllRepairs();
      setRepairs(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to load repairs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRepairs();
    let id;
    if (autoRefresh) id = setInterval(() => loadRepairs(true), 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadRepairs(true);
  };

  // Group repairs by registration number for customer profiles
  const customerGroups = useMemo(() => {
    const groups = {};
    repairs.forEach((r) => {
      const key = r.registrationNumber;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    // Sort each group by createdAt desc
    Object.values(groups).forEach((g) =>
      g.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    );
    return groups;
  }, [repairs]);

  const filteredRepairs = useMemo(() => {
    let results = repairs;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      results = results.filter(
        (r) =>
          r.registrationNumber.toLowerCase().includes(t) ||
          (r.carModel && r.carModel.toLowerCase().includes(t)) ||
          (r.customerName && r.customerName.toLowerCase().includes(t)) ||
          (r.phoneNumber && r.phoneNumber.includes(t)) ||
          (r.problemDescription &&
            r.problemDescription.toLowerCase().includes(t)),
      );
    }
    if (activeTab !== "all" && activeTab !== "customers") {
      results = results.filter((r) => r.status === activeTab);
    }
    return results;
  }, [repairs, searchTerm, activeTab]);

  const counts = useMemo(
    () => ({
      all: repairs.length,
      submitted: repairs.filter((r) => r.status === "submitted").length,
      in_garage: repairs.filter((r) => r.status === "in_garage").length,
      in_progress: repairs.filter((r) => r.status === "in_progress").length,
      completed: repairs.filter((r) => r.status === "completed").length,
      customers: Object.keys(customerGroups).length,
    }),
    [repairs, customerGroups],
  );

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(true);
    try {
      const r = repairs.find((x) => x._id === id);
      await updateRepairStatus(id, {
        status,
        mechanicNotes: r?.mechanicNotes || "",
      });
      setRepairs((prev) =>
        prev.map((x) => (x._id === id ? { ...x, status } : x)),
      );
    } catch {
      alert("Error updating status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this repair request? This cannot be undone."))
      return;
    setActionLoading(true);
    try {
      await deleteRepair(id);
      setRepairs((prev) => prev.filter((x) => x._id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      alert("Error deleting repair.");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { key: "all", label: "All", count: counts.all, color: "#1a1a2e" },
    {
      key: "submitted",
      label: "Submitted",
      count: counts.submitted,
      color: "#f39c12",
    },
    {
      key: "in_garage",
      label: "In Garage",
      count: counts.in_garage,
      color: "#0984e3",
    },
    {
      key: "in_progress",
      label: "In Progress",
      count: counts.in_progress,
      color: "#00b894",
    },
    {
      key: "completed",
      label: "Completed",
      count: counts.completed,
      color: "#27ae60",
    },
    {
      key: "customers",
      label: "Customers",
      count: counts.customers,
      color: "#8e44ad",
    },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
        <Header />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e0e0e0",
              borderTop: "4px solid #c0392b",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1rem",
              color: "#888",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Loading Dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Header />

      {/* Dashboard Top Bar */}
      <div
        style={{
          background: "linear-gradient(135deg,#1a1a2e,#16213e)",
          borderBottom: "2px solid rgba(192,57,43,0.4)",
          padding: "20px 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "white",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FaTachometerAlt style={{ color: "#c0392b" }} /> Mechanic
                Dashboard
              </h2>
              <p
                style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}
              >
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={handleManualRefresh}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaSync
                  style={{
                    animation: refreshing
                      ? "spin 0.8s linear infinite"
                      : "none",
                  }}
                />
                Refresh
              </button>
              <button
                onClick={() => setAutoRefresh((a) => !a)}
                style={{
                  background: autoRefresh
                    ? "rgba(0,184,148,0.2)"
                    : "rgba(255,255,255,0.08)",
                  border: `1px solid ${autoRefresh ? "rgba(0,184,148,0.4)" : "rgba(255,255,255,0.15)"}`,
                  color: autoRefresh ? "#00b894" : "rgba(255,255,255,0.5)",
                  padding: "8px 14px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: autoRefresh ? "#00b894" : "#666",
                    animation: autoRefresh ? "pulse 2s infinite" : "none",
                  }}
                />
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "24px 20px" }}>
        {/* Error */}
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
            }}
          >
            <FaExclamationTriangle style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={handleManualRefresh}
              style={{
                background: "#c0392b",
                color: "white",
                border: "none",
                padding: "4px 12px",
                borderRadius: "16px",
                cursor: "pointer",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.04em",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            label="Total"
            value={counts.all}
            color="#1a1a2e"
            icon={<FaListUl />}
          />
          <StatCard
            label="Submitted"
            value={counts.submitted}
            color="#f39c12"
            icon={<FaCarSide />}
          />
          <StatCard
            label="In Garage"
            value={counts.in_garage}
            color="#0984e3"
            icon={<FaTools />}
          />
          <StatCard
            label="In Progress"
            value={counts.in_progress}
            color="#00b894"
            icon={<FaWrench />}
          />
          <StatCard
            label="Completed"
            value={counts.completed}
            color="#27ae60"
            icon={<FaCheckCircle />}
          />
          <StatCard
            label="Customers"
            value={counts.customers}
            color="#8e44ad"
            icon={<FaUser />}
          />
        </div>

        {/* Search + Tabs */}
        <div style={{ marginBottom: "20px" }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <FaSearch
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#aaa",
                zIndex: 1,
              }}
            />
            <input
              type="text"
              placeholder="Search by plate, name, phone, or description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 16px 13px 44px",
                border: "2px solid #e0e0e0",
                borderRadius: "50px",
                fontFamily: "'Barlow', sans-serif",
                fontSize: "15px",
                background: "white",
                boxSizing: "border-box",
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#f0f0f0",
                  border: "none",
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>

          {/* Tab Bar */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
              scrollbarWidth: "none",
            }}
          >
            {tabs.map(({ key: tabKey, label, count, color }) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                style={{
                  flexShrink: 0,
                  padding: "8px 16px",
                  borderRadius: "20px",
                  background: activeTab === tabKey ? color : "white",
                  color: activeTab === tabKey ? "white" : "#666",
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                  boxShadow:
                    activeTab === tabKey
                      ? `0 4px 12px ${color}33`
                      : "0 1px 4px rgba(0,0,0,0.06)",
                  border: activeTab === tabKey ? "none" : "1px solid #e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {label}
                <span
                  style={{
                    background:
                      activeTab === tabKey
                        ? "rgba(255,255,255,0.25)"
                        : "#f0f0f0",
                    color: activeTab === tabKey ? "white" : "#888",
                    borderRadius: "10px",
                    padding: "0 6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    lineHeight: "18px",
                  }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── CUSTOMER TAB ─── */}
        {activeTab === "customers" && (
          <div style={{ display: "grid", gap: "12px" }}>
            {Object.entries(customerGroups).length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#aaa",
                }}
              >
                No customers yet.
              </div>
            ) : (
              Object.entries(customerGroups).map(([reg, reps]) => {
                const latest = reps[0];
                return (
                  <div
                    key={reg}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      border: "1px solid #e0e0e0",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "box-shadow 0.2s",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                    onClick={() => setProfileReg(reg)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow =
                        "0 4px 16px rgba(0,0,0,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.boxShadow = "none")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          background: "linear-gradient(135deg,#1a1a2e,#16213e)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#c0392b",
                          fontSize: "18px",
                          flexShrink: 0,
                        }}
                      >
                        <FaIdCard />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: "#1a1a2e",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {reg}
                        </div>
                        <div
                          style={{
                            color: "#666",
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {latest.customerName || "Anonymous"} ·{" "}
                          {latest.carModel || "Unknown model"}
                        </div>
                        <div
                          style={{
                            color: "#aaa",
                            fontSize: "0.78rem",
                            marginTop: "2px",
                          }}
                        >
                          {reps.length} repair{reps.length > 1 ? "s" : ""} ·
                          Last: {fmt(latest.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <StatusBadge status={latest.status} size="sm" />
                      <FaAngleRight style={{ color: "#ccc" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── REPAIRS LIST ─── */}
        {activeTab !== "customers" && (
          <div style={{ display: "grid", gap: "12px" }}>
            {filteredRepairs.length === 0 ? (
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #e0e0e0",
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "#aaa",
                }}
              >
                <FaClipboardList
                  style={{
                    fontSize: "40px",
                    marginBottom: "12px",
                    opacity: 0.3,
                  }}
                />
                <p
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    marginBottom: "6px",
                    color: "#888",
                  }}
                >
                  {searchTerm
                    ? "No matching repairs"
                    : "No repairs in this category"}
                </p>
                <p style={{ fontSize: "0.88rem" }}>
                  {searchTerm
                    ? "Try a different search term."
                    : "Repairs will appear here when submitted."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{
                      marginTop: "16px",
                      background: "#1a1a2e",
                      color: "white",
                      border: "none",
                      padding: "10px 24px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredRepairs.map((repair) => (
                <RepairCard
                  key={repair._id}
                  repair={repair}
                  isExpanded={expandedId === repair._id}
                  onToggle={() =>
                    setExpandedId((p) => (p === repair._id ? null : repair._id))
                  }
                  onStatusUpdate={handleStatusUpdate}
                  onDelete={handleDelete}
                  onViewProfile={(reg) => setProfileReg(reg)}
                  customerRepairs={
                    customerGroups[repair.registrationNumber] || [repair]
                  }
                  actionLoading={actionLoading}
                  onOpenMedia={setFullscreenMedia}
                />
              ))
            )}
          </div>
        )}
      </div>

      <Footer />

      {/* Modals */}
      <MediaModal
        media={fullscreenMedia}
        onClose={() => setFullscreenMedia(null)}
      />

      {profileReg && (
        <CustomerProfile
          repairs={customerGroups[profileReg] || []}
          onClose={() => setProfileReg(null)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        input:focus, textarea:focus, select:focus {
          outline: none !important;
          border-color: #c0392b !important;
          box-shadow: 0 0 0 3px rgba(192,57,43,0.08) !important;
        }
        ::-webkit-scrollbar { height: 5px; width: 5px; }
        ::-webkit-scrollbar-track { background: #f0f2f5; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
      `}</style>
    </div>
  );
};

export default MechanicDashboard;
