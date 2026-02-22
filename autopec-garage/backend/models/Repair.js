const mongoose = require("mongoose");

const repairSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: true,
    uppercase: true,
  },
  problemDescription: {
    type: String,
    required: true,
  },
  customerName: String,
  phoneNumber: String,
  carModel: String,
  status: {
    type: String,
    enum: ["submitted", "in_garage", "in_progress", "completed"],
    default: "submitted",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  mechanicNotes: String,
  // Cloudinary multimedia fields
  multimedia: {
    type: [
      {
        type: {
          type: String,
          enum: ["image", "video", "audio"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        thumbnailUrl: String,
        duration: Number,
        filename: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },
});

// Update the updatedAt timestamp on save
repairSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Repair", repairSchema);
