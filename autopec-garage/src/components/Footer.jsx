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
            <h3 style={{ color: "var(--light-green)" }}>AUTOPEC LOGISTICS</h3>
            
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
            © {new Date().getFullYear()} Autopec logistics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
