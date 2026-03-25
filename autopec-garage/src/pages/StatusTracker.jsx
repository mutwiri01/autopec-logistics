/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  FaCarSide,
  FaTools,
  FaWrench,
  FaCheckCircle,
  FaSearch,
  FaSyncAlt,
  FaExclamationTriangle,
  FaPhone,
  FaCar,
  FaUser,
  FaClock,
  FaClipboardList,
} from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { trackRepair } from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StatusBadge, { STATUS_CONFIG } from "../components/StatusBadge";

const STATUS_FLOW = ["submitted", "in_garage", "in_progress", "completed"];
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

const fmt = (d) =>
  new Date(d).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const StatusTracker = () => {
  const [searchParams] = useSearchParams();
  const [regNumber, setRegNumber] = useState("");
  const [repairData, setRepairData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Auto-search if ?track= param is present in URL
  useEffect(() => {
    const track = searchParams.get("track");
    if (track) {
      setRegNumber(track.toUpperCase());
      handleSearch(track);
    }
  }, []);

  const handleSearch = async (regOverride) => {
    const raw = (regOverride || regNumber).trim().toUpperCase();
    const reg = raw.replace(/\s+/g, ""); // strip spaces: "KCA 123T" → "KCA123T"
    if (!reg) {
      setError("Please enter a registration number.");
      return;
    }
    setLoading(true);
    setError("");
    setRepairData(null);
    setSearched(true);
    try {
      const data = await trackRepair(reg);
      setRepairData(data);
    } catch (err) {
      setError(err.message || "No repair found for this registration number.");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = repairData ? STATUS_FLOW.indexOf(repairData.status) : -1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Header />

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg,#1a1a2e,#16213e)",
          padding: "36px 20px",
          borderBottom: "3px solid linear-gradient(90deg,#c0392b,#f39c12)",
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
        <div className="container" style={{ textAlign: "center" }}>
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
            Track Your Repair
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>
            Enter your vehicle registration number to see the latest status.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: "32px 16px" }}>
        {/* Search Box */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "560px",
            margin: "0 auto 28px",
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <FaCar
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#aaa",
                }}
              />
              <input
                type="text"
                value={regNumber}
                onChange={(e) =>
                  setRegNumber(e.target.value.replace(/\s+/g, "").toUpperCase())
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. KCA 123A"
                style={{
                  width: "100%",
                  padding: "13px 16px 13px 42px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "50px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                }}
                maxLength={20}
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{
                padding: "13px 20px",
                background: loading
                  ? "#ccc"
                  : "linear-gradient(135deg,#c0392b,#96281b)",
                color: "white",
                border: "none",
                borderRadius: "50px",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexShrink: 0,
                boxShadow: loading ? "none" : "0 4px 16px rgba(192,57,43,0.3)",
              }}
            >
              {loading ? (
                <FaSyncAlt style={{ animation: "spin 0.8s linear infinite" }} />
              ) : (
                <FaSearch />
              )}
              Track
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: "14px",
                background: "#fff5f5",
                border: "1px solid #feb2b2",
                color: "#c0392b",
                padding: "10px 14px",
                borderRadius: "8px",
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
        </div>

        {/* Results */}
        {repairData && (
          <div
            style={{
              maxWidth: "680px",
              margin: "0 auto",
              animation: "fadeUp 0.4s ease both",
            }}
          >
            {/* Plate Card */}
            <div
              style={{
                background: "linear-gradient(135deg,#1a1a2e,#16213e)",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "16px",
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
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "white",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {repairData.registrationNumber}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.9rem",
                      marginTop: "4px",
                    }}
                  >
                    {repairData.carModel || "Vehicle"} ·{" "}
                    {repairData.customerName || "Customer"}
                  </div>
                </div>
                <StatusBadge status={repairData.status} size="lg" />
              </div>
            </div>

            {/* Progress Stepper */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
                border: "1px solid #e0e0e0",
              }}
            >
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: "14px",
                }}
              >
                Repair Progress
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
                                : "#e0e0e0",
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
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: done
                              ? stepColors[STATUS_FLOW[currentStep]]
                              : "#f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: done ? "white" : "#ccc",
                            fontSize: "14px",
                            border: active
                              ? `3px solid ${stepColors[step]}`
                              : "3px solid transparent",
                            boxSizing: "border-box",
                            boxShadow: active
                              ? `0 0 0 4px ${stepColors[step]}22`
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
                                : "#ccc",
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

            {/* Details */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
                border: "1px solid #e0e0e0",
              }}
            >
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: "12px",
                }}
              >
                Reported Issue
              </div>
              <div
                style={{
                  background: "#fafafa",
                  borderRadius: "8px",
                  padding: "14px",
                  borderLeft: "3px solid #c0392b",
                  color: "#424242",
                  lineHeight: 1.6,
                  marginBottom: "14px",
                }}
              >
                {repairData.problemDescription}
              </div>

              {repairData.mechanicNotes && (
                <div>
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#00897b",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FaWrench /> Mechanic Notes
                  </div>
                  <div
                    style={{
                      background: "#e8f8f5",
                      borderRadius: "8px",
                      padding: "14px",
                      borderLeft: "3px solid #00b894",
                      color: "#424242",
                      lineHeight: 1.6,
                    }}
                  >
                    {repairData.mechanicNotes}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: "14px",
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  color: "#aaa",
                  fontSize: "0.82rem",
                }}
              >
                <span>
                  <FaClock style={{ marginRight: "4px" }} />
                  Submitted: {fmt(repairData.createdAt)}
                </span>
                <span>
                  Updated: {fmt(repairData.updatedAt || repairData.createdAt)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        input:focus { outline:none !important; border-color:#c0392b !important; box-shadow:0 0 0 3px rgba(192,57,43,0.08) !important; }
      `}</style>
    </div>
  );
};

export default StatusTracker;
