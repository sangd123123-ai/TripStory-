const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  url: { type: String, default: '' },
  x: { type: String, default: '' },
  y: { type: String, default: '' },
  region: { type: String, required: true },
  image_url: { type: String, default: '' },
  description: { type: String, required: false },
  source: { type: String, default: 'Kakao' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('tripdbs', tripSchema);
