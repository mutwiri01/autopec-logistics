/* eslint-disable no-unused-vars */
import React, { useState, useRef } from "react";
import {
  FaCar,
  FaUser,
  FaPhone,
  FaPaperPlane,
  FaImage,
  FaVideo,
  FaMicrophone,
  FaTimes,
  FaCloudUploadAlt,
  FaCamera,
  FaStop,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  submitRepairRequest,
  isValidMediaFile,
  formatFileSize,
} from "../services/api";
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
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileErrors, setFileErrors] = useState([]);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Constants for limits
  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for free tier

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Open camera for photo/video capture
  const startCapture = async (type) => {
    setError(null);
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
        mediaRecorderRef.current = new MediaRecorder(stream);
        setupMediaRecorder();
      } else if (type === "video") {
        mediaRecorderRef.current = new MediaRecorder(stream);
        setupMediaRecorder();
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setError("Unable to access camera/microphone. Please check permissions.");
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

      // Check file size before adding
      if (blob.size > MAX_FILE_SIZE) {
        setError(
          `Recording exceeds 10MB limit (${(blob.size / (1024 * 1024)).toFixed(2)}MB)`,
        );
        stopCapture();
        return;
      }

      const file = new File(
        [blob],
        `${captureType}_${Date.now()}.${captureType === "video" ? "mp4" : "webm"}`,
        {
          type: captureType === "video" ? "video/mp4" : "audio/webm",
        },
      );

      // Check total files limit
      if (formData.multimedia.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        stopCapture();
        return;
      }

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
          // Check file size
          if (blob.size > MAX_FILE_SIZE) {
            setError(
              `Photo exceeds 10MB limit (${(blob.size / (1024 * 1024)).toFixed(2)}MB)`,
            );
            stopCapture();
            return;
          }

          // Check total files limit
          if (formData.multimedia.length >= MAX_FILES) {
            setError(`Maximum ${MAX_FILES} files allowed`);
            stopCapture();
            return;
          }

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
    const errors = [];
    const validFiles = [];

    // Check total files limit
    if (formData.multimedia.length + files.length > MAX_FILES) {
      setError(
        `Maximum ${MAX_FILES} files allowed. You have ${formData.multimedia.length} file(s) already.`,
      );
      return;
    }

    files.forEach((file) => {
      const validation = isValidMediaFile(file);

      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(validation.error);
      }
    });

    if (errors.length > 0) {
      setFileErrors(errors);
      setTimeout(() => setFileErrors([]), 5000);
    }

    if (validFiles.length > 0) {
      setFormData((prev) => ({
        ...prev,
        multimedia: [...prev.multimedia, ...validFiles],
      }));
    }

    // Clear input
    e.target.value = "";
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
    const validFiles = [];

    // Check total files limit
    if (formData.multimedia.length + files.length > MAX_FILES) {
      setError(
        `Maximum ${MAX_FILES} files allowed. You have ${formData.multimedia.length} file(s) already.`,
      );
      return;
    }

    files.forEach((file) => {
      const validation = isValidMediaFile(file);
      if (validation.valid) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setFormData((prev) => ({
        ...prev,
        multimedia: [...prev.multimedia, ...validFiles],
      }));
    }
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
    setError(null);
    setUploadProgress(0);

    try {
      // Validate required fields
      if (!formData.registrationNumber || !formData.problemDescription) {
        throw new Error(
          "Registration number and problem description are required",
        );
      }

      // Validate registration number format (basic)
      if (formData.registrationNumber.length < 3) {
        throw new Error("Registration number must be at least 3 characters");
      }

      // Validate phone number if provided
      if (formData.phoneNumber && formData.phoneNumber.length < 10) {
        throw new Error("Please enter a valid phone number");
      }

      console.log("Submitting form data:", formData);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      await submitRepairRequest(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("Submission successful");

      setSubmitted(true);
      setFormData({
        registrationNumber: "",
        problemDescription: "",
        customerName: "",
        phoneNumber: "",
        carModel: "",
        multimedia: [],
      });

      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      console.error("Error submitting request:", error);
      setError(error.message || "Error submitting request. Please try again.");
      setUploadProgress(0);
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

        {error && (
          <div
            style={{
              backgroundColor: "#ffebee",
              color: "#d32f2f",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #ffcdd2",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaExclamationTriangle />
            {error}
          </div>
        )}

        {fileErrors.length > 0 && (
          <div
            style={{
              backgroundColor: "#fff3e0",
              color: "#e65100",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #ffe0b2",
            }}
          >
            {fileErrors.map((err, idx) => (
              <div key={idx}>• {err}</div>
            ))}
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div
            style={{
              marginBottom: "20px",
              backgroundColor: "#e0f2f1",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "4px",
                backgroundColor: "#009688",
                width: `${uploadProgress}%`,
                transition: "width 0.3s ease",
              }}
            />
            <p
              style={{
                textAlign: "center",
                padding: "8px",
                fontSize: "0.9rem",
              }}
            >
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

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
                  maxLength="20"
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
                  <span
                    style={{
                      fontSize: "0.8rem",
                      marginLeft: "10px",
                      color: "#666",
                    }}
                  >
                    (Max {MAX_FILES} files, 10MB each)
                  </span>
                </label>

                {/* File count indicator */}
                {formData.multimedia.length > 0 && (
                  <div
                    style={{
                      marginBottom: "10px",
                      fontSize: "0.9rem",
                      color: "#00695c",
                    }}
                  >
                    {formData.multimedia.length} / {MAX_FILES} files selected
                  </div>
                )}

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
                    disabled={formData.multimedia.length >= MAX_FILES}
                    style={{
                      background:
                        formData.multimedia.length >= MAX_FILES
                          ? "#ccc"
                          : "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
                      color: "white",
                      border: "none",
                      padding: "15px 10px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor:
                        formData.multimedia.length >= MAX_FILES
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease",
                      opacity:
                        formData.multimedia.length >= MAX_FILES ? 0.5 : 1,
                    }}
                  >
                    <FaCamera size={24} />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startCapture("video")}
                    disabled={formData.multimedia.length >= MAX_FILES}
                    style={{
                      background:
                        formData.multimedia.length >= MAX_FILES
                          ? "#ccc"
                          : "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                      color: "white",
                      border: "none",
                      padding: "15px 10px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor:
                        formData.multimedia.length >= MAX_FILES
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease",
                      opacity:
                        formData.multimedia.length >= MAX_FILES ? 0.5 : 1,
                    }}
                  >
                    <FaVideo size={24} />
                    <span>Record Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startCapture("audio")}
                    disabled={formData.multimedia.length >= MAX_FILES}
                    style={{
                      background:
                        formData.multimedia.length >= MAX_FILES
                          ? "#ccc"
                          : "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                      color: "white",
                      border: "none",
                      padding: "15px 10px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      cursor:
                        formData.multimedia.length >= MAX_FILES
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease",
                      opacity:
                        formData.multimedia.length >= MAX_FILES ? 0.5 : 1,
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
                  onClick={() =>
                    formData.multimedia.length < MAX_FILES &&
                    fileInputRef.current.click()
                  }
                  style={{
                    border: `2px dashed ${dragActive ? "#009688" : "#b2dfdb"}`,
                    borderRadius: "10px",
                    padding: "20px",
                    textAlign: "center",
                    backgroundColor: dragActive
                      ? "rgba(0, 150, 136, 0.05)"
                      : "#f9f9f9",
                    cursor:
                      formData.multimedia.length >= MAX_FILES
                        ? "not-allowed"
                        : "pointer",
                    transition: "all 0.3s ease",
                    marginBottom: "15px",
                    opacity: formData.multimedia.length >= MAX_FILES ? 0.5 : 1,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    disabled={formData.multimedia.length >= MAX_FILES}
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
                    {formData.multimedia.length >= MAX_FILES
                      ? "Maximum files reached"
                      : "Or drag & drop files here"}
                  </p>
                  <p style={{ color: "#666", fontSize: "0.85rem" }}>
                    Supports: Images, Videos, Audio (Max 10MB each, {MAX_FILES}{" "}
                    files max)
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
                            <span
                              style={{
                                fontSize: "10px",
                                marginTop: "5px",
                                color: "#666",
                              }}
                            >
                              {(file.size / (1024 * 1024)).toFixed(1)}MB
                            </span>
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
                background: loading
                  ? "#ccc"
                  : "linear-gradient(135deg, #009688 0%, #00695c 100%)",
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
