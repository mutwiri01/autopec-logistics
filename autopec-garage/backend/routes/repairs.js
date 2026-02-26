const express = require("express");
const router = express.Router();
const Repair = require("../models/Repair");
const {
  upload,
  deleteMedia,
  validateFile,
  validateUpload,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_SIZE,
} = require("../config/cloudinary");

// Submit new repair request with multimedia
router.post("/submit", (req, res, next) => {
  // First validate total size if we have files
  const uploadMiddleware = upload.array("multimedia", MAX_FILES_PER_REQUEST);

  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err);

      // Handle specific multer errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large",
          details: "Maximum file size: 10MB for images, 100MB for videos",
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          error: "Too many files",
          details: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request`,
        });
      }

      if (err.code === "LIMIT_FIELD_KEY") {
        return res.status(400).json({
          error: "Invalid field name",
          details: "Please use 'multimedia' as the field name for files",
        });
      }

      return res.status(400).json({
        error: "File upload error",
        details: err.message,
      });
    }

    // Now validate total size of all files
    if (req.files && req.files.length > 0) {
      let totalSize = 0;
      for (const file of req.files) {
        totalSize += file.size;
      }

      if (totalSize > MAX_TOTAL_SIZE) {
        // Clean up uploaded files
        Promise.all(
          req.files.map((file) => deleteMedia(file.filename).catch(() => {})),
        ).then(() => {
          return res.status(400).json({
            error: "Total file size exceeds limit",
            details: `Total size of all files must be less than ${MAX_TOTAL_SIZE / (1024 * 1024)}MB. Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
          });
        });
        return;
      }
    }

    // Proceed with the rest of the submission
    submitRepairRequest(req, res);
  });
});

const submitRepairRequest = async (req, res) => {
  try {
    console.log("📝 Received submission request");
    console.log("Body:", req.body);
    console.log("Files:", req.files ? req.files.length : 0);

    // Parse the repair data
    let repairData = {};
    if (req.body.repairData) {
      try {
        repairData =
          typeof req.body.repairData === "string"
            ? JSON.parse(req.body.repairData)
            : req.body.repairData;
      } catch (e) {
        console.error("Error parsing repairData:", e);
        repairData = req.body;
      }
    } else {
      repairData = req.body;
    }

    console.log("Parsed repair data:", repairData);

    // Validate required fields
    if (!repairData.registrationNumber || !repairData.problemDescription) {
      // Clean up uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            if (file.filename) {
              await deleteMedia(file.filename);
            }
          } catch (deleteError) {
            console.error("Error cleaning up file:", deleteError);
          }
        }
      }

      return res.status(400).json({
        error: "Registration number and problem description are required",
        details: "Please fill in all required fields",
      });
    }

    // Handle uploaded files from Cloudinary
    const multimedia = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
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

        console.log(
          `✅ File uploaded: ${file.originalname} (${fileType}) - URL: ${file.path}`,
        );
      }
    }

    // Create repair document
    const repair = new Repair({
      registrationNumber: repairData.registrationNumber.toUpperCase().trim(),
      problemDescription: repairData.problemDescription.trim(),
      customerName: repairData.customerName
        ? repairData.customerName.trim()
        : "",
      phoneNumber: repairData.phoneNumber ? repairData.phoneNumber.trim() : "",
      carModel: repairData.carModel ? repairData.carModel.trim() : "",
      status: "submitted",
      multimedia: multimedia,
    });

    console.log("💾 Saving repair to database...");
    await repair.save();
    console.log("✅ Repair saved successfully with ID:", repair._id);

    res.status(201).json({
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
    console.error("❌ Error submitting repair:", error);

    // If there was an error, try to clean up uploaded files from Cloudinary
    if (req.files && req.files.length > 0) {
      console.log("🧹 Cleaning up uploaded files due to error...");
      for (const file of req.files) {
        try {
          if (file.filename) {
            await deleteMedia(file.filename);
          }
        } catch (deleteError) {
          console.error("Error cleaning up file:", deleteError);
        }
      }
    }

    // Handle MongoDB validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        error: "Validation error",
        details: errors.join(", "),
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Duplicate entry",
        details: "A repair with this information already exists",
      });
    }

    res.status(500).json({
      error: "Failed to submit repair request",
      details: error.message,
      suggestion: "Please try again or contact support if the problem persists",
    });
  }
};

// Get all repairs (for mechanic dashboard)
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching all repairs...");
    const repairs = await Repair.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${repairs.length} repairs`);
    res.json(repairs);
  } catch (error) {
    console.error("❌ Error fetching repairs:", error);
    res.status(500).json({
      error: "Failed to fetch repairs",
      details: error.message,
    });
  }
});

// Update repair status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, mechanicNotes } = req.body;
    console.log(`📝 Updating repair ${req.params.id} to status: ${status}`);

    // Validate status
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

    console.log("✅ Repair updated successfully");
    res.json(repair);
  } catch (error) {
    console.error("❌ Error updating repair:", error);
    res.status(500).json({
      error: "Failed to update repair",
      details: error.message,
    });
  }
});

// Get repair by registration number
router.get("/track/:registration", async (req, res) => {
  try {
    const registration = req.params.registration.toUpperCase().trim();
    console.log(`🔍 Tracking repair: ${registration}`);

    const repair = await Repair.findOne({
      registrationNumber: registration,
    }).sort({ createdAt: -1 });

    if (!repair) {
      return res.status(404).json({
        error: "Repair not found",
        details: `No repair found with registration number: ${registration}`,
      });
    }

    console.log("✅ Repair found");
    res.json(repair);
  } catch (error) {
    console.error("❌ Error tracking repair:", error);
    res.status(500).json({
      error: "Failed to track repair",
      details: error.message,
    });
  }
});

// Delete repair and associated media
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting repair: ${req.params.id}`);

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    // Delete associated media from Cloudinary
    if (repair.multimedia && repair.multimedia.length > 0) {
      console.log(
        `🧹 Cleaning up ${repair.multimedia.length} files from Cloudinary...`,
      );
      for (const media of repair.multimedia) {
        try {
          if (media.publicId) {
            await deleteMedia(media.publicId, media.type);
          }
        } catch (cloudinaryError) {
          console.error("Error deleting from Cloudinary:", cloudinaryError);
          // Continue with deletion even if Cloudinary fails
        }
      }
    }

    // Delete the repair from database
    await Repair.findByIdAndDelete(req.params.id);

    console.log("✅ Repair deleted successfully");
    res.json({
      success: true,
      message: "Repair deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting repair:", error);
    res.status(500).json({
      error: "Failed to delete repair",
      details: error.message,
    });
  }
});

// Get repairs by status
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    console.log(`📋 Fetching repairs with status: ${status}`);

    const repairs = await Repair.find({ status }).sort({ createdAt: -1 });
    console.log(`✅ Found ${repairs.length} repairs`);
    res.json(repairs);
  } catch (error) {
    console.error("❌ Error fetching repairs by status:", error);
    res.status(500).json({
      error: "Failed to fetch repairs",
      details: error.message,
    });
  }
});

module.exports = router;
