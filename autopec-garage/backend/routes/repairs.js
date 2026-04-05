const express = require("express");
const router = express.Router();
const { supabase } = require("../server");
const { deleteMedia } = require("../config/cloudinary");

// ─── Helper: convert Supabase snake_case row → camelCase shape ───────────────
// The frontend and the existing API contract expect _id, registrationNumber,
// problemDescription, etc.  Supabase stores everything in snake_case, so we
// normalise before sending responses.
const toClient = (row) => {
  if (!row) return null;
  return {
    _id: row.id, // keep _id so the frontend never breaks
    id: row.id,
    registrationNumber: row.registration_number,
    problemDescription: row.problem_description,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    carModel: row.car_model,
    status: row.status,
    mechanicNotes: row.mechanic_notes,
    multimedia: row.multimedia || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// ─── POST /submit ─────────────────────────────────────────────────────────────
// Accepts a JSON body only — files have already been uploaded directly from the
// browser to Cloudinary. The body contains Cloudinary URLs/publicIds.
//
// Expected body shape:
// {
//   registrationNumber: "KCA123T",
//   problemDescription: "Engine noise",
//   customerName:       "Jane Doe",       // optional
//   phoneNumber:        "0700000000",     // optional
//   carModel:           "Toyota Hilux",   // optional
//   multimedia: [                         // optional, max 3
//     { type: "image", url: "https://res.cloudinary.com/...", publicId: "...", filename: "photo.jpg" },
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

    // ── Normalise the registration number ─────────────────────────────────────
    const normalizedReg = registrationNumber
      .replace(/\s+/g, "")
      .toUpperCase()
      .trim();

    // ── Build multimedia array for storage ───────────────────────────────────
    const multimediaPayload = multimedia.map((item) => ({
      type: item.type || "other",
      url: item.url,
      publicId: item.publicId,
      filename: item.filename || item.publicId,
      uploadedAt: new Date().toISOString(),
    }));

    // ── Insert into Supabase ──────────────────────────────────────────────────
    console.log("💾 Saving repair to Supabase...");
    const { data, error } = await supabase
      .from("repairs")
      .insert({
        registration_number: normalizedReg,
        problem_description: problemDescription.trim(),
        customer_name: customerName ? customerName.trim() : "",
        phone_number: phoneNumber ? phoneNumber.trim() : "",
        car_model: carModel ? carModel.trim() : "",
        status: "submitted",
        mechanic_notes: "",
        multimedia: multimediaPayload,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({
        error: "Failed to submit repair request",
        details: error.message,
      });
    }

    console.log("✅ Repair saved:", data.id);

    return res.status(201).json({
      success: true,
      message: "Repair request submitted successfully",
      repair: {
        id: data.id,
        _id: data.id,
        registrationNumber: data.registration_number,
        status: data.status,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("❌ submit error:", error);
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

    const { data, error } = await supabase
      .from("repairs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return res.status(500).json({
        error: "Failed to fetch repairs",
        details: error.message,
      });
    }

    const repairs = (data || []).map(toClient);
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
router.put("/:id/status", async (req, res) => {
  try {
    const { status, mechanicNotes } = req.body;
    const { id } = req.params;
    console.log(`📝 Updating repair ${id} → ${status}`);

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

    const { data, error } = await supabase
      .from("repairs")
      .update({
        status,
        mechanic_notes: mechanicNotes || "",
        // updated_at is handled automatically by the DB trigger
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Supabase returns an error with code PGRST116 when no rows match
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Repair not found" });
      }
      console.error("❌ Supabase update error:", error);
      return res.status(500).json({
        error: "Failed to update repair",
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({ error: "Repair not found" });
    }

    console.log("✅ Repair updated");
    return res.json(toClient(data));
  } catch (error) {
    console.error("❌ Error updating repair:", error);
    return res.status(500).json({
      error: "Failed to update repair",
      details: error.message,
    });
  }
});

// ─── GET /track/:registration ─────────────────────────────────────────────────
router.get("/track/:registration", async (req, res) => {
  try {
    // Normalize: strip all whitespace and uppercase
    const registration = req.params.registration
      .replace(/\s+/g, "")
      .toUpperCase()
      .trim();
    console.log(`🔍 Tracking: ${registration}`);

    const { data, error } = await supabase
      .from("repairs")
      .select("*")
      .eq("registration_number", registration)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return res.status(404).json({
          error: "Repair not found",
          details: `No repair found for registration: ${registration}`,
        });
      }
      console.error("❌ Supabase track error:", error);
      return res.status(500).json({
        error: "Failed to track repair",
        details: error.message,
      });
    }

    console.log("✅ Found");
    return res.json(toClient(data));
  } catch (error) {
    console.error("❌ Error tracking repair:", error);
    return res.status(500).json({
      error: "Failed to track repair",
      details: error.message,
    });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting repair: ${id}`);

    // Fetch first so we can delete its Cloudinary media
    const { data: repair, error: fetchError } = await supabase
      .from("repairs")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({ error: "Repair not found" });
      }
      return res.status(500).json({
        error: "Failed to delete repair",
        details: fetchError.message,
      });
    }

    // Delete associated Cloudinary media (non-fatal if it fails)
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

    // Delete the row from Supabase
    const { error: deleteError } = await supabase
      .from("repairs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("❌ Supabase delete error:", deleteError);
      return res.status(500).json({
        error: "Failed to delete repair",
        details: deleteError.message,
      });
    }

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
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;

    const { data, error } = await supabase
      .from("repairs")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase status filter error:", error);
      return res.status(500).json({
        error: "Failed to fetch repairs",
        details: error.message,
      });
    }

    return res.json((data || []).map(toClient));
  } catch (error) {
    console.error("❌ Error fetching by status:", error);
    return res.status(500).json({
      error: "Failed to fetch repairs",
      details: error.message,
    });
  }
});

module.exports = router;
