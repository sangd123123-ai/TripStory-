const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  location: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  content: { type: String, default: '' },
  hashtags: [{ type: String }],
  proofImage: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
    index: true,
  },
  rejectionReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
});

approvalSchema.index({ status: 1, createdAt: -1 });

mongoose.model('approvaldbs', approvalSchema);
