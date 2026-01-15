const express = require("express");
const router = express.Router();
const Repair = require("../models/Repair");

// Submit new repair request
router.post("/submit", async (req, res) => {
  try {
    const repair = new Repair(req.body);
    await repair.save();
    res.status(201).json(repair);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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
      { new: true }
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

router.delete('/:id', async (req, res) => {
  try {
    const repair = await Repair.findByIdAndDelete(req.params.id);
    if (!repair) {
      return res.status(404).json({ error: 'Repair not found' });
    }
    res.json({ message: 'Repair deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
