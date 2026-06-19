const mongoose = require('mongoose');

const stampSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  location: { type: String, required: true },
  regionCode: { type: String, required: true },
  date: { type: String },
  createdAt: { type: Date, default: Date.now },
});

stampSchema.index({ userId: 1, location: 1 }, { unique: true });

const StampModel = mongoose.model('stampdbs', stampSchema);

module.exports = {
  stampSchema,
  StampModel,
};
