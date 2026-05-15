import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String,
    unique: true,
    default: () => `ff_${uuidv4().replace(/-/g, '')}`
  }
}, {
  timestamps: true
});

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
