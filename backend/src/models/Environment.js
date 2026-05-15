import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const environmentSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  secretKey: {
    type: String,
    unique: true,
    default: () => `fs_${uuidv4().replace(/-/g, '')}${Math.random().toString(36).substring(2, 8)}`
  }
}, {
  timestamps: true
});

environmentSchema.index({ projectId: 1, name: 1 });

const Environment = mongoose.model('Environment', environmentSchema);
export default Environment;
