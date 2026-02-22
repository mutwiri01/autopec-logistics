const mongoose = require("mongoose");

const repairSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      uppercase: true,
      trim: true,
    },
    problemDescription: {
      type: String,
      required: [true, "Problem description is required"],
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    carModel: {
      type: String,
      trim: true,
      default: "",
    },
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
    mechanicNotes: {
      type: String,
      trim: true,
      default: "",
    },
    // Cloudinary multimedia fields
    multimedia: {
      type: [
        {
          type: {
            type: String,
            enum: ["image", "video", "audio", "other"],
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
          filename: {
            type: String,
            required: true,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

// Update the updatedAt timestamp on save
repairSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
repairSchema.index({ registrationNumber: 1, createdAt: -1 });
repairSchema.index({ status: 1 });

module.exports = mongoose.model("Repair", repairSchema);
