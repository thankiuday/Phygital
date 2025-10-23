const express = require("express");
const router = express.Router();
const ARExperience = require("../models/ARExperience");
const { authenticateToken } = require("../middleware/auth");

// Save new AR experience
router.post("/", authenticateToken, async (req, res) => {
  try {
    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Request body is required'
      });
    }
    
    console.log('🎯 Creating AR experience for user:', req.user._id);
    console.log('📋 Request data:', req.body);
    
    const newExp = new ARExperience(req.body);
    const savedExp = await newExp.save();
    
    console.log('✅ AR experience created successfully:', savedExp._id);
    res.status(201).json({
      status: 'success',
      message: 'AR experience created successfully',
      data: savedExp
    });
  } catch (err) {
    console.error('❌ AR Experience creation error:', err);
    console.error('❌ Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    });
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid data format'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create AR experience',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get AR experience by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid AR experience ID format'
      });
    }
    
    console.log('🔍 Fetching AR experience:', id);
    const exp = await ARExperience.findById(id);
    
    if (!exp) {
      console.log('❌ AR experience not found:', id);
      return res.status(404).json({
        status: 'error',
        message: 'AR experience not found'
      });
    }
    
    console.log('✅ AR experience found:', exp._id);
    res.json({
      status: 'success',
      data: exp
    });
  } catch (err) {
    console.error('❌ AR Experience fetch error:', err);
    console.error('❌ Error details:', {
      message: err.message,
      name: err.name,
      id: req.params.id
    });
    
    // Handle specific error types
    if (err.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid AR experience ID format'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch AR experience',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all AR experiences for a user (if needed)
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    // This would require adding userId field to ARExperience schema if needed
    const exps = await ARExperience.find({}).sort({ createdAt: -1 });
    res.json({
      status: 'success',
      data: exps
    });
  } catch (err) {
    console.error('AR Experiences fetch error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch AR experiences',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update AR experience
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const exp = await ARExperience.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!exp) {
      return res.status(404).json({
        status: 'error',
        message: 'AR experience not found'
      });
    }
    res.json({
      status: 'success',
      data: exp
    });
  } catch (err) {
    console.error('AR Experience update error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update AR experience',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete AR experience
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const exp = await ARExperience.findByIdAndDelete(req.params.id);
    if (!exp) {
      return res.status(404).json({
        status: 'error',
        message: 'AR experience not found'
      });
    }
    res.json({
      status: 'success',
      message: 'AR experience deleted successfully'
    });
  } catch (err) {
    console.error('AR Experience deletion error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete AR experience',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
