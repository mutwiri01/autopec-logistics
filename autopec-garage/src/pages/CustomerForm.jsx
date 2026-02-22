import React, { useState, useRef } from "react";
import {
  FaCar,
  FaUser,
  FaPhone,
  FaPaperPlane,
  FaImage,
  FaVideo,
  FaMicrophone,
  FaTrash,
  FaCloudUploadAlt,
  FaTimes,
  FaCamera,
  FaPlay,
  FaStop,
} from "react-icons/fa";
import { submitRepairRequest } from "../services/api";
import Header from "../components/Header";

const CustomerForm = () => {
  const [formData, setFormData] = useState({
    registrationNumber: "",
    problemDescription: "",
    customerName: "",
    phoneNumber: "",
    carModel: "",
    multimedia: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureType, setCaptureType] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Open camera for photo/video capture
  const startCapture = async (type) => {
    setCaptureType(type);
    setShowCaptureModal(true);

    try {
      const constraints = {
        video: type === "photo" || type === "video",
        audio: type === "video" || type === "audio",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (type === "audio") {
        // Set up audio recording
        audioContextRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
        const mediaStream =
          audioContextRef.current.createMediaStreamSource(stream);
        const destination =
          audioContextRef.current.createMediaStreamDestination();
        mediaStream.connect(destination);

        mediaRecorderRef.current = new MediaRecorder(destination.stream);
        setupMediaRecorder();
      } else if (type === "video") {
        mediaRecorderRef.current = new MediaRecorder(stream);
        setupMediaRecorder();
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Unable to access camera/microphone. Please check permissions.");
      setShowCaptureModal(false);
    }
  };

  const setupMediaRecorder = () => {
    const chunks = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, {
        type: captureType === "video" ? "video/mp4" : "audio/webm",
      });
      const file = new File(
        [blob],
        `${captureType}_${Date.now()}.${captureType === "video" ? "mp4" : "webm"}`,
        {
          type: captureType === "video" ? "video/mp4" : "audio/webm",
        },
      );

      setFormData((prev) => ({
        ...prev,
        multimedia: [...prev.multimedia, file],
      }));

      stopCapture();
    };
  };

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start timer
      let seconds = 0;
      recordingIntervalRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
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
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

      canvas.toBlob(
        (blob) => {
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setFormData((prev) => ({
            ...prev,
            multimedia: [...prev.multimedia, file],
          }));
          stopCapture();
        },
        "image/jpeg",
        0.9,
      );
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setShowCaptureModal(false);
    setCaptureType(null);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValid =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type.startsWith("audio/");
      const isWithinSize = file.size <= 50 * 1024 * 1024; // 50MB

      if (!isValid) {
        alert(
          `${file.name} is not a supported file type. Please upload images, videos, or audio files.`,
        );
      }
      if (!isWithinSize) {
        alert(`${file.name} exceeds 50MB limit.`);
      }

      return isValid && isWithinSize;
    });

    setFormData((prev) => ({
      ...prev,
      multimedia: [...prev.multimedia, ...validFiles],
    }));
  };

  const removeFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      multimedia: prev.multimedia.filter((_, i) => i !== index),
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      return (
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type.startsWith("audio/")
      );
    });

    setFormData((prev) => ({
      ...prev,
      multimedia: [...prev.multimedia, ...validFiles],
    }));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith("image/")) return <FaImage />;
    if (file.type.startsWith("video/")) return <FaVideo />;
    if (file.type.startsWith("audio/")) return <FaMicrophone />;
    return <FaCloudUploadAlt />;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
        multimedia: [],
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
            {/* Form Fields */}
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
              <div style={{ gridColumn: "1/-1" }}>
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
                  rows="4"
                  style={{
                    width: "100%",
                    padding: "14px 12px",
                    border: "2px solid #b2dfdb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    minHeight: "120px",
                  }}
                  placeholder="Describe the problem in detail..."
                />
              </div>

              {/* Capture Options */}
              <div style={{ gridColumn: "1/-1" }}>
                <label
                  style={{
                    marginBottom: "15px",
                    display: "block",
                    color: "#00695c",
                    fontSize: "0.95rem",
                  }}
                >
                  Add Photos, Videos, or Audio Recordings
                </label>

                {/* Capture Buttons */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => startCapture("photo")}
                    style={{
                      background:
                        "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
                      color: "white",
                      border: "none",
                      padding: "15px 10px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaCamera size={24} />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startCapture("video")}
                    style={{
                      background:
                        "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                      color: "white",
                      border: "none",
                      padding: "15px 10px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaVideo size={24} />
                    <span>Record Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startCapture("audio")}
                    style={{
                      background:
                        "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                      color: "white",
                      border: "none",
                      padding: "15px 10px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaMicrophone size={24} />
                    <span>Record Audio</span>
                  </button>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    border: `2px dashed ${dragActive ? "#009688" : "#b2dfdb"}`,
                    borderRadius: "10px",
                    padding: "20px",
                    textAlign: "center",
                    backgroundColor: dragActive
                      ? "rgba(0, 150, 136, 0.05)"
                      : "#f9f9f9",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    marginBottom: "15px",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <FaCloudUploadAlt
                    style={{
                      fontSize: "40px",
                      color: "#009688",
                      marginBottom: "10px",
                    }}
                  />
                  <p
                    style={{
                      color: "#00695c",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Or drag & drop files here
                  </p>
                  <p style={{ color: "#666", fontSize: "0.85rem" }}>
                    Supports: Images, Videos, Audio (Max 50MB each)
                  </p>
                </div>

                {/* File Preview Grid */}
                {formData.multimedia.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: "10px",
                      marginTop: "15px",
                    }}
                  >
                    {formData.multimedia.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          borderRadius: "8px",
                          overflow: "hidden",
                          backgroundColor: "#f0f0f0",
                          aspectRatio: "1",
                        }}
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
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
                              backgroundColor: "#e0f2f1",
                              color: "#009688",
                              fontSize: "24px",
                            }}
                          >
                            {getFileIcon(file)}
                            {file.type.startsWith("video/") && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  marginTop: "5px",
                                  color: "#666",
                                }}
                              >
                                Video
                              </span>
                            )}
                            {file.type.startsWith("audio/") && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  marginTop: "5px",
                                  color: "#666",
                                }}
                              >
                                Audio
                              </span>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          style={{
                            position: "absolute",
                            top: "5px",
                            right: "5px",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            border: "none",
                            color: "#d32f2f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                fontSize: "1rem",
                width: "100%",
                maxWidth: "400px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <FaPaperPlane />
              {loading ? "Submitting..." : "Submit Repair Request"}
            </button>
          </div>
        </form>
      </div>

      {/* Capture Modal */}
      {showCaptureModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "15px",
              padding: "20px",
              width: "100%",
              maxWidth: "600px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ color: "#00695c", margin: 0 }}>
                {captureType === "photo" && "Take Photo"}
                {captureType === "video" && "Record Video"}
                {captureType === "audio" && "Record Audio"}
              </h3>
              <button
                onClick={stopCapture}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Video Element */}
            {(captureType === "photo" || captureType === "video") && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={captureType === "photo"}
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  backgroundColor: "#000",
                  marginBottom: "15px",
                }}
              />
            )}

            {/* Audio Recording UI */}
            {captureType === "audio" && (
              <div
                style={{
                  height: "200px",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "15px",
                }}
              >
                <FaMicrophone
                  style={{
                    fontSize: "60px",
                    color: isRecording ? "#f44336" : "#009688",
                    animation: isRecording ? "pulse 1s infinite" : "none",
                  }}
                />
                {isRecording && (
                  <div
                    style={{
                      marginTop: "15px",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#00695c",
                    }}
                  >
                    {formatTime(recordingTime)}
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              {captureType === "photo" && (
                <button
                  onClick={takePhoto}
                  style={{
                    background: "#009688",
                    color: "white",
                    border: "none",
                    padding: "15px 30px",
                    borderRadius: "50px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "1rem",
                  }}
                >
                  <FaCamera /> Take Photo
                </button>
              )}

              {(captureType === "video" || captureType === "audio") && (
                <>
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      style={{
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "15px 30px",
                        borderRadius: "50px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "1rem",
                      }}
                    >
                      <FaVideo /> Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      style={{
                        background: "#4caf50",
                        color: "white",
                        border: "none",
                        padding: "15px 30px",
                        borderRadius: "50px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "1rem",
                      }}
                    >
                      <FaStop /> Stop Recording
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
            font-size: 16px !important;
          }
          
          input:focus, textarea:focus {
            border-color: #009688 !important;
            outline: none;
            box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.1) !important;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default CustomerForm;
