import React from "react";
import { FaFacebook, FaTwitter, FaInstagram, FaEnvelope } from "react-icons/fa";

const Footer = () => {
  return (
    <footer
      style={{
        marginTop: "50px",
        backgroundColor: "var(--dark-green)",
        color: "white",
        padding: "40px 0",
        borderRadius: "20px 20px 0 0",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "30px",
          }}
        >
          <div>
            <h3 style={{ color: "var(--light-green)" }}>AUTOPEC GARAGE</h3>
            <p>
              Professional auto repair services with over 15 years of
              experience.
            </p>
          </div>

          <div>
            <h4 style={{ color: "var(--light-green)" }}>Quick Links</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li style={{ marginBottom: "8px" }}>
                <a href="/" style={{ color: "white", textDecoration: "none" }}>
                  Submit Repair
                </a>
              </li>
              <li style={{ marginBottom: "8px" }}>
                <a
                  href="/dashboard"
                  style={{ color: "white", textDecoration: "none" }}
                >
                  Mechanic Login
                </a>
              </li>
              <li style={{ marginBottom: "8px" }}>
                <a
                  href="#track"
                  style={{ color: "white", textDecoration: "none" }}
                >
                  Track Repair
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: "var(--light-green)" }}>Contact Info</h4>
            <p>📍 Nairobi, Kenya</p>
            <p>📞 +254 700 123 456</p>
            <p>✉️ info@autopec.co.ke</p>
          </div>

          <div>
            <h4 style={{ color: "var(--light-green)" }}>Follow Us</h4>
            <div style={{ display: "flex", gap: "15px", fontSize: "24px" }}>
              <FaFacebook />
              <FaTwitter />
              <FaInstagram />
              <FaEnvelope />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}
        >
          <p>
            © {new Date().getFullYear()} Autopec Garage. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
