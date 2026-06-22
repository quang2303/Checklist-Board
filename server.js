const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed helper
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      templates: [
        {
          id: "temp-deploy",
          title: "Quy trình Triển khai Production",
          description: "Checklist các bước deploy hệ thống lên server production, đảm bảo an toàn và không downtime.",
          steps: [
            { id: "step-1", title: "Backup Database", description: "Chạy backup database hiện tại và lưu vào thư mục dự phòng." },
            { id: "step-2", title: "Pull code mới", description: "Pull code mới nhất từ nhánh release/main trên repo." },
            { id: "step-3", title: "Cài đặt dependencies", description: "Chạy npm install hoặc pip install để cập nhật thư viện." },
            { id: "step-4", title: "Chạy Migrations", description: "Áp dụng các thay đổi database schema mới." },
            { id: "step-5", title: "Build Assets", description: "Build frontend assets (CSS, JS) cho bản release mới." },
            { id: "step-6", title: "Restart Services", description: "Restart app service (PM2, systemd, Docker container)." },
            { id: "step-7", title: "Kiểm tra khói (Smoke Test)", description: "Truy cập các API chính để kiểm tra hệ thống hoạt động ổn định." }
          ]
        },
        {
          id: "temp-video",
          title: "Quy trình Lồng tiếng & Làm Video",
          description: "Checklist từng bước từ khi nhận yêu cầu dịch/lồng tiếng cho đến khi render video thành phẩm.",
          steps: [
            { id: "step-1", title: "Dịch tài liệu / Lên Kịch bản", description: "Dịch nội dung từ video nguồn hoặc viết kịch bản tiếng Việt." },
            { id: "step-2", title: "Tạo giọng đọc (TTS)", description: "Dùng dịch vụ TTS tạo file âm thanh lồng tiếng từ kịch bản." },
            { id: "step-3", title: "Tạo phụ đề (Subtitles)", description: "Tạo và căn chỉnh thời gian file SRT/ASS trùng khớp với âm thanh." },
            { id: "step-4", title: "Mix âm thanh", description: "Lọc nhiễu âm thanh giọng đọc, chèn nhạc nền nhẹ, cân bằng âm lượng." },
            { id: "step-5", title: "Render video", description: "Ghép âm thanh lồng tiếng, phụ đề cứng (burn-in) vào video gốc và render." },
            { id: "step-6", title: "Review chất lượng", description: "Xem lại video cuối cùng kiểm tra lệch tiếng, sai chính tả phụ đề." }
          ]
        }
      ],
      jobs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting to empty", err);
    return { templates: [], jobs: [] };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// SSE clients list
let sseClients = [];

// Send update notification to all clients
function notifyClients(type, payload) {
  const message = `event: update\ndata: ${JSON.stringify({ type, payload })}\n\n`;
  sseClients.forEach(client => {
    client.res.write(message);
  });
}

// Recalculate job status based on step statuses
function recalculateJobStatus(steps) {
  if (steps.length === 0) return 'pending';
  
  const hasFailed = steps.some(s => s.status === 'failed');
  if (hasFailed) return 'failed';
  
  const allCompleted = steps.every(s => s.status === 'completed');
  if (allCompleted) return 'completed';
  
  const hasCompleted = steps.some(s => s.status === 'completed' || s.status === 'failed');
  if (hasCompleted) return 'in_progress';
  
  return 'pending';
}

// Real-time notification SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);
  
  // Keep connection alive with a ping every 30 seconds
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

// GET templates
app.get('/api/templates', (req, res) => {
  const db = loadDB();
  res.json(db.templates);
});

// POST template
app.post('/api/templates', (req, res) => {
  const { title, description, steps } = req.body;
  if (!title || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: "Missing title or steps array" });
  }
  
  const db = loadDB();
  const newTemplate = {
    id: `temp-${Date.now()}`,
    title,
    description: description || "",
    steps: steps.map((s, idx) => ({
      id: `step-${idx + 1}-${Date.now()}`,
      title: s.title,
      description: s.description || ""
    }))
  };
  
  db.templates.push(newTemplate);
  saveDB(db);
  
  notifyClients('TEMPLATE_CREATED', newTemplate);
  res.status(201).json(newTemplate);
});

// DELETE template
app.delete('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const initialLength = db.templates.length;
  db.templates = db.templates.filter(t => t.id !== id);
  
  if (db.templates.length === initialLength) {
    return res.status(404).json({ error: "Template not found" });
  }
  
  saveDB(db);
  notifyClients('TEMPLATE_DELETED', { id });
  res.json({ message: "Template deleted successfully" });
});

// GET jobs
app.get('/api/jobs', (req, res) => {
  const db = loadDB();
  res.json(db.jobs);
});

// POST job (Start from template)
app.post('/api/jobs', (req, res) => {
  const { templateId, title, description, createdBy } = req.body;
  if (!createdBy) {
    return res.status(400).json({ error: "Missing createdBy" });
  }
  
  const db = loadDB();
  let steps = [];
  let templateTitle = "Checklist tùy chỉnh";
  let jobTitle = title || "Checklist tùy chỉnh";
  let jobDescription = description || "Checklist tự định nghĩa không dùng mẫu";

  if (templateId && templateId !== 'custom') {
    const template = db.templates.find(t => t.id === templateId);
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
  
  const newJob = {
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
  };
  
  db.jobs.push(newJob);
  saveDB(db);
  
  notifyClients('JOB_CREATED', newJob);
  res.status(201).json(newJob);
});

// GET job detail
app.get('/api/jobs/:id', (req, res) => {
  const db = loadDB();
  const job = db.jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

// PATCH step status
app.patch('/api/jobs/:id/steps/:stepId', (req, res) => {
  const { id, stepId } = req.params;
  const { status, username, errorMsg } = req.body;
  
  if (!status || !username) {
    return res.status(400).json({ error: "Missing status or username" });
  }
  
  const db = loadDB();
  const jobIdx = db.jobs.findIndex(j => j.id === id);
  if (jobIdx === -1) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  const job = db.jobs[jobIdx];
  const step = job.steps.find(s => s.id === stepId);
  if (!step) {
    return res.status(404).json({ error: "Step not found" });
  }
  
  const oldStatus = step.status;
  step.status = status;
  step.updatedAt = new Date().toISOString();
  
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
  
  saveDB(db);
  notifyClients('JOB_UPDATED', job);
  res.json(job);
});

// POST step log (add comment / troubleshoot note)
app.post('/api/jobs/:id/steps/:stepId/logs', (req, res) => {
  const { id, stepId } = req.params;
  const { author, message, type } = req.body;
  
  if (!author || !message) {
    return res.status(400).json({ error: "Missing author or message" });
  }
  
  const db = loadDB();
  const jobIdx = db.jobs.findIndex(j => j.id === id);
  if (jobIdx === -1) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  const job = db.jobs[jobIdx];
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
  
  saveDB(db);
  notifyClients('JOB_UPDATED', job);
  res.json(job);
});

// DELETE job (or Archive)
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const initialLength = db.jobs.length;
  db.jobs = db.jobs.filter(j => j.id !== id);
  
  if (db.jobs.length === initialLength) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  saveDB(db);
  notifyClients('JOB_DELETED', { id });
  res.json({ message: "Job deleted successfully" });
});

// POST add a new step to a job
app.post('/api/jobs/:id/steps', (req, res) => {
  const { id } = req.params;
  const { title, description, username } = req.body;
  
  if (!title || !username) {
    return res.status(400).json({ error: "Missing title or username" });
  }
  
  const db = loadDB();
  const jobIdx = db.jobs.findIndex(j => j.id === id);
  if (jobIdx === -1) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  const job = db.jobs[jobIdx];
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
  
  saveDB(db);
  notifyClients('JOB_UPDATED', job);
  res.status(201).json(job);
});

// DELETE a step from a job
app.delete('/api/jobs/:id/steps/:stepId', (req, res) => {
  const { id, stepId } = req.params;
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: "Missing username query parameter" });
  }
  
  const db = loadDB();
  const jobIdx = db.jobs.findIndex(j => j.id === id);
  if (jobIdx === -1) {
    return res.status(404).json({ error: "Job not found" });
  }
  
  const job = db.jobs[jobIdx];
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
  
  saveDB(db);
  notifyClients('JOB_UPDATED', job);
  res.json(job);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access locally: http://localhost:${PORT}`);
  console.log(`Or share with your team: http://<YOUR_IP>:${PORT}`);
});
