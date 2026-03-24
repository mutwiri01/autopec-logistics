import React from "react";
import { FaCarSide, FaTools, FaWrench, FaCheckCircle } from "react-icons/fa";

const STATUS_CONFIG = {
  submitted: {
    label: "Submitted",
    icon: <FaCarSide />,
    color: "#f39c12",
    bg: "#fef9e7",
    border: "rgba(243,156,18,0.25)",
  },
  in_garage: {
    label: "In Garage",
    icon: <FaTools />,
    color: "#0984e3",
    bg: "#e8f4fd",
    border: "rgba(9,132,227,0.25)",
  },
  in_progress: {
    label: "In Progress",
    icon: <FaWrench />,
    color: "#00b894",
    bg: "#e8f8f5",
    border: "rgba(0,184,148,0.25)",
  },
  completed: {
    label: "Completed",
    icon: <FaCheckCircle />,
    color: "#27ae60",
    bg: "#eafaf1",
    border: "rgba(39,174,96,0.25)",
  },
};

const StatusBadge = ({ status, size = "md" }) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    icon: <FaCarSide />,
    color: "#888",
    bg: "#f0f0f0",
    border: "rgba(0,0,0,0.1)",
  };

  const padding =
    size === "sm" ? "3px 10px" : size === "lg" ? "7px 16px" : "4px 12px";
  const fontSize =
    size === "sm" ? "0.72rem" : size === "lg" ? "0.9rem" : "0.78rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding,
        borderRadius: "20px",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export { STATUS_CONFIG };
export default StatusBadge;
