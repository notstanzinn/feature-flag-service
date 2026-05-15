import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

projectSchema.index({ orgId: 1, name: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
