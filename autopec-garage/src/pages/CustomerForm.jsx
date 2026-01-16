import React, { useState } from "react";
import { FaCar, FaUser, FaPhone, FaPaperPlane } from "react-icons/fa";
import { submitRepairRequest } from "../services/api";
import Header from "../components/Header";

const CustomerForm = () => {
  const [formData, setFormData] = useState({
    registrationNumber: "",
    problemDescription: "",
    customerName: "",
    phoneNumber: "",
    carModel: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitRepairRequest(formData);
      setSubmitted(true);
      setFormData({
        registrationNumber: "",
        problemDescription: "",
        customerName: "",
        phoneNumber: "",
        carModel: "",
      });
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Error submitting request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container">
        <Header />
        <div
          className="glass-effect"
          style={{
            padding: "30px 20px",
            textAlign: "center",
            margin: "20px auto",
            maxWidth: "600px",
            width: "90%",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              backgroundColor: "#009688",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "white",
              fontSize: "28px",
            }}
          >
            ✓
          </div>
          <h2
            style={{
              color: "#00695c",
              marginBottom: "15px",
              fontSize: "1.5rem",
            }}
          >
            Request Submitted Successfully!
          </h2>
          <p
            style={{
              color: "var(--neutral-dark)",
              marginBottom: "25px",
              lineHeight: "1.6",
            }}
          >
            Your repair request has been received. Our mechanics will contact
            you shortly.
          </p>
          <button
            className="btn-primary"
            onClick={() => setSubmitted(false)}
            style={{
              padding: "12px 30px",
              fontSize: "1rem",
              width: "100%",
              maxWidth: "300px",
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <div
        className="glass-effect"
        style={{
          padding: "25px 15px",
          maxWidth: "800px",
          margin: "20px auto",
          width: "90%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              backgroundColor: "var(--accent-red)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 15px",
              color: "white",
              fontSize: "24px",
            }}
          >
            <FaCar />
          </div>
          <h2
            style={{
              color: "#00695c",
              fontSize: "1.5rem",
              marginBottom: "8px",
            }}
          >
            Car Repair Request Form
          </h2>
          <p style={{ color: "var(--neutral-dark)", fontSize: "0.95rem" }}>
            Fill in the details below and our team will assist you promptly
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            {/* Mobile: Stack all fields vertically, Desktop: Two columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "20px",
              }}
            >
              {/* Registration Number */}
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                    color: "#00695c",
                    fontSize: "0.95rem",
                  }}
                >
                  <FaCar /> Registration Number *
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 12px",
                    border: "2px solid #b2dfdb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g., KCA 123A"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                    color: "#00695c",
                    fontSize: "0.95rem",
                  }}
                >
                  <FaUser /> Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "14px 12px",
                    border: "2px solid #b2dfdb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                  placeholder="Your full name"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                    color: "#00695c",
                    fontSize: "0.95rem",
                  }}
                >
                  <FaPhone /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "14px 12px",
                    border: "2px solid #b2dfdb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                  placeholder="0700 000 000"
                />
              </div>

              {/* Car Model */}
              <div>
                <label
                  style={{
                    marginBottom: "8px",
                    display: "block",
                    color: "#00695c",
                    fontSize: "0.95rem",
                  }}
                >
                  Car Model
                </label>
                <input
                  type="text"
                  name="carModel"
                  value={formData.carModel}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "14px 12px",
                    border: "2px solid #b2dfdb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g., Toyota Hilux"
                />
              </div>

              {/* Problem Description */}
              <div>
                <label
                  style={{
                    marginBottom: "8px",
                    display: "block",
                    color: "#00695c",
                    fontSize: "0.95rem",
                  }}
                >
                  Problem Description *
                </label>
                <textarea
                  name="problemDescription"
                  value={formData.problemDescription}
                  onChange={handleChange}
                  required
                  rows="6"
                  style={{
                    width: "100%",
                    padding: "14px 12px",
                    border: "2px solid #b2dfdb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    minHeight: "150px",
                  }}
                  placeholder="Describe the problem in detail..."
                />
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                background: "linear-gradient(135deg, #009688 0%, #00695c 100%)",
                color: "white",
                border: "none",
                padding: "16px 30px",
                borderRadius: "50px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontSize: "1rem",
                width: "100%",
                maxWidth: "400px",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              <FaPaperPlane />
              {loading ? "Submitting..." : "Submit Repair Request"}
            </button>
          </div>
        </form>
      </div>
      

      <style>
        {`
          @media (min-width: 768px) {
            .glass-effect {
              padding: 40px !important;
            }
            
            form > div:first-child > div {
              grid-template-columns: 1fr 1fr !important;
              gap: 30px !important;
            }
            
            h2 {
              font-size: 2rem !important;
            }
            
            .success-container {
              padding: 50px 40px !important;
            }
            
            .success-icon {
              width: 80px !important;
              height: 80px !important;
              font-size: 36px !important;
            }
          }
          
          @media (min-width: 1024px) {
            .glass-effect {
              max-width: 800px !important;
              margin: 40px auto !important;
            }
          }
          
          input, textarea {
            font-size: 16px !important; /* Prevents iOS zoom on focus */
          }
          
          input:focus, textarea:focus {
            border-color: #009688 !important;
            outline: none;
            box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.1) !important;
          }
        `}
      </style>
    </div>
  );
};

export default CustomerForm;
