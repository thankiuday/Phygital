const mongoose = require("mongoose");

const ARExperienceSchema = new mongoose.Schema({
  mindFileUrl: { type: String, required: true },
  videoUrl: { type: String, required: true },
  socialLinks: {
    type: Object,
    default: {},
    instagram: String,
    facebook: String,
    linkedin: String
  },
}, { timestamps: true });

module.exports = mongoose.model("ARExperience", ARExperienceSchema);
