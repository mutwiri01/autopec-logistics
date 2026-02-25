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
  FaChevronDown,
  FaChevronUp,
  FaSearch,
  FaSync,
  FaFilter,
  FaBars,
  FaTimes as FaTimesIcon,
  FaImage,
  FaVideo,
  FaMicrophone,
  FaDownload,
  FaPlay,
  FaPause,
  FaExpand,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  getAllRepairs,
  updateRepairStatus,
  deleteRepair,
} from "../services/api";
import Header from "../components/Header";

const MechanicDashboard = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRepairId, setExpandedRepairId] = useState(null);
  const [editingRepairId, setEditingRepairId] = useState(null);
  const [mechanicNotes, setMechanicNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    const loadAndRefreshRepairs = async () => {
      if (!isMounted) return;

      try {
        setError(null);
        const data = await getAllRepairs();
        if (isMounted) {
          setRepairs(data || []);
          setLastUpdated(new Date());
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching repairs:", error);
        if (isMounted) {
          setError(error.message || "Failed to fetch repairs");
          setLoading(false);
        }
      }
    };

    loadAndRefreshRepairs();

    if (autoRefresh) {
      intervalId = setInterval(() => {
        loadAndRefreshRepairs();
        setRefreshCount((prev) => prev + 1);
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  const filteredRepairs = useMemo(() => {
    let results = repairs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (repair) =>
          repair.registrationNumber.toLowerCase().includes(term) ||
          (repair.carModel && repair.carModel.toLowerCase().includes(term)) ||
          (repair.customerName &&
            repair.customerName.toLowerCase().includes(term)) ||
          (repair.phoneNumber && repair.phoneNumber.includes(term)) ||
          (repair.problemDescription &&
            repair.problemDescription.toLowerCase().includes(term)) ||
          (repair.mechanicNotes &&
            repair.mechanicNotes.toLowerCase().includes(term)),
      );
    }

    if (statusFilter !== "all") {
      results = results.filter((repair) => repair.status === statusFilter);
    }

    return results;
  }, [repairs, searchTerm, statusFilter]);

  const toggleExpand = (repairId) => {
    if (expandedRepairId === repairId) {
      setExpandedRepairId(null);
      setSelectedMedia(null);
      setPlayingAudio(null);
    } else {
      setExpandedRepairId(repairId);
    }
    setEditingRepairId(null);
    setMechanicNotes("");
  };

  const startEditNotes = (repair) => {
    setEditingRepairId(repair._id);
    setMechanicNotes(repair.mechanicNotes || "");
    if (expandedRepairId !== repair._id) {
      setExpandedRepairId(repair._id);
    }
  };

  const cancelEdit = () => {
    setEditingRepairId(null);
    setMechanicNotes("");
  };

  const saveNotes = async (repairId) => {
    setActionLoading(true);
    try {
      const repair = repairs.find((r) => r._id === repairId);
      await updateRepairStatus(repairId, {
        status: repair.status,
        mechanicNotes: mechanicNotes.trim(),
      });

      const updatedRepairs = repairs.map((repair) =>
        repair._id === repairId
          ? { ...repair, mechanicNotes: mechanicNotes.trim() }
          : repair,
      );

      setRepairs(updatedRepairs);
      setEditingRepairId(null);
      setMechanicNotes("");
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Error saving notes. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (repairId, newStatus) => {
    setActionLoading(true);
    try {
      const repair = repairs.find((r) => r._id === repairId);
      const notesToSave = repair.mechanicNotes || "";

      await updateRepairStatus(repairId, {
        status: newStatus,
        mechanicNotes: notesToSave,
      });

      const updatedRepairs = repairs.map((repair) =>
        repair._id === repairId ? { ...repair, status: newStatus } : repair,
      );

      setRepairs(updatedRepairs);
    } catch (error) {
      console.error("Error updating repair status:", error);
      alert("Error updating status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRepair = async (repairId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this repair request? This action cannot be undone.",
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await deleteRepair(repairId);
      const updatedRepairs = repairs.filter(
        (repair) => repair._id !== repairId,
      );
      setRepairs(updatedRepairs);
    } catch (error) {
      console.error("Error deleting repair:", error);
      alert("Error deleting repair request. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRepairs();
      setRepairs(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching repairs:", error);
      setError(error.message || "Failed to fetch repairs");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setShowFilters(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "submitted":
        return <FaCarSide />;
      case "in_garage":
        return <FaTools />;
      case "in_progress":
        return <FaWrench />;
      case "completed":
        return <FaCheckCircle />;
      default:
        return <FaCarSide />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return "#ef6c00";
      case "in_garage":
        return "#1976d2";
      case "in_progress":
        return "#009688";
      case "completed":
        return "#4caf50";
      default:
        return "#666";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "in_garage":
        return "In Garage";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case "image":
        return <FaImage />;
      case "video":
        return <FaVideo />;
      case "audio":
        return <FaMicrophone />;
      default:
        return <FaDownload />;
    }
  };

  const handlePlayAudio = (url) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(url);
    }
  };

  const openFullscreen = (media) => {
    setFullscreenMedia(media);
  };

  const statusOptions = [
    { value: "submitted", label: "Submitted", icon: <FaCarSide /> },
    { value: "in_garage", label: "In Garage", icon: <FaTools /> },
    { value: "in_progress", label: "In Progress", icon: <FaWrench /> },
    { value: "completed", label: "Completed", icon: <FaCheckCircle /> },
  ];

  const filterOptions = [
    { value: "all", label: "All Statuses" },
    { value: "submitted", label: "Submitted" },
    { value: "in_garage", label: "In Garage" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  if (loading) {
    return (
      <div className="container">
        <Header />
        <div
          className="glass-effect"
          style={{
            padding: "50px 20px",
            textAlign: "center",
            marginTop: "30px",
            margin: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "4px solid #e0f2f1",
                borderTop: "4px solid #009688",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p style={{ color: "#00695c", fontSize: "16px" }}>
              Loading repairs...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />

      {/* Dashboard Header */}
      <div
        style={{
          backgroundColor: "#d32f2f",
          color: "white",
          padding: "20px 15px",
          borderRadius: "15px",
          marginBottom: "20px",
          textAlign: "center",
          position: "relative",
          margin: "15px",
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            fontSize: "1.5rem",
            marginBottom: "10px",
          }}
        >
          <FaTools /> Mechanic Dashboard
        </h2>
        <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>
          Manage and update repair statuses in real-time
        </p>

        {/* Stats Row */}
        <div
          style={{
            marginTop: "15px",
            fontSize: "0.85rem",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "15px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>
            Total: <strong>{repairs.length}</strong>
          </div>
          <div>
            Showing: <strong>{filteredRepairs.length}</strong>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: autoRefresh ? "#4caf50" : "#ff9800",
                animation: autoRefresh ? "pulse 2s infinite" : "none",
              }}
            ></div>
            <span>Auto: {autoRefresh ? "ON" : "OFF"}</span>
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
            Updated:{" "}
            {lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#d32f2f",
            padding: "15px",
            borderRadius: "10px",
            margin: "0 15px 20px 15px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid #ffcdd2",
          }}
        >
          <FaExclamationTriangle />
          <span>{error}</span>
          <button
            onClick={handleManualRefresh}
            style={{
              marginLeft: "auto",
              background: "#d32f2f",
              color: "white",
              border: "none",
              padding: "5px 15px",
              borderRadius: "20px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Mobile Filter Toggle Button */}
      <div
        style={{
          margin: "0 15px 15px 15px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: "#009688",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "50px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem",
          }}
        >
          {showFilters ? <FaTimesIcon /> : <FaBars />}
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div
        className="glass-effect"
        style={{
          padding: showFilters ? "20px 15px" : "0",
          marginBottom: "20px",
          display: showFilters ? "block" : "none",
          margin: "0 15px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <FaSearch
              style={{
                position: "absolute",
                left: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#666",
                zIndex: 1,
              }}
            />
            <input
              type="text"
              placeholder="Search repairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 14px 14px 45px",
                border: "2px solid #b2dfdb",
                borderRadius: "50px",
                fontSize: "16px",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaFilter style={{ color: "#009688", flexShrink: 0 }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 15px",
                border: "2px solid #b2dfdb",
                borderRadius: "50px",
                fontSize: "16px",
                fontFamily: "inherit",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {(searchTerm || statusFilter !== "all") && (
              <button
                onClick={clearFilters}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "2px solid #ff9800",
                  color: "#ff9800",
                  padding: "12px",
                  borderRadius: "50px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "0.9rem",
                  minWidth: "140px",
                }}
              >
                Clear Filters
              </button>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={loading}
              style={{
                flex: 1,
                background: "#009688",
                color: "white",
                border: "none",
                padding: "12px",
                borderRadius: "50px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: "140px",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <FaSync
                style={{
                  animation: loading ? "spin 1s linear infinite" : "none",
                }}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                flex: 1,
                background: autoRefresh ? "#4caf50" : "#ff9800",
                color: "white",
                border: "none",
                padding: "12px",
                borderRadius: "50px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: "140px",
              }}
            >
              Auto: {autoRefresh ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Repairs List */}
      <div style={{ padding: "0 15px", display: "grid", gap: "15px" }}>
        {filteredRepairs.length === 0 ? (
          <div
            className="glass-effect"
            style={{
              padding: "30px 20px",
              textAlign: "center",
              color: "#666",
            }}
          >
            <p style={{ fontSize: "16px", marginBottom: "10px" }}>
              {searchTerm || statusFilter !== "all"
                ? "No matching repairs found"
                : "No repair requests found"}
            </p>
            <p style={{ fontSize: "0.9rem" }}>
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "When customers submit repair requests, they will appear here."}
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <button
                onClick={clearFilters}
                style={{
                  marginTop: "20px",
                  background: "#009688",
                  color: "white",
                  border: "none",
                  padding: "12px 25px",
                  borderRadius: "50px",
                  fontWeight: "600",
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: "200px",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredRepairs.map((repair) => (
            <div
              key={repair._id}
              className="glass-effect"
              style={{
                padding: "15px",
                animation: "fadeIn 0.5s ease",
              }}
            >
              {/* Repair Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  cursor: "pointer",
                  gap: "10px",
                }}
                onClick={() => toggleExpand(repair._id)}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        color: "#00695c",
                        margin: 0,
                        fontSize: "1.1rem",
                      }}
                    >
                      {repair.registrationNumber}
                    </h3>
                    <span
                      style={{
                        backgroundColor: getStatusColor(repair.status) + "20",
                        color: getStatusColor(repair.status),
                        padding: "4px 12px",
                        borderRadius: "20px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        flexShrink: 0,
                      }}
                    >
                      {getStatusIcon(repair.status)}
                      {getStatusLabel(repair.status)}
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: "0.85rem" }}>
                    {repair.carModel || "No model"} •{" "}
                    {repair.customerName || "Anonymous"}
                  </div>
                  <div style={{ color: "#666", fontSize: "0.8rem" }}>
                    {new Date(repair.createdAt).toLocaleDateString()}
                    {repair.multimedia && repair.multimedia.length > 0 && (
                      <span style={{ marginLeft: "10px", color: "#009688" }}>
                        📎 {repair.multimedia.length} attachment(s)
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {expandedRepairId === repair._id ? (
                    <FaChevronUp style={{ color: "#009688" }} />
                  ) : (
                    <FaChevronDown style={{ color: "#009688" }} />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedRepairId === repair._id && (
                <div
                  style={{
                    marginTop: "15px",
                    paddingTop: "15px",
                    borderTop: "1px solid #e0e0e0",
                  }}
                >
                  {/* Basic Info */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          color: "#00695c",
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "0.95rem",
                        }}
                      >
                        Vehicle Details
                      </strong>
                      <p
                        style={{
                          color: "#424242",
                          margin: "5px 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        <strong>Model:</strong>{" "}
                        {repair.carModel || "Not specified"}
                      </p>
                      <p
                        style={{
                          color: "#424242",
                          margin: "5px 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        <strong>Customer:</strong>{" "}
                        {repair.customerName || "Anonymous"}
                      </p>
                      <p
                        style={{
                          color: "#424242",
                          margin: "5px 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        <strong>Phone:</strong>{" "}
                        {repair.phoneNumber || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <strong
                        style={{
                          color: "#00695c",
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "0.95rem",
                        }}
                      >
                        Timeline
                      </strong>
                      <p
                        style={{
                          color: "#424242",
                          margin: "5px 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        <strong>Submitted:</strong>{" "}
                        {new Date(repair.createdAt).toLocaleString()}
                      </p>
                      <p
                        style={{
                          color: "#424242",
                          margin: "5px 0",
                          fontSize: "0.9rem",
                        }}
                      >
                        <strong>Last Updated:</strong>{" "}
                        {new Date(
                          repair.updatedAt || repair.createdAt,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div style={{ marginBottom: "15px" }}>
                    <strong
                      style={{
                        color: "#00695c",
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "0.95rem",
                      }}
                    >
                      Problem Description:
                    </strong>
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "8px",
                        color: "#424242",
                        lineHeight: "1.5",
                        fontSize: "0.9rem",
                      }}
                    >
                      {repair.problemDescription}
                    </div>
                  </div>

                  {/* Multimedia Section */}
                  {repair.multimedia && repair.multimedia.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                      <strong
                        style={{
                          color: "#00695c",
                          display: "block",
                          marginBottom: "10px",
                          fontSize: "0.95rem",
                        }}
                      >
                        Customer Attachments:
                      </strong>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(120px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {repair.multimedia.map((media, index) => (
                          <div
                            key={index}
                            style={{
                              position: "relative",
                              borderRadius: "8px",
                              overflow: "hidden",
                              backgroundColor: "#f0f0f0",
                              aspectRatio: "1",
                              cursor: "pointer",
                            }}
                          >
                            {media.type === "image" ? (
                              <img
                                src={media.url}
                                alt="Customer attachment"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onClick={() => openFullscreen(media)}
                              />
                            ) : media.type === "video" ? (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#e0f2f1",
                                  color: "#009688",
                                  fontSize: "32px",
                                }}
                                onClick={() => window.open(media.url, "_blank")}
                              >
                                <FaVideo />
                                <span
                                  style={{
                                    fontSize: "12px",
                                    marginTop: "5px",
                                    color: "#666",
                                  }}
                                >
                                  Video
                                </span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#e0f2f1",
                                  color: "#009688",
                                  fontSize: "32px",
                                }}
                              >
                                <FaMicrophone />
                                <span
                                  style={{
                                    fontSize: "12px",
                                    marginTop: "5px",
                                    color: "#666",
                                  }}
                                >
                                  Audio
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() => openFullscreen(media)}
                              style={{
                                position: "absolute",
                                top: "5px",
                                right: "5px",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(255,255,255,0.9)",
                                border: "none",
                                color: "#009688",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >
                              <FaExpand size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Audio Player */}
                      {playingAudio && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            backgroundColor: "#e0f2f1",
                            borderRadius: "8px",
                          }}
                        >
                          <audio
                            controls
                            autoPlay
                            src={playingAudio}
                            style={{ width: "100%" }}
                            onEnded={() => setPlayingAudio(null)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mechanic Notes Section */}
                  <div style={{ marginBottom: "15px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <strong style={{ color: "#00695c", fontSize: "0.95rem" }}>
                        Mechanic Notes:
                      </strong>
                      {editingRepairId !== repair._id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditNotes(repair);
                          }}
                          disabled={actionLoading}
                          style={{
                            background: "#ff9800",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "50px",
                            fontWeight: "600",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.85rem",
                            opacity: actionLoading ? 0.5 : 1,
                          }}
                        >
                          <FaEdit /> {repair.mechanicNotes ? "Edit" : "Add"}
                        </button>
                      )}
                    </div>

                    {editingRepairId === repair._id ? (
                      <div>
                        <textarea
                          value={mechanicNotes}
                          onChange={(e) => setMechanicNotes(e.target.value)}
                          placeholder="Enter mechanic notes..."
                          style={{
                            width: "100%",
                            padding: "12px",
                            marginBottom: "12px",
                            border: "2px solid #b2dfdb",
                            borderRadius: "8px",
                            fontFamily: "inherit",
                            fontSize: "0.9rem",
                            minHeight: "80px",
                            boxSizing: "border-box",
                          }}
                          rows="3"
                        />
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            style={{
                              background: "#009688",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "50px",
                              fontWeight: "600",
                              cursor: actionLoading ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "0.85rem",
                              opacity: actionLoading ? 0.5 : 1,
                            }}
                            onClick={() => saveNotes(repair._id)}
                            disabled={actionLoading}
                          >
                            <FaSave /> {actionLoading ? "Saving..." : "Save"}
                          </button>
                          <button
                            style={{
                              background: "transparent",
                              border: "2px solid #d32f2f",
                              color: "#d32f2f",
                              padding: "8px 16px",
                              borderRadius: "50px",
                              fontWeight: "600",
                              cursor: actionLoading ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "0.85rem",
                              opacity: actionLoading ? 0.5 : 1,
                            }}
                            onClick={cancelEdit}
                            disabled={actionLoading}
                          >
                            <FaTimes /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: "#e0f2f1",
                          borderRadius: "8px",
                          color: "#424242",
                          lineHeight: "1.5",
                          minHeight: "40px",
                          borderLeft: "4px solid #009688",
                          fontSize: "0.9rem",
                        }}
                      >
                        {repair.mechanicNotes ||
                          "No notes added yet. Click 'Add' to add notes."}
                      </div>
                    )}
                  </div>

                  {/* Status Update Section */}
                  <div style={{ marginBottom: "15px" }}>
                    <strong
                      style={{
                        color: "#00695c",
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "0.95rem",
                      }}
                    >
                      Update Status:
                    </strong>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          style={{
                            background:
                              repair.status === option.value
                                ? "#00796b"
                                : "#009688",
                            color: "white",
                            border: "none",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor:
                              repair.status === option.value || actionLoading
                                ? "default"
                                : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            opacity:
                              repair.status === option.value
                                ? 0.8
                                : actionLoading
                                  ? 0.5
                                  : 1,
                            fontSize: "0.85rem",
                          }}
                          onClick={() =>
                            handleStatusUpdate(repair._id, option.value)
                          }
                          disabled={
                            repair.status === option.value || actionLoading
                          }
                        >
                          {option.icon}
                          <span style={{ fontSize: "0.8rem" }}>
                            {option.label}
                          </span>
                          {repair.status === option.value && " ✓"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "15px",
                      paddingTop: "15px",
                      borderTop: "1px solid #e0e0e0",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      ID: {repair._id.substring(repair._id.length - 6)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRepair(repair._id);
                      }}
                      disabled={actionLoading}
                      style={{
                        background: "#ffebee",
                        color: "#d32f2f",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "50px",
                        fontWeight: "600",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.85rem",
                        opacity: actionLoading ? 0.5 : 1,
                      }}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "20px",
          }}
          onClick={() => setFullscreenMedia(null)}
        >
          <button
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "white",
              border: "none",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              fontSize: "20px",
              cursor: "pointer",
              zIndex: 2001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setFullscreenMedia(null)}
          >
            ×
          </button>

          {fullscreenMedia.type === "image" ? (
            <img
              src={fullscreenMedia.url}
              alt="Fullscreen view"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
              }}
            />
          ) : fullscreenMedia.type === "video" ? (
            <video
              src={fullscreenMedia.url}
              controls
              autoPlay
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
              }}
            />
          ) : (
            <div
              style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "15px",
                maxWidth: "500px",
                width: "100%",
              }}
            >
              <h3 style={{ color: "#00695c", marginBottom: "20px" }}>
                Audio Playback
              </h3>
              <audio
                src={fullscreenMedia.url}
                controls
                autoPlay
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* Mobile First Styles */
          .container {
            padding: 0;
            margin: 0;
            max-width: 100%;
            overflow-x: hidden;
          }

          .glass-effect {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          input, textarea, select {
            font-size: 16px !important;
          }

          input:focus, textarea:focus, select:focus {
            border-color: #009688 !important;
            outline: none;
            box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.1) !important;
          }

          button {
            touch-action: manipulation;
          }

          /* Tablet Styles */
          @media (min-width: 768px) {
            .container {
              padding: 0 20px;
            }

            .glass-effect {
              margin: 20px auto;
              max-width: 95%;
            }

            div[style*="background-color: #d32f2f"] {
              margin: 20px auto;
              max-width: 95%;
            }

            div[style*="Update Status:"] > div {
              grid-template-columns: repeat(4, 1fr) !important;
            }

            .mobile-filter-toggle {
              display: none !important;
            }
          }

          /* Desktop Styles */
          @media (min-width: 1024px) {
            .container {
              padding: 0 40px;
              max-width: 1400px;
              margin: 0 auto;
            }

            .glass-effect {
              max-width: 1200px;
            }

            div[style*="background-color: #d32f2f"] {
              max-width: 1200px;
            }

            div[style*="Repairs List"] {
              max-width: 1200px;
            }

            form > div:first-child > div {
              grid-template-columns: 1fr 1fr !important;
              gap: 30px !important;
            }

            .btn-primary {
              max-width: 300px !important;
            }
          }

          /* Large Desktop */
          @media (min-width: 1440px) {
            .container {
              padding: 0 60px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default MechanicDashboard;
