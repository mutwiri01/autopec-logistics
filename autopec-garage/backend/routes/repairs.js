const express = require("express");
const router = express.Router();
const Repair = require("../models/Repair");
const { upload, deleteMedia } = require("../config/cloudinary");

// Submit new repair request with multimedia
router.post("/submit", upload.array("multimedia", 10), async (req, res) => {
  try {
    console.log("Received submission request");
    console.log("Body:", req.body);
    console.log("Files:", req.files);

    // Parse the repair data
    let repairData = {};
    if (req.body.repairData) {
      try {
        repairData = JSON.parse(req.body.repairData);
      } catch (e) {
        console.error("Error parsing repairData:", e);
        // If parsing fails, try to use req.body directly
        repairData = req.body;
      }
    } else {
      repairData = req.body;
    }

    console.log("Parsed repair data:", repairData);

    // Validate required fields
    if (!repairData.registrationNumber || !repairData.problemDescription) {
      return res.status(400).json({
        error: "Registration number and problem description are required",
      });
    }

    // Handle uploaded files from Cloudinary
    const multimedia = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        let fileType = "other";
        if (file.mimetype.startsWith("image/")) fileType = "image";
        else if (file.mimetype.startsWith("video/")) fileType = "video";
        else if (file.mimetype.startsWith("audio/")) fileType = "audio";

        multimedia.push({
          type: fileType,
          url: file.path,
          publicId: file.filename,
          filename: file.originalname,
          uploadedAt: new Date(),
        });
      });
    }

    // Create repair document
    const repair = new Repair({
      registrationNumber: repairData.registrationNumber.toUpperCase(),
      problemDescription: repairData.problemDescription,
      customerName: repairData.customerName || "",
      phoneNumber: repairData.phoneNumber || "",
      carModel: repairData.carModel || "",
      status: "submitted",
      multimedia: multimedia,
    });

    console.log("Saving repair:", repair);
    await repair.save();
    console.log("Repair saved successfully");

    res.status(201).json(repair);
  } catch (error) {
    console.error("Error submitting repair:", error);
    res.status(500).json({
      error: error.message,
      details: "Failed to submit repair request",
    });
  }
});

// Get all repairs (for mechanic dashboard)
router.get("/", async (req, res) => {
  try {
    const repairs = await Repair.find().sort({ createdAt: -1 });
    res.json(repairs);
  } catch (error) {
    console.error("Error fetching repairs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update repair status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, mechanicNotes } = req.body;

    // Validate status
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const repair = await Repair.findByIdAndUpdate(
      req.params.id,
      {
        status,
        mechanicNotes: mechanicNotes || "",
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    );

    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    res.json(repair);
  } catch (error) {
    console.error("Error updating repair:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get repair by registration number
router.get("/track/:registration", async (req, res) => {
  try {
    const repair = await Repair.findOne({
      registrationNumber: req.params.registration.toUpperCase(),
    }).sort({ createdAt: -1 });

    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    res.json(repair);
  } catch (error) {
    console.error("Error tracking repair:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete repair and associated media
router.delete("/:id", async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    // Delete associated media from Cloudinary
    if (repair.multimedia && repair.multimedia.length > 0) {
      for (const media of repair.multimedia) {
        try {
          if (media.publicId) {
            await deleteMedia(media.publicId);
          }
        } catch (cloudinaryError) {
          console.error("Error deleting from Cloudinary:", cloudinaryError);
          // Continue with deletion even if Cloudinary fails
        }
      }
    }

    // Delete the repair from database
    await Repair.findByIdAndDelete(req.params.id);

    res.json({ message: "Repair deleted successfully" });
  } catch (error) {
    console.error("Error deleting repair:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get repairs by status (optional)
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const repairs = await Repair.find({ status }).sort({ createdAt: -1 });
    res.json(repairs);
  } catch (error) {
    console.error("Error fetching repairs by status:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
