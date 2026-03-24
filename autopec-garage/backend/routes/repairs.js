const express = require("express");
const router = express.Router();
const Repair = require("../models/Repair");
const { deleteMedia } = require("../config/cloudinary");

// ─── POST /submit ─────────────────────────────────────────────────────────────
// Accepts a JSON body only — files have already been uploaded directly from the
// browser to Cloudinary. The body contains Cloudinary URLs/publicIds returned
// by those direct uploads.
//
// Expected body shape:
// {
//   registrationNumber: "KCA 123T",
//   problemDescription: "Engine noise",
//   customerName:       "Jane Doe",       // optional
//   phoneNumber:        "0700000000",      // optional
//   carModel:           "Toyota Hilux",   // optional
//   multimedia: [                          // optional, max 3
//     { type: "image", url: "https://res.cloudinary.com/...", publicId: "repairs/images/...", filename: "photo.jpg" },
//     ...
//   ]
// }
router.post("/submit", async (req, res) => {
  try {
    console.log("📝 Processing submission (JSON, direct-upload flow)");

    const {
      registrationNumber,
      problemDescription,
      customerName,
      phoneNumber,
      carModel,
      multimedia = [],
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!registrationNumber || !problemDescription) {
      return res.status(400).json({
        error: "Validation failed",
        details: "Registration number and problem description are required.",
      });
    }

    if (registrationNumber.trim().length < 3) {
      return res.status(400).json({
        error: "Validation failed",
        details: "Registration number must be at least 3 characters.",
      });
    }

    // ── Validate multimedia array ─────────────────────────────────────────────
    const MAX_FILES = 3;
    const allowedTypes = ["image", "video", "audio", "other"];

    if (!Array.isArray(multimedia)) {
      return res.status(400).json({
        error: "Validation failed",
        details: "multimedia must be an array.",
      });
    }

    if (multimedia.length > MAX_FILES) {
      return res.status(400).json({
        error: "Validation failed",
        details: `Maximum ${MAX_FILES} files allowed.`,
      });
    }

    for (const item of multimedia) {
      if (!item.url || !item.publicId) {
        return res.status(400).json({
          error: "Validation failed",
          details: "Each multimedia item must have a url and publicId.",
        });
      }
      if (item.type && !allowedTypes.includes(item.type)) {
        return res.status(400).json({
          error: "Validation failed",
          details: `Invalid multimedia type: ${item.type}`,
        });
      }
    }

    // ── Build and save the repair document ───────────────────────────────────
    const repairMultimedia = multimedia.map((item) => ({
      type: item.type || "other",
      url: item.url,
      publicId: item.publicId,
      filename: item.filename || item.publicId,
      uploadedAt: new Date(),
    }));

    const repair = new Repair({
      registrationNumber: registrationNumber.toUpperCase().trim(),
      problemDescription: problemDescription.trim(),
      customerName: customerName ? customerName.trim() : "",
      phoneNumber: phoneNumber ? phoneNumber.trim() : "",
      carModel: carModel ? carModel.trim() : "",
      status: "submitted",
      multimedia: repairMultimedia,
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
    console.error("❌ submit error:", error);

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
});

// ─── GET / ────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching all repairs...");
    const repairs = await Repair.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${repairs.length} repairs`);
    return res.json(repairs);
  } catch (error) {
    console.error("❌ Error fetching repairs:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch repairs", details: error.message });
  }
});

// ─── PUT /:id/status ──────────────────────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  try {
    const { status, mechanicNotes } = req.body;
    console.log(`📝 Updating repair ${req.params.id} → ${status}`);

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
        details: `Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const repair = await Repair.findByIdAndUpdate(
      req.params.id,
      { status, mechanicNotes: mechanicNotes || "", updatedAt: Date.now() },
      { new: true, runValidators: true },
    );

    if (!repair) return res.status(404).json({ error: "Repair not found" });

    console.log("✅ Repair updated");
    return res.json(repair);
  } catch (error) {
    console.error("❌ Error updating repair:", error);
    return res
      .status(500)
      .json({ error: "Failed to update repair", details: error.message });
  }
});

// ─── GET /track/:registration ─────────────────────────────────────────────────
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

    console.log("✅ Found");
    return res.json(repair);
  } catch (error) {
    console.error("❌ Error tracking repair:", error);
    return res
      .status(500)
      .json({ error: "Failed to track repair", details: error.message });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting repair: ${req.params.id}`);

    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ error: "Repair not found" });

    // Delete associated Cloudinary media
    if (repair.multimedia && repair.multimedia.length > 0) {
      console.log(
        `🧹 Removing ${repair.multimedia.length} Cloudinary file(s)...`,
      );
      for (const media of repair.multimedia) {
        if (media.publicId) {
          try {
            await deleteMedia(media.publicId, media.type);
          } catch (err) {
            console.error("Cloudinary delete failed (non-fatal):", err);
          }
        }
      }
    }

    await Repair.findByIdAndDelete(req.params.id);
    console.log("✅ Repair deleted");
    return res.json({ success: true, message: "Repair deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting repair:", error);
    return res
      .status(500)
      .json({ error: "Failed to delete repair", details: error.message });
  }
});

// ─── GET /status/:status ──────────────────────────────────────────────────────
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const repairs = await Repair.find({ status }).sort({ createdAt: -1 });
    return res.json(repairs);
  } catch (error) {
    console.error("❌ Error fetching by status:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch repairs", details: error.message });
  }
});

module.exports = router;
