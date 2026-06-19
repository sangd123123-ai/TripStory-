const mongoose = require('mongoose');

const imageSchema = mongoose.Schema({
  originalFileName: { type: String },
  saveFileName: { type: String },
  path: { type: String },
});

mongoose.model('imagedbs', imageSchema);
