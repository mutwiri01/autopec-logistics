const express = require("express");
const router = express.Router();
const Repair = require("../models/Repair");
const {
  upload,
  deleteMedia,
  validateFile,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AUDIO_SIZE,
} = require("../config/cloudinary");

// ─── Helper: clean up Cloudinary files on error ───────────────────────────────
// Must be called with await; uses the correct resource_type per file.
const cleanupFiles = async (files) => {
  if (!files || files.length === 0) return;
  for (const file of files) {
    try {
      if (!file.filename) continue;
      // Determine resource_type from the file's mimetype
      let mediaType = "image";
      if (file.mimetype && file.mimetype.startsWith("video/"))
        mediaType = "video";
      if (file.mimetype && file.mimetype.startsWith("audio/"))
        mediaType = "audio";
      await deleteMedia(file.filename, mediaType);
    } catch (err) {
      console.error("Error during cleanup:", err);
    }
  }
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /submit ─────────────────────────────────────────────────────────────
// Submit new repair request (with optional multimedia files)
router.post("/submit", (req, res) => {
  const uploadMiddleware = upload.array("multimedia", MAX_FILES_PER_REQUEST);

  uploadMiddleware(req, res, async (err) => {
    // ── Step 1: Handle multer errors ─────────────────────────────────────────
    if (err) {
      console.error("Upload middleware error:", err);

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large",
          details: "Max size: 5MB for images/audio, 10MB for videos.",
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          error: "Too many files",
          details: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request.`,
        });
      }
      if (err.code === "LIMIT_FIELD_KEY") {
        return res.status(400).json({
          error: "Invalid field name",
          details: "Use 'multimedia' as the field name for files.",
        });
      }
      return res.status(400).json({
        error: "File upload error",
        details: err.message,
      });
    }

    // ── Step 2: Validate file sizes synchronously (FIX: was async race) ──────
    if (req.files && req.files.length > 0) {
      // Check total size
      const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        await cleanupFiles(req.files);
        return res.status(400).json({
          error: "Total file size exceeds limit",
          details:
            `All files combined must be under ${MAX_TOTAL_SIZE / (1024 * 1024)}MB. ` +
            `Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
        });
      }

      // Check individual file sizes
      for (const file of req.files) {
        if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
          await cleanupFiles(req.files);
          return res.status(400).json({
            error: "Image file too large",
            details: `Image must be under ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`,
          });
        }
        if (file.mimetype.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
          await cleanupFiles(req.files);
          return res.status(400).json({
            error: "Video file too large",
            details: `Video must be under ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
          });
        }
        if (file.mimetype.startsWith("audio/") && file.size > MAX_AUDIO_SIZE) {
          await cleanupFiles(req.files);
          return res.status(400).json({
            error: "Audio file too large",
            details: `Audio must be under ${MAX_AUDIO_SIZE / (1024 * 1024)}MB.`,
          });
        }
      }
    }

    // ── Step 3: Process the submission ───────────────────────────────────────
    await submitRepairRequest(req, res);
  });
});

// ─── Core submission logic ────────────────────────────────────────────────────
const submitRepairRequest = async (req, res) => {
  try {
    console.log("📝 Processing submission...");
    console.log("Body keys:", Object.keys(req.body));
    console.log("Files received:", req.files ? req.files.length : 0);

    // Parse repairData from body (sent as JSON string in FormData)
    let repairData = {};
    if (req.body.repairData) {
      try {
        repairData =
          typeof req.body.repairData === "string"
            ? JSON.parse(req.body.repairData)
            : req.body.repairData;
      } catch (parseErr) {
        console.error("Failed to parse repairData JSON:", parseErr);
        repairData = req.body;
      }
    } else {
      repairData = req.body;
    }

    console.log("Parsed repairData:", repairData);

    // Validate required fields
    if (!repairData.registrationNumber || !repairData.problemDescription) {
      await cleanupFiles(req.files);
      return res.status(400).json({
        error: "Validation failed",
        details: "Registration number and problem description are required.",
      });
    }

    // Build multimedia array from successfully uploaded Cloudinary files
    const multimedia = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let fileType = "other";
        if (file.mimetype.startsWith("image/")) fileType = "image";
        else if (file.mimetype.startsWith("video/")) fileType = "video";
        else if (file.mimetype.startsWith("audio/")) fileType = "audio";

        multimedia.push({
          type: fileType,
          url: file.path, // Cloudinary secure URL
          publicId: file.filename, // Cloudinary public_id
          filename: file.originalname,
          uploadedAt: new Date(),
        });

        console.log(
          `✅ Cloudinary upload: ${file.originalname} → ${file.path}`,
        );
      }
    }

    // Persist to MongoDB
    const repair = new Repair({
      registrationNumber: repairData.registrationNumber.toUpperCase().trim(),
      problemDescription: repairData.problemDescription.trim(),
      customerName: repairData.customerName
        ? repairData.customerName.trim()
        : "",
      phoneNumber: repairData.phoneNumber ? repairData.phoneNumber.trim() : "",
      carModel: repairData.carModel ? repairData.carModel.trim() : "",
      status: "submitted",
      multimedia,
    });

    console.log("💾 Saving repair to MongoDB...");
    await repair.save();
    console.log("✅ Repair saved:", repair._id);

    return res.status(201).json({
      success: true,
      message: "Repair request submitted successfully",
      repair: {
        id: repair._id,
        registrationNumber: repair.registrationNumber,
        status: repair.status,
        createdAt: repair.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ submitRepairRequest error:", error);

    // Clean up any uploaded files since the DB save failed
    await cleanupFiles(req.files);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        error: "Validation error",
        details: messages.join(", "),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Duplicate entry",
        details: "A repair with this information already exists.",
      });
    }

    return res.status(500).json({
      error: "Failed to submit repair request",
      details: error.message,
    });
  }
};

// ─── GET / ────────────────────────────────────────────────────────────────────
// Get all repairs (mechanic dashboard)
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching all repairs...");
    const repairs = await Repair.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${repairs.length} repairs`);
    return res.json(repairs);
  } catch (error) {
    console.error("❌ Error fetching repairs:", error);
    return res.status(500).json({
      error: "Failed to fetch repairs",
      details: error.message,
    });
  }
});

// ─── PUT /:id/status ──────────────────────────────────────────────────────────
// Update repair status and/or mechanic notes
router.put("/:id/status", async (req, res) => {
  try {
    const { status, mechanicNotes } = req.body;
    console.log(`📝 Updating repair ${req.params.id} → status: ${status}`);

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const validStatuses = [
      "submitted",
      "in_garage",
      "in_progress",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        details: `Status must be one of: ${validStatuses.join(", ")}`,
      });
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

    console.log("✅ Repair updated");
    return res.json(repair);
  } catch (error) {
    console.error("❌ Error updating repair:", error);
    return res.status(500).json({
      error: "Failed to update repair",
      details: error.message,
    });
  }
});

// ─── GET /track/:registration ─────────────────────────────────────────────────
// Track a repair by vehicle registration number
router.get("/track/:registration", async (req, res) => {
  try {
    const registration = req.params.registration.toUpperCase().trim();
    console.log(`🔍 Tracking: ${registration}`);

    const repair = await Repair.findOne({
      registrationNumber: registration,
    }).sort({ createdAt: -1 });

    if (!repair) {
      return res.status(404).json({
        error: "Repair not found",
        details: `No repair found for registration: ${registration}`,
      });
    }

    console.log("✅ Repair found");
    return res.json(repair);
  } catch (error) {
    console.error("❌ Error tracking repair:", error);
    return res.status(500).json({
      error: "Failed to track repair",
      details: error.message,
    });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
// Delete a repair and its associated Cloudinary media
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting repair: ${req.params.id}`);

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    // Delete media from Cloudinary (pass correct mediaType so resource_type is right)
    if (repair.multimedia && repair.multimedia.length > 0) {
      console.log(
        `🧹 Cleaning up ${repair.multimedia.length} Cloudinary file(s)...`,
      );
      for (const media of repair.multimedia) {
        try {
          if (media.publicId) {
            await deleteMedia(media.publicId, media.type);
          }
        } catch (cloudinaryErr) {
          console.error(
            "Cloudinary deletion error (non-fatal):",
            cloudinaryErr,
          );
          // Continue even if Cloudinary cleanup fails
        }
      }
    }

    await Repair.findByIdAndDelete(req.params.id);
    console.log("✅ Repair deleted");
    return res.json({ success: true, message: "Repair deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting repair:", error);
    return res.status(500).json({
      error: "Failed to delete repair",
      details: error.message,
    });
  }
});

// ─── GET /status/:status ──────────────────────────────────────────────────────
// Get repairs filtered by status
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    console.log(`📋 Fetching repairs with status: ${status}`);

    const repairs = await Repair.find({ status }).sort({ createdAt: -1 });
    console.log(`✅ Found ${repairs.length} repairs`);
    return res.json(repairs);
  } catch (error) {
    console.error("❌ Error fetching repairs by status:", error);
    return res.status(500).json({
      error: "Failed to fetch repairs",
      details: error.message,
    });
  }
});

module.exports = router;
