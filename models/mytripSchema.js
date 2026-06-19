const mongoose = require('mongoose');

const mytripSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  location: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  content: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  hashtags: [{ type: String }],
});

mongoose.model('mytripdbs', mytripSchema);
