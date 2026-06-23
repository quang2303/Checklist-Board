// App State
const state = {
  jobs: [],
  templates: [],
  selectedJobId: null,
  activeTab: 'jobs', // 'jobs' | 'templates'
  currentUsername: 'Đồng nghiệp 1'
};

// DOM Elements
const elements = {
  themeToggle: document.getElementById('theme-toggle'),
  themeSunIcon: document.getElementById('theme-sun-icon'),
  currentUsernameInput: document.getElementById('current-username'),
  
  // Sidebar Tabs
  tabJobs: document.getElementById('tab-jobs'),
  tabTemplates: document.getElementById('tab-templates'),
  panelJobs: document.getElementById('panel-jobs'),
  panelTemplates: document.getElementById('panel-templates'),
  templatesListInner: document.getElementById('templates-list-inner'),
  
  // Modals Buttons & Forms
  btnOpenStartJob: document.getElementById('btn-open-start-job'),
  btnOpenCreateTemplate: document.getElementById('btn-open-create-template'),
  
  // Modals Overlay Elements
  modalStartJob: document.getElementById('modal-start-job'),
  modalCreateTemplate: document.getElementById('modal-create-template'),
  modalReportError: document.getElementById('modal-report-error'),
  
  // Forms
  formStartJob: document.getElementById('form-start-job'),
  formCreateTemplate: document.getElementById('form-create-template'),
  formReportError: document.getElementById('form-report-error'),
  
  // Template Builder Dynamic Steps
  templateStepsInputsContainer: document.getElementById('template-steps-inputs-container'),
  btnAddTemplateStep: document.getElementById('btn-add-template-step'),
  
  // Main Workspace Details
  mainWorkspace: document.getElementById('main-workspace'),
  workspaceEmptyState: document.getElementById('workspace-empty-state'),
  workspaceJobDetail: document.getElementById('workspace-job-detail'),
  jobTitleDisplay: document.getElementById('job-title-display'),
  jobStatusBadge: document.getElementById('job-status-badge'),
  jobCreatorDisplay: document.getElementById('job-creator-display'),
  jobTimeDisplay: document.getElementById('job-time-display'),
  jobProgressBar: document.getElementById('job-progress-bar'),
  jobProgressPercent: document.getElementById('job-progress-percent'),
  jobStepsList: document.getElementById('job-steps-list'),
  btnDeleteJob: document.getElementById('btn-delete-job'),
  
  // Timeline Panel (Right)
  timelinePanel: document.getElementById('timeline-panel'),
  jobTimelineList: document.getElementById('job-timeline-list')
};

// SVG Icons
const SVG_ICONS = {
  check: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>`
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  setupUsername();
  setupEventListeners();
  
  showLoading('Đang tải dữ liệu...');
  // Load templates & jobs from REST API
  await Promise.all([
    fetchTemplates(),
    fetchJobs()
  ]);
  hideLoading();
  
  renderJobsList();
  renderTemplatesList();
  
  // Connect to SSE for real-time synchronization
  setupSSE();
});

// Theme Setup
function setupTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  elements.themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  if (theme === 'light') {
    elements.themeSunIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  } else {
    elements.themeSunIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  }
}

// Username Setup
function setupUsername() {
  const savedName = localStorage.getItem('username');
  if (savedName) {
    state.currentUsername = savedName;
    elements.currentUsernameInput.value = savedName;
  }
  
  elements.currentUsernameInput.addEventListener('change', (e) => {
    let name = e.target.value.trim();
    if (!name) name = 'Đồng nghiệp 1';
    state.currentUsername = name;
    localStorage.setItem('username', name);
  });
}

// Setup SSE for Syncing
function setupSSE() {
  const eventSource = new EventSource('/api/events');
  const syncIndicator = document.getElementById('sync-status');
  
  eventSource.addEventListener('update', (e) => {
    try {
      const { type, payload } = JSON.parse(e.data);
      console.log('SSE Update:', type, payload);
      
      switch(type) {
        case 'JOB_CREATED':
          state.jobs.push(payload);
          renderJobsList();
          break;
          
        case 'JOB_UPDATED':
          const jobIdx = state.jobs.findIndex(j => j.id === payload.id);
          if (jobIdx !== -1) {
            state.jobs[jobIdx] = payload;
          } else {
            state.jobs.push(payload);
          }
          renderJobsList();
          
          if (state.selectedJobId === payload.id) {
            renderJobDetail(payload.id);
          }
          break;
          
        case 'JOB_DELETED':
          state.jobs = state.jobs.filter(j => j.id !== payload.id);
          renderJobsList();
          if (state.selectedJobId === payload.id) {
            state.selectedJobId = null;
            elements.workspaceJobDetail.style.display = 'none';
            elements.timelinePanel.style.display = 'none';
            elements.workspaceEmptyState.style.display = 'flex';
          }
          break;
          
        case 'TEMPLATE_CREATED':
          state.templates.push(payload);
          renderTemplatesList();
          updateTemplateDropdowns();
          break;
          
        case 'TEMPLATE_DELETED':
          state.templates = state.templates.filter(t => t.id !== payload.id);
          renderTemplatesList();
          updateTemplateDropdowns();
          break;
      }
    } catch(err) {
      console.error('Error handling SSE message', err);
    }
  });
  
  eventSource.onopen = () => {
    if (syncIndicator) {
      syncIndicator.className = 'text-success';
      syncIndicator.innerText = '● Đồng bộ trực tuyến';
    }
  };
  
  eventSource.onerror = () => {
    if (syncIndicator) {
      syncIndicator.className = 'text-error';
      syncIndicator.innerText = '● Mất kết nối - Đang kết nối lại...';
    }
  };
}

// API REST Calls
async function fetchTemplates() {
  try {
    const res = await fetch('/api/templates');
    state.templates = await res.json();
  } catch(err) {
    console.error('Error fetching templates:', err);
  }
}

async function fetchJobs() {
  try {
    const res = await fetch('/api/jobs');
    state.jobs = await res.json();
  } catch(err) {
    console.error('Error fetching jobs:', err);
  }
}

// Setup Event Handlers
function setupEventListeners() {
  // Sidebar Tabs Toggling
  elements.tabJobs.addEventListener('click', () => switchTab('jobs'));
  elements.tabTemplates.addEventListener('click', () => switchTab('templates'));
  
  // Modal toggling actions
  elements.btnOpenStartJob.addEventListener('click', () => {
    updateTemplateDropdowns();
    openModal(elements.modalStartJob);
  });
  elements.btnOpenCreateTemplate.addEventListener('click', () => {
    openModal(elements.modalCreateTemplate);
  });
  
  // Close Modals
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });
  
  // Add step button in Template Builder Modal
  elements.btnAddTemplateStep.addEventListener('click', () => {
    addTemplateStepInputRow();
  });
  
  // Dynamic delete template step row
  elements.templateStepsInputsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete-row')) {
      const rows = elements.templateStepsInputsContainer.querySelectorAll('.template-step-row');
      if (rows.length > 1) {
        e.target.closest('.template-step-row').remove();
      } else {
        alert('Phải có ít nhất một bước thực hiện!');
      }
    }
  });
  
  // Submit Form: Start Job
  elements.formStartJob.addEventListener('submit', async (e) => {
    e.preventDefault();
    const templateId = document.getElementById('start-job-template-select').value;
    const title = document.getElementById('start-job-title').value.trim();
    const description = document.getElementById('start-job-desc').value.trim();
    
    showLoading('Đang khởi tạo checklist...');
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          title: title || undefined,
          description: description || undefined,
          createdBy: state.currentUsername
        })
      });
      
      if (response.ok) {
        const newJob = await response.json();
        closeAllModals();
        elements.formStartJob.reset();
        selectJob(newJob.id);
      } else {
        alert('Tạo công việc thất bại!');
      }
    } catch(err) {
      console.error(err);
    } finally {
      hideLoading();
    }
  });
  
  // Submit Form: Create Template
  elements.formCreateTemplate.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('template-title').value.trim();
    const description = document.getElementById('template-desc').value.trim();
    
    const stepRows = elements.templateStepsInputsContainer.querySelectorAll('.template-step-row');
    const steps = Array.from(stepRows).map(row => {
      return {
        title: row.querySelector('.template-step-title-input').value.trim(),
        description: row.querySelector('.template-step-desc-input').value.trim()
      };
    });
    
    showLoading('Đang lưu mẫu checklist...');
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, steps })
      });
      
      if (response.ok) {
        closeAllModals();
        elements.formCreateTemplate.reset();
        // Reset dynamic steps to single empty row
        elements.templateStepsInputsContainer.innerHTML = `
          <div class="template-step-row">
            <div class="template-step-inputs">
              <input type="text" class="template-step-title-input" required placeholder="Tên bước (Ví dụ: Kiểm tra kết nối database)">
              <input type="text" class="template-step-desc-input" placeholder="Mô tả chi tiết bước thực hiện (Không bắt buộc)">
            </div>
            <button type="button" class="btn-delete-row">&times;</button>
          </div>
        `;
        switchTab('templates');
      } else {
        alert('Tạo mẫu thất bại!');
      }
    } catch(err) {
      console.error(err);
    } finally {
      hideLoading();
    }
  });
  
  // Submit Form: Report Error
  elements.formReportError.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobId = document.getElementById('report-error-job-id').value;
    const stepId = document.getElementById('report-error-step-id').value;
    const errorMsg = document.getElementById('report-error-message').value.trim();
    
    showLoading('Đang báo cáo sự cố...');
    try {
      const response = await fetch(`/api/jobs/${jobId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'failed',
          username: state.currentUsername,
          errorMsg
        })
      });
      
      if (response.ok) {
        closeAllModals();
        elements.formReportError.reset();
      } else {
        alert('Báo lỗi thất bại!');
      }
    } catch(err) {
      console.error(err);
    } finally {
      hideLoading();
    }
  });
  
  // Delete active Job
  elements.btnDeleteJob.addEventListener('click', async () => {
    if (!state.selectedJobId) return;
    if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn công việc này không? Nhật ký rà soát lỗi cũng sẽ bị xóa.')) {
      showLoading('Đang xóa công việc...');
      try {
        const response = await fetch(`/api/jobs/${state.selectedJobId}`, { method: 'DELETE' });
        if (!response.ok) alert('Xóa công việc thất bại');
      } catch(err) {
        console.error(err);
      } finally {
        hideLoading();
      }
    }
  });
  
  // Add custom step form toggles
  const btnShowAddStep = document.getElementById('btn-show-add-step');
  const btnCancelAddStep = document.getElementById('btn-cancel-add-step');
  const formAddCustomStep = document.getElementById('form-add-custom-step');
  
  if (btnShowAddStep && btnCancelAddStep && formAddCustomStep) {
    btnShowAddStep.addEventListener('click', () => {
      btnShowAddStep.style.display = 'none';
      formAddCustomStep.style.display = 'flex';
      document.getElementById('custom-step-title').focus();
    });
    
    btnCancelAddStep.addEventListener('click', () => {
      formAddCustomStep.reset();
      formAddCustomStep.style.display = 'none';
      btnShowAddStep.style.display = 'block';
    });
    
    formAddCustomStep.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.selectedJobId) return;
      
      const title = document.getElementById('custom-step-title').value.trim();
      const description = document.getElementById('custom-step-desc').value.trim();
      
      showLoading('Đang thêm bước mới...');
      try {
        const response = await fetch(`/api/jobs/${state.selectedJobId}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            username: state.currentUsername
          })
        });
        
        if (response.ok) {
          formAddCustomStep.reset();
          formAddCustomStep.style.display = 'none';
          btnShowAddStep.style.display = 'block';
        } else {
          alert('Không thể thêm bước mới!');
        }
      } catch(err) {
        console.error(err);
      } finally {
        hideLoading();
      }
    });
  }

  // Open Export Minutes Modal
  const btnOpenExportMinutes = document.getElementById('btn-open-export-minutes');
  if (btnOpenExportMinutes) {
    btnOpenExportMinutes.addEventListener('click', () => {
      openExportMinutesModal();
    });
  }
  
  // Form Submit: Export Minutes
  const formExportMinutes = document.getElementById('form-export-minutes');
  if (formExportMinutes) {
    formExportMinutes.addEventListener('submit', (e) => {
      exportMinutesToPDF(e);
    });
  }
}

// Switch Side Panel Tab
function switchTab(tab) {
  state.activeTab = tab;
  if (tab === 'jobs') {
    elements.tabJobs.classList.add('active');
    elements.tabTemplates.classList.remove('active');
    elements.panelJobs.style.display = 'flex';
    elements.panelTemplates.style.display = 'none';
  } else {
    elements.tabJobs.classList.remove('active');
    elements.tabTemplates.classList.add('active');
    elements.panelJobs.style.display = 'none';
    elements.panelTemplates.style.display = 'flex';
  }
}

// Manage Modals
function openModal(modal) {
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
  });
}

// Add row to template step builders
function addTemplateStepInputRow() {
  const rowDiv = document.createElement('div');
  rowDiv.className = 'template-step-row';
  rowDiv.innerHTML = `
    <div class="template-step-inputs">
      <input type="text" class="template-step-title-input" required placeholder="Tên bước mới">
      <input type="text" class="template-step-desc-input" placeholder="Mô tả chi tiết bước thực hiện">
    </div>
    <button type="button" class="btn-delete-row">&times;</button>
  `;
  elements.templateStepsInputsContainer.appendChild(rowDiv);
}

// Update Template dropdown select inside Start Job Modal
function updateTemplateDropdowns() {
  const select = document.getElementById('start-job-template-select');
  select.innerHTML = '';
  
  // Custom checklist option is always available
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = '-- Tạo checklist trống (Không dùng mẫu) --';
  select.appendChild(customOpt);
  
  state.templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
}

// Select a job
function selectJob(jobId) {
  state.selectedJobId = jobId;
  renderJobsList();
  renderJobDetail(jobId);
}

// Render Jobs Card lists in Sidebar
function renderJobsList() {
  elements.panelJobs.innerHTML = '';
  
  if (state.jobs.length === 0) {
    elements.panelJobs.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; margin-top: 30px; font-size: 0.9rem;">
        Chưa có công việc nào đang chạy.<br>Bấm <strong>+ Việc Mới</strong> để tạo!
      </div>
    `;
    return;
  }
  
  // Sort by updatedAt descending
  const sortedJobs = [...state.jobs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  sortedJobs.forEach(job => {
    const totalSteps = job.steps.length;
    const completedSteps = job.steps.filter(s => s.status === 'completed').length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    // Status text mapping
    let statusText = 'Chờ';
    if (job.status === 'in_progress') statusText = 'Chạy';
    if (job.status === 'completed') statusText = 'Xong';
    if (job.status === 'failed') statusText = 'Lỗi';
    
    const card = document.createElement('div');
    card.className = `job-card ${state.selectedJobId === job.id ? 'active' : ''}`;
    card.innerHTML = `
      <div class="card-title-row">
        <span class="card-title">${escapeHtml(job.title)}</span>
        <span class="badge badge-${job.status}">${statusText}</span>
      </div>
      <p class="card-desc">${escapeHtml(job.description || 'Không có mô tả')}</p>
      <div class="job-progress-wrapper">
        <div class="mini-progress-bar-container">
          <div class="mini-progress-bar-fill" style="width: ${progressPercent}%; background-color: ${job.status === 'failed' ? 'var(--error)' : 'var(--primary)'}"></div>
        </div>
        <span>${completedSteps}/${totalSteps}</span>
      </div>
    `;
    
    card.addEventListener('click', () => selectJob(job.id));
    elements.panelJobs.appendChild(card);
  });
}

// Render Templates in Sidebar
function renderTemplatesList() {
  elements.templatesListInner.innerHTML = '';
  
  if (state.templates.length === 0) {
    elements.templatesListInner.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; margin-top: 30px; font-size: 0.9rem;">
        Chưa có mẫu nào.<br>Bấm <strong>Tạo Mẫu Mới</strong> để tạo!
      </div>
    `;
    return;
  }
  
  state.templates.forEach(t => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="card-title-row">
        <span class="card-title">${escapeHtml(t.title)}</span>
        <button class="btn-action btn-delete-template" style="width: 26px; height: 26px; border-radius: var(--radius-sm);" title="Xóa mẫu này">&times;</button>
      </div>
      <p class="card-desc" style="margin-bottom: 0;">${escapeHtml(t.description || 'Không có mô tả')}</p>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-weight: 600;">
        Tổng số bước: ${t.steps.length}
      </div>
    `;
    
    // Bind template delete
    card.querySelector('.btn-delete-template').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Bạn có muốn xóa mẫu "${t.title}" không?`)) {
        showLoading('Đang xóa mẫu...');
        try {
          const res = await fetch(`/api/templates/${t.id}`, { method: 'DELETE' });
          if (!res.ok) alert('Xóa mẫu thất bại!');
        } catch(err) {
          console.error(err);
        } finally {
          hideLoading();
        }
      }
    });
    
    // Bind template card click -> open start job modal with this selected
    card.addEventListener('click', () => {
      updateTemplateDropdowns();
      document.getElementById('start-job-template-select').value = t.id;
      openModal(elements.modalStartJob);
    });
    
    elements.templatesListInner.appendChild(card);
  });
}

// Render Job Details Workspace
function renderJobDetail(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  
  // Hide empty state, show details
  elements.workspaceEmptyState.style.display = 'none';
  elements.workspaceJobDetail.style.display = 'flex';
  elements.timelinePanel.style.display = 'flex';
  
  // Update header text details
  elements.jobTitleDisplay.textContent = job.title;
  elements.jobCreatorDisplay.innerHTML = `<strong>Tạo bởi:</strong> ${escapeHtml(job.createdBy)}`;
  
  const createdDate = new Date(job.createdAt);
  const timeStr = `${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')} - ${String(createdDate.getDate()).padStart(2, '0')}/${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
  elements.jobTimeDisplay.innerHTML = `<strong>Lúc:</strong> ${timeStr}`;
  
  // Status Badge
  let badgeText = 'Đang chờ';
  if (job.status === 'in_progress') badgeText = 'Đang chạy';
  if (job.status === 'completed') badgeText = 'Đã hoàn thành';
  if (job.status === 'failed') badgeText = 'Gặp sự cố';
  
  elements.jobStatusBadge.className = `badge badge-${job.status}`;
  elements.jobStatusBadge.textContent = badgeText;
  
  // Progress Bar
  const totalSteps = job.steps.length;
  const completedSteps = job.steps.filter(s => s.status === 'completed').length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  elements.jobProgressBar.style.width = `${progressPercent}%`;
  if (job.status === 'failed') {
    elements.jobProgressBar.style.background = 'var(--error)';
  } else {
    elements.jobProgressBar.style.background = 'linear-gradient(90deg, var(--primary), #8b5cf6, var(--success))';
  }
  elements.jobProgressPercent.textContent = `${progressPercent}% (${completedSteps}/${totalSteps})`;
  
  // Steps Render
  renderSteps(job);
  
  // Timeline Render
  renderTimeline(job.timeline);
}

// Render Step Cards in Workspace
function renderSteps(job) {
  elements.jobStepsList.innerHTML = '';
  
  if (job.steps.length === 0) {
    elements.jobStepsList.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; padding: 40px 20px; font-size: 0.95rem; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        Checklist này chưa có bước nào.<br>Bấm nút bên dưới để thêm bước mới!
      </div>
    `;
    const btnShowAddStep = document.getElementById('btn-show-add-step');
    const formAddCustomStep = document.getElementById('form-add-custom-step');
    if (btnShowAddStep && formAddCustomStep) {
      btnShowAddStep.style.display = 'block';
      formAddCustomStep.style.display = 'none';
    }
    return;
  }
  
  job.steps.forEach((step, idx) => {
    const stepCard = document.createElement('div');
    stepCard.className = `step-item status-${step.status}`;
    stepCard.id = `step-card-${step.id}`;
    
    // Status text mapping
    let stepBadge = '';
    if (step.status === 'completed') {
      stepBadge = `<span class="badge badge-completed">Xong</span>`;
    } else if (step.status === 'failed') {
      stepBadge = `<span class="badge badge-failed pulse-warn">Lỗi</span>`;
    } else {
      stepBadge = `<span class="badge badge-pending">Chờ</span>`;
    }
    
    const assigneeHtml = step.completedBy 
      ? `<span class="step-assignee">Người làm: ${escapeHtml(step.completedBy)}</span>` 
      : '';
      
    // Step Icon
    let stepIcon = SVG_ICONS.clock;
    if (step.status === 'completed') stepIcon = SVG_ICONS.check;
    if (step.status === 'failed') stepIcon = SVG_ICONS.alert;
    
    stepCard.innerHTML = `
      <div class="step-summary">
        <div class="step-checkbox-wrapper">
          <div class="step-checkbox" title="Chuyển trạng thái Xong / Chờ">
            ${stepIcon}
          </div>
        </div>
        <div class="step-info">
          <div class="step-title-row">
            <span class="step-title">${idx + 1}. ${escapeHtml(step.title)}</span>
            ${stepBadge}
          </div>
          <div class="step-teaser">${escapeHtml(step.description ? step.description.substring(0, 70) + (step.description.length > 70 ? '...' : '') : 'Bấm để xem chi tiết')}</div>
        </div>
        <div class="step-badge-area">
          ${assigneeHtml}
          <div class="btn-action btn-expand-step" style="border-radius: 6px; width:28px; height:28px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <button class="btn-action btn-delete-step" style="width: 28px; height: 28px; border-radius: 6px; color: var(--error); border-color: var(--error-border); margin-left: 8px;" title="Xóa bước này">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      
      <div class="step-details">
        <p class="step-description-text">${escapeHtml(step.description || 'Không có mô tả chi tiết cho bước này.')}</p>
        
        <!-- Controls to trigger state changes -->
        <div class="step-controls">
          <button class="btn-secondary btn-step-pending" style="padding: 6px 12px; font-size: 0.8rem;">
            Chuyển Về Chờ
          </button>
          <button class="btn-primary btn-step-complete" style="padding: 6px 12px; font-size: 0.8rem; background: var(--success);">
            Hoàn Thành Bước
          </button>
          <button class="btn-danger btn-step-failed" style="padding: 6px 12px; font-size: 0.8rem;">
            Báo Cáo Bị Lỗi
          </button>
        </div>
        
        <!-- Comments logs list -->
        <div class="step-logs-section">
          <h4>Trao đổi & Khắc phục sự cố</h4>
          <div class="step-comments-list">
            <!-- Dynamic comments -->
          </div>
          
          <form class="comment-input-form">
            <input type="text" placeholder="Nhập ghi chú, mã lỗi hoặc kết quả rà soát..." required>
            <button type="submit" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">Gửi</button>
          </form>
        </div>
      </div>
    `;
    
    // Setup expandable action
    stepCard.querySelector('.step-summary').addEventListener('click', (e) => {
      // Don't expand if user clicked check box itself
      if (e.target.closest('.step-checkbox-wrapper')) return;
      stepCard.classList.toggle('expanded');
    });
    
    // Bind fast checkbox toggle
    stepCard.querySelector('.step-checkbox').addEventListener('click', async (e) => {
      e.stopPropagation();
      const targetStatus = step.status === 'completed' ? 'pending' : 'completed';
      await updateStep(job.id, step.id, targetStatus);
    });
    
    // Bind detailed controls
    stepCard.querySelector('.btn-step-pending').addEventListener('click', () => updateStep(job.id, step.id, 'pending'));
    stepCard.querySelector('.btn-step-complete').addEventListener('click', () => updateStep(job.id, step.id, 'completed'));
    stepCard.querySelector('.btn-step-failed').addEventListener('click', () => {
      // Open modal report error
      document.getElementById('report-error-job-id').value = job.id;
      document.getElementById('report-error-step-id').value = step.id;
      document.getElementById('report-error-step-title').textContent = step.title;
      openModal(elements.modalReportError);
    });
    
    // Bind step delete
    stepCard.querySelector('.btn-delete-step').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Bạn có muốn xóa bước "${step.title}" khỏi checklist này không?`)) {
        showLoading('Đang xóa bước...');
        try {
          const res = await fetch(`/api/jobs/${job.id}/steps/${step.id}?username=${encodeURIComponent(state.currentUsername)}`, {
            method: 'DELETE'
          });
          if (!res.ok) {
            alert('Xóa bước thất bại!');
          }
        } catch(err) {
          console.error(err);
        } finally {
          hideLoading();
        }
      }
    });
    
    // Populate comments
    const commentsList = stepCard.querySelector('.step-comments-list');
    if (step.logs.length === 0) {
      commentsList.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic; margin-bottom: 8px;">Chưa có ghi chú nào.</div>`;
    } else {
      step.logs.forEach(log => {
        const date = new Date(log.timestamp);
        const logTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        let typeBadge = '';
        if (log.type === 'error') typeBadge = ' [LỖI]';
        if (log.type === 'status_change') typeBadge = ' [TT]';
        
        const bubble = document.createElement('div');
        bubble.className = `comment-bubble log-type-${log.type}`;
        bubble.innerHTML = `
          <div class="comment-meta">
            <span class="author">${escapeHtml(log.author)}${typeBadge}</span>
            <span class="time">${logTime}</span>
          </div>
          <p class="comment-text">${escapeHtml(log.message)}</p>
        `;
        commentsList.appendChild(bubble);
      });
      // Scroll to bottom
      commentsList.scrollTop = commentsList.scrollHeight;
    }
    
    // Bind Comment input submit
    stepCard.querySelector('.comment-input-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const msg = input.value.trim();
      if (!msg) return;
      
      showLoading('Đang gửi ghi chú...');
      try {
        const res = await fetch(`/api/jobs/${job.id}/steps/${step.id}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: state.currentUsername,
            message: msg,
            type: 'comment'
          })
        });
        if (res.ok) {
          input.value = '';
        } else {
          alert('Không thể gửi ghi chú!');
        }
      } catch(err) {
        console.error(err);
      } finally {
        hideLoading();
      }
    });
    
    elements.jobStepsList.appendChild(stepCard);
  });
}

// Update Step Status REST API
async function updateStep(jobId, stepId, status) {
  showLoading('Đang cập nhật...');
  try {
    const res = await fetch(`/api/jobs/${jobId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        username: state.currentUsername
      })
    });
    if (!res.ok) {
      alert('Cập nhật bước thất bại!');
    }
  } catch(err) {
    console.error(err);
  } finally {
    hideLoading();
  }
}

// Render Global Job Timeline
function renderTimeline(timeline) {
  elements.jobTimelineList.innerHTML = '';
  
  if (!timeline || timeline.length === 0) {
    elements.jobTimelineList.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Chưa có hoạt động nào.</div>`;
    return;
  }
  
  // Sort timeline latest first
  const sortedTimeline = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  sortedTimeline.forEach(node => {
    const date = new Date(node.timestamp);
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    
    const nodeEl = document.createElement('div');
    nodeEl.className = `timeline-node ${node.type || 'info'}`;
    nodeEl.innerHTML = `
      <div class="timeline-node-time">${timeStr}</div>
      <div class="timeline-node-body">
        <strong>${escapeHtml(node.author)}:</strong> ${escapeHtml(node.message)}
      </div>
    `;
    elements.jobTimelineList.appendChild(nodeEl);
  });
}

// Helper: Escape HTML to avoid script injections
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Show global loading indicator
function showLoading(text = 'Đang xử lý...') {
  const overlay = document.getElementById('loading-overlay');
  const textEl = overlay.querySelector('.loading-text');
  if (textEl) textEl.innerText = text;
  overlay.classList.add('active');
}

// Helper: Hide global loading indicator
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.remove('active');
}

function openExportMinutesModal() {
  const modal = document.getElementById('modal-export-minutes');
  
  // Set Side A default fields
  document.getElementById('minutes-a-rep').value = state.currentUsername || 'Chúng Đức Quang';
  document.getElementById('minutes-a-role').value = 'Nhân viên tư vấn, lắp đặt hệ thống';
  
  // Get today's completed jobs
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const todayCompletedJobs = state.jobs.filter(job => {
    if (job.status !== 'completed') return false;
    const completedDate = new Date(job.updatedAt);
    return completedDate >= startOfToday;
  });
  
  // Populate jobs text
  const jobsTextarea = document.getElementById('minutes-jobs-text');
  
  // Check if there is a selected job right now and it is completed, preselect it or add its completed steps
  if (state.selectedJobId) {
    const activeJob = state.jobs.find(j => j.id === state.selectedJobId);
    if (activeJob && activeJob.status === 'completed') {
      const compSteps = activeJob.steps.filter(s => s.status === 'completed').map(s => s.title);
      if (compSteps.length > 0) {
        jobsTextarea.value = compSteps.join('\n');
      } else {
        jobsTextarea.value = activeJob.title;
      }
    } else {
      if (todayCompletedJobs.length > 0) {
        jobsTextarea.value = todayCompletedJobs.map(job => job.title).join('\n');
      } else {
        jobsTextarea.value = activeJob ? activeJob.title : '';
      }
    }
  } else {
    if (todayCompletedJobs.length > 0) {
      jobsTextarea.value = todayCompletedJobs.map(job => job.title).join('\n');
    } else {
      jobsTextarea.value = 'Chưa có công việc nào hoàn thành hôm nay.\n(Nhập thủ công công việc tại đây...)';
    }
  }
  
  // Pre-populate Side B fields from localStorage
  document.getElementById('minutes-b-name').value = localStorage.getItem('minutes_b_name') || 'Ủy ban nhân dân phường Bình Dương';
  document.getElementById('minutes-b-address').value = localStorage.getItem('minutes_b_address') || '';
  document.getElementById('minutes-b-rep').value = localStorage.getItem('minutes_b_rep') || '';
  document.getElementById('minutes-b-role').value = localStorage.getItem('minutes_b_role') || '';
  document.getElementById('minutes-b-phone').value = localStorage.getItem('minutes_b_phone') || '';
  document.getElementById('minutes-b-feedback').value = '';
  
  // Pre-populate Time & Date
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('minutes-end-time').value = `${hours}:${minutes}`;
  
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  document.getElementById('minutes-end-date').value = `${yyyy}-${mm}-${dd}`;
  
  openModal(modal);
}

async function exportMinutesToPDF(e) {
  e.preventDefault();
  
  // Read form values
  const aRep = document.getElementById('minutes-a-rep').value.trim();
  const aRole = document.getElementById('minutes-a-role').value.trim();
  
  const bName = document.getElementById('minutes-b-name').value.trim();
  const bAddress = document.getElementById('minutes-b-address').value.trim();
  const bRep = document.getElementById('minutes-b-rep').value.trim();
  const bRole = document.getElementById('minutes-b-role').value.trim();
  const bPhone = document.getElementById('minutes-b-phone').value.trim();
  
  const jobsText = document.getElementById('minutes-jobs-text').value.trim();
  const feedback = document.getElementById('minutes-b-feedback').value.trim();
  const endTime = document.getElementById('minutes-end-time').value;
  const endDateStr = document.getElementById('minutes-end-date').value;
  
  // Save Side B details to localStorage for future convenience
  localStorage.setItem('minutes_b_name', bName);
  localStorage.setItem('minutes_b_address', bAddress);
  localStorage.setItem('minutes_b_rep', bRep);
  localStorage.setItem('minutes_b_role', bRole);
  localStorage.setItem('minutes_b_phone', bPhone);
  
  // Parse date
  const dateObj = new Date(endDateStr);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  // Parse time
  const [endHour, endMinute] = endTime.split(':');
  
  // Populate print template elements
  document.getElementById('p-date-day').innerText = day;
  document.getElementById('p-date-month').innerText = month;
  document.getElementById('p-date-year').innerText = year;
  
  document.getElementById('p-a-rep').innerText = aRep || '................................................................';
  document.getElementById('p-a-role').innerText = aRole || '................................................................';
  
  document.getElementById('p-b-name').innerText = bName || '................................................................';
  document.getElementById('p-b-address').innerText = bAddress || '................................................................';
  document.getElementById('p-b-phone').innerText = bPhone || '................................................................';
  document.getElementById('p-b-rep').innerText = bRep || '................................................................';
  document.getElementById('p-b-role').innerText = bRole || '................................................................';
  
  // Parse jobsText into list items
  const jobsListEl = document.getElementById('p-jobs-list');
  jobsListEl.innerHTML = '';
  const jobsLines = jobsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  jobsLines.forEach(line => {
    const li = document.createElement('li');
    li.innerText = line;
    jobsListEl.appendChild(li);
  });
  
  // Feedback
  const feedbackEl = document.getElementById('p-b-feedback');
  if (feedback) {
    feedbackEl.innerText = feedback;
  } else {
    feedbackEl.innerHTML = `<div class="comments-line"></div>` +
                           `<div class="comments-line"></div>` +
                           `<div class="comments-line"></div>` +
                           `<div class="comments-line"></div>`;
  }
  
  document.getElementById('p-end-hour').innerText = endHour;
  document.getElementById('p-end-minute').innerText = endMinute;
  document.getElementById('p-end-day').innerText = day;
  document.getElementById('p-end-month').innerText = month;
  document.getElementById('p-end-year').innerText = year;
  
  // Export PDF using html2pdf.js
  const printElement = document.getElementById('print-minutes-template');
  const opt = {
    margin:       0,
    filename:     `Bien_ban_lam_viec_${day}_${month}_${year}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  showLoading('Đang tạo và tải file PDF...');
  try {
    // Generate and download
    await html2pdf().from(printElement).set(opt).save();
    closeAllModals();
  } catch(err) {
    console.error('Error generating PDF:', err);
    alert('Có lỗi xảy ra khi xuất file PDF: ' + err.toString());
  } finally {
    hideLoading();
  }
}
