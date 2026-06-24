const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema({
  id: { type: String, required: true },
  timestamp: { type: String, required: true },
  author: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'comment' }
});

const jobStepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, default: "pending" },
  completedAt: { type: String, default: null },
  completedBy: { type: String, default: null },
  errorMsg: { type: String, default: null },
  logs: [stepLogSchema]
});

const timelineEventSchema = new mongoose.Schema({
  id: { type: String, required: true },
  timestamp: { type: String, required: true },
  author: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' }
});

const jobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  templateId: { type: String, default: 'custom' },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, default: "pending" },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  steps: [jobStepSchema],
  timeline: [timelineEventSchema]
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
