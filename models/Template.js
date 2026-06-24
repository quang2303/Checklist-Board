const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  steps: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" }
  }]
}, { timestamps: true });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
