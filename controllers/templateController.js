const Template = require('../models/Template');
const sse = require('../utils/sse');

// GET /api/templates
const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find({});
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/templates
const createTemplate = async (req, res) => {
  const { title, description, steps } = req.body;
  if (!title || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: "Missing title or steps array" });
  }
  
  try {
    const newTemplate = new Template({
      id: `temp-${Date.now()}`,
      title,
      description: description || "",
      steps: steps.map((s, idx) => ({
        id: `step-${idx + 1}-${Date.now()}`,
        title: s.title,
        description: s.description || ""
      }))
    });
    
    await newTemplate.save();
    sse.notifyClients('TEMPLATE_CREATED', newTemplate);
    res.status(201).json(newTemplate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/templates/:id
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { title, description, steps } = req.body;
  if (!title || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: "Missing title or steps array" });
  }
  
  try {
    const template = await Template.findOne({ id });
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    template.title = title;
    template.description = description || "";
    template.steps = steps.map((s, idx) => ({
      id: s.id || `step-${idx + 1}-${Date.now()}`,
      title: s.title,
      description: s.description || ""
    }));
    
    await template.save();
    sse.notifyClients('TEMPLATE_UPDATED', template);
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/templates/:id
const deleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Template.findOneAndDelete({ id });
    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }
    sse.notifyClients('TEMPLATE_DELETED', { id });
    res.json({ message: "Template deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
