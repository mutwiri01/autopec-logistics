import React from "react";
import { FaPhone, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import "../styles/theme.css";

const Header = () => {
  return (
    <header className="glass-effect" style={{ marginBottom: "30px" }}>
      <div className="container" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          {/* Logo Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              flex: "1",
              minWidth: "250px",
            }}
          >
            {/* Logo Image */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="/logo.png"
                alt="Autopec Logistics Logo"
                style={{
                  height: "60px",
                  width: "auto",
                  maxWidth: "200px",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  e.target.style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.style.cssText = `
                    width: 60px;
                    height: 60px;
                    background-color: #009688;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                  `;
                  fallback.textContent = "A";
                  e.target.parentElement.appendChild(fallback);
                }}
              />
            </div>

            {/* Company Name */}
            <div>
              <h1
                style={{
                  color: "#009688",
                  margin: 0,
                  fontSize: "1.8rem",
                  lineHeight: "1.2",
                }}
              >
                AUTOPEC LOGISTICS
              </h1>
            </div>
          </div>

          {/* Contact Info */}
          <div
            style={{
              display: "flex",
              gap: "25px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <FaPhone style={{ color: "#d32f2f", flexShrink: 0 }} />
              <span
                style={{
                  color: "#009688",
                  fontSize: "0.95rem",
                  whiteSpace: "nowrap",
                }}
              >
                0722746 454
              </span>
            </div>
            
           
          </div>
        </div>
      </div>

      <style>
        {`
          /* Tablet Styles */
          @media (max-width: 1024px) {
            div[style*="display: flex; align-items: center; justify-content: space-between;"] {
              gap: 15px !important;
            }
            
            div[style*="Contact Info"] {
              gap: 15px !important;
            }
            
            h1 {
              font-size: 1.5rem !important;
            }
          }
          
          /* Mobile Styles */
          @media (max-width: 768px) {
            .container {
              padding: 15px !important;
            }
            
            div[style*="display: flex; align-items: center; justify-content: space-between;"] {
              flex-direction: column;
              align-items: stretch;
              gap: 20px !important;
            }
            
            /* Logo section takes full width on mobile */
            div[style*="Logo Section"] {
              min-width: 100% !important;
              justify-content: center;
              text-align: center;
              flex-direction: column;
              gap: 10px !important;
            }
            
            img {
              height: 50px !important;
              max-width: 180px !important;
            }
            
            h1 {
              font-size: 1.4rem !important;
            }
            
            /* Contact info stacks on mobile */
            div[style*="Contact Info"] {
              width: 100%;
              justify-content: space-between !important;
              gap: 15px !important;
            }
            
            div[style*="Contact Info"] > div {
              flex: 1;
              min-width: 150px;
              justify-content: center;
            }
            
            div[style*="Contact Info"] span {
              font-size: 0.85rem !important;
            }
          }
          
          /* Small Mobile */
          @media (max-width: 480px) {
            div[style*="Contact Info"] {
              flex-direction: column;
              gap: 10px !important;
              align-items: stretch;
            }
            
            div[style*="Contact Info"] > div {
              justify-content: flex-start;
              min-width: auto;
            }
            
            h1 {
              font-size: 1.2rem !important;
            }
            
            img {
              height: 40px !important;
              max-width: 150px !important;
            }
            
            p {
              font-size: 0.8em !important;
            }
          }
          
          /* Extra Small Mobile */
          @media (max-width: 360px) {
            h1 {
              font-size: 1rem !important;
            }
            
            img {
              height: 35px !important;
              max-width: 130px !important;
            }
            
            div[style*="Contact Info"] span {
              font-size: 0.8rem !important;
            }
            
            svg {
              width: 14px;
              height: 14px;
            }
          }
          
          /* Ensure logo doesn't get too big on large screens */
          @media (min-width: 1200px) {
            img {
              height: 70px !important;
              max-width: 250px !important;
            }
            
            h1 {
              font-size: 2rem !important;
            }
          }
          
          /* Hover effects for better UX */
          div[style*="Contact Info"] > div:hover {
            transform: translateY(-2px);
            transition: transform 0.2s ease;
          }
          
          /* Improve logo loading experience */
          img {
            transition: opacity 0.3s ease;
          }
          
          img:not([src]) {
            opacity: 0;
          }
          
          img[src] {
            opacity: 1;
          }
        `}
      </style>
    </header>
  );
};

export default Header;
