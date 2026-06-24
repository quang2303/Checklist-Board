const Job = require('../models/Job');
const Template = require('../models/Template');
const sse = require('../utils/sse');
const { recalculateJobStatus } = require('../utils/helpers');

// GET /api/jobs
const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({});
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jobs (Start from template or create custom)
const createJob = async (req, res) => {
  const { templateId, title, description, createdBy } = req.body;
  if (!createdBy) {
    return res.status(400).json({ error: "Missing createdBy" });
  }
  
  try {
    let steps = [];
    let templateTitle = "Checklist tùy chỉnh";
    let jobTitle = title || "Checklist tùy chỉnh";
    let jobDescription = description || "Checklist tự định nghĩa không dùng mẫu";

    if (templateId && templateId !== 'custom') {
      const template = await Template.findOne({ id: templateId });
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      templateTitle = template.title;
      jobTitle = title || template.title;
      jobDescription = description || template.description;
      steps = template.steps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        status: "pending",
        completedAt: null,
        completedBy: null,
        errorMsg: null,
        logs: []
      }));
    }
    
    const newJob = new Job({
      id: `job-${Date.now()}`,
      templateId: templateId || 'custom',
      title: jobTitle,
      description: jobDescription,
      status: "pending",
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          author: createdBy,
          message: templateId && templateId !== 'custom' 
            ? `Đã tạo công việc checklist từ mẫu "${templateTitle}"`
            : `Đã tạo công việc checklist tự định nghĩa`,
          type: "info"
        }
      ]
    });
    
    await newJob.save();
    sse.notifyClients('JOB_CREATED', newJob);
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/:id
const getJobDetail = async (req, res) => {
  try {
    const job = await Job.findOne({ id: req.params.id });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/jobs/:id/steps/:stepId
const updateStepStatus = async (req, res) => {
  const { id, stepId } = req.params;
  const { status, username, errorMsg } = req.body;
  
  if (!status || !username) {
    return res.status(400).json({ error: "Missing status or username" });
  }
  
  try {
    const job = await Job.findOne({ id });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    const step = job.steps.find(s => s.id === stepId);
    if (!step) {
      return res.status(404).json({ error: "Step not found" });
    }
    
    const oldStatus = step.status;
    step.status = status;
    
    if (status === 'completed') {
      step.completedAt = new Date().toISOString();
      step.completedBy = username;
      step.errorMsg = null;
    } else if (status === 'failed') {
      step.completedAt = null;
      step.completedBy = null;
      step.errorMsg = errorMsg || "Đã xảy ra lỗi không xác định";
    } else {
      // pending
      step.completedAt = null;
      step.completedBy = null;
      step.errorMsg = null;
    }
    
    // Add step level logs
    const stepLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: username,
      message: status === 'failed' 
        ? `Đã báo lỗi: "${step.errorMsg}"` 
        : `Đã thay đổi trạng thái từ "${oldStatus}" sang "${status}"`,
      type: status === 'failed' ? 'error' : 'status_change'
    };
    step.logs.push(stepLog);
    
    // Add to global job timeline
    job.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: username,
      message: status === 'failed'
        ? `Báo lỗi tại bước "${step.title}": ${step.errorMsg}`
        : status === 'completed'
          ? `Hoàn thành bước "${step.title}"`
          : `Chuyển bước "${step.title}" về Trạng thái Chờ`,
      type: status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'info'
    });
    
    // Recalculate Job Status
    const oldJobStatus = job.status;
    job.status = recalculateJobStatus(job.steps);
    job.updatedAt = new Date().toISOString();
    
    if (oldJobStatus !== job.status) {
      job.timeline.push({
        id: `tl-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        author: "Hệ thống",
        message: `Trạng thái công việc chuyển sang "${job.status}"`,
        type: "system"
      });
    }
    
    await job.save();
    sse.notifyClients('JOB_UPDATED', job);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jobs/:id/steps/:stepId/logs
const addStepLog = async (req, res) => {
  const { id, stepId } = req.params;
  const { author, message, type } = req.body;
  
  if (!author || !message) {
    return res.status(400).json({ error: "Missing author or message" });
  }
  
  try {
    const job = await Job.findOne({ id });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    const step = job.steps.find(s => s.id === stepId);
    if (!step) {
      return res.status(404).json({ error: "Step not found" });
    }
    
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author,
      message,
      type: type || 'comment'
    };
    
    step.logs.push(newLog);
    
    // Also push to job global timeline
    job.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author,
      message: `[Bước: ${step.title}] ${message}`,
      type: type || 'comment'
    });
    
    job.updatedAt = new Date().toISOString();
    
    await job.save();
    sse.notifyClients('JOB_UPDATED', job);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/jobs/:id
const deleteJob = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Job.findOneAndDelete({ id });
    if (!deleted) {
      return res.status(404).json({ error: "Job not found" });
    }
    sse.notifyClients('JOB_DELETED', { id });
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jobs/:id/steps
const addStep = async (req, res) => {
  const { id } = req.params;
  const { title, description, username } = req.body;
  
  if (!title || !username) {
    return res.status(400).json({ error: "Missing title or username" });
  }
  
  try {
    const job = await Job.findOne({ id });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    const newStep = {
      id: `step-${Date.now()}`,
      title,
      description: description || "",
      status: "pending",
      completedAt: null,
      completedBy: null,
      errorMsg: null,
      logs: []
    };
    
    job.steps.push(newStep);
    
    // Add log to job timeline
    job.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: username,
      message: `Đã thêm bước mới: "${title}"`,
      type: "info"
    });
    
    // Recalculate Job Status
    const oldJobStatus = job.status;
    job.status = recalculateJobStatus(job.steps);
    job.updatedAt = new Date().toISOString();
    
    if (oldJobStatus !== job.status) {
      job.timeline.push({
        id: `tl-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        author: "Hệ thống",
        message: `Trạng thái công việc chuyển sang "${job.status}"`,
        type: "system"
      });
    }
    
    await job.save();
    sse.notifyClients('JOB_UPDATED', job);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/jobs/:id/steps/:stepId
const deleteStep = async (req, res) => {
  const { id, stepId } = req.params;
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: "Missing username query parameter" });
  }
  
  try {
    const job = await Job.findOne({ id });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    const stepIdx = job.steps.findIndex(s => s.id === stepId);
    if (stepIdx === -1) {
      return res.status(404).json({ error: "Step not found" });
    }
    
    const step = job.steps[stepIdx];
    job.steps.splice(stepIdx, 1);
    
    // Add log to job timeline
    job.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: username,
      message: `Đã xóa bước: "${step.title}"`,
      type: "info"
    });
    
    // Recalculate Job Status
    const oldJobStatus = job.status;
    job.status = recalculateJobStatus(job.steps);
    job.updatedAt = new Date().toISOString();
    
    if (oldJobStatus !== job.status) {
      job.timeline.push({
        id: `tl-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        author: "Hệ thống",
        message: `Trạng thái công việc chuyển sang "${job.status}"`,
        type: "system"
      });
    }
    
    await job.save();
    sse.notifyClients('JOB_UPDATED', job);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getJobs,
  createJob,
  getJobDetail,
  updateStepStatus,
  addStepLog,
  deleteJob,
  addStep,
  deleteStep
};
