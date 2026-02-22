const express = require("express");
const router = express.Router();
const Repair = require("../models/Repair");
const { uploadMedia, deleteMedia } = require("../config/cloudinary");

// Submit new repair request with multimedia
router.post(
  "/submit",
  uploadMedia.array("multimedia", 10),
  async (req, res) => {
    try {
      // Parse the repair data
      const repairData = JSON.parse(req.body.repairData || "{}");

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
            thumbnailUrl:
              fileType === "video"
                ? file.path.replace(/\.[^/.]+$/, ".jpg")
                : null,
            filename: file.originalname,
          });
        });
      }

      const repair = new Repair({
        ...repairData,
        multimedia,
      });

      await repair.save();
      res.status(201).json(repair);
    } catch (error) {
      console.error("Error submitting repair:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

// Get all repairs (for mechanic dashboard)
router.get("/", async (req, res) => {
  try {
    const repairs = await Repair.find().sort({ createdAt: -1 });
    res.json(repairs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update repair status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, mechanicNotes } = req.body;
    const repair = await Repair.findByIdAndUpdate(
      req.params.id,
      {
        status,
        mechanicNotes,
        updatedAt: Date.now(),
      },
      { new: true },
    );
    res.json(repair);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get repair by registration number
router.get("/track/:registration", async (req, res) => {
  try {
    const repair = await Repair.findOne({
      registrationNumber: req.params.registration.toUpperCase(),
    }).sort({ createdAt: -1 });
    res.json(repair);
  } catch (error) {
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
        await deleteMedia(media.publicId);
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

module.exports = router;
