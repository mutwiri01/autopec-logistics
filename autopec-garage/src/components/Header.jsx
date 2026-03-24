import React from "react";
import { FaPhone, FaWrench } from "react-icons/fa";
import "../styles/theme.css";

const Header = () => {
  return (
    <header
      style={{
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        borderBottom: "3px solid #c0392b",
        marginBottom: "0",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      <div
        className="container"
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Logo + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Logo Image with fallback */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <img
              src="/logo.png"
              alt="Autopec Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                color: "#c0392b",
                fontSize: "22px",
              }}
            >
              <FaWrench />
            </div>
          </div>

          {/* Brand name */}
          <div>
            <h1
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                lineHeight: 1,
                margin: 0,
              }}
            >
              AUTOPEC <span style={{ color: "#c0392b" }}>LOGISTICS</span>
            </h1>
            <p
              style={{
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Automotive Repair Services
            </p>
          </div>
        </div>

        {/* Contact */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(192,57,43,0.15)",
            border: "1px solid rgba(192,57,43,0.3)",
            borderRadius: "30px",
            padding: "8px 16px",
            flexShrink: 0,
          }}
        >
          <FaPhone style={{ color: "#c0392b", fontSize: "13px" }} />
          <span
            style={{
              color: "#e8e8e8",
              fontSize: "0.88rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            0722 746 454
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
