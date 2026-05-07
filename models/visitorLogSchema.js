const mongoose = require('mongoose');

const visitorLogSchema = new mongoose.Schema({
  date:      { type: String, required: true }, // 'YYYY-MM-DD' KST
  visitorId: { type: String, required: true }, // 쿠키 기반 UUID
}, { timestamps: false });

visitorLogSchema.index({ date: 1, visitorId: 1 }, { unique: true });

mongoose.model('visitorlogs', visitorLogSchema);
