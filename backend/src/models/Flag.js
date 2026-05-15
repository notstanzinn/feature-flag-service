import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema({
  attribute: {
    type: String,
    required: true
  },
  operator: {
    type: String,
    enum: ['equals', 'notEquals', 'contains', 'endsWith', 'startsWith', 'in'],
    required: true
  },
  value: {
    type: String,
    required: true
  }
}, { _id: false });

const ruleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['targeting', 'percentage'],
    required: true
  },
  conditions: [conditionSchema],
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  variation: {
    type: mongoose.Schema.Types.Mixed,
    default: true
  }
}, { _id: true });

const flagSchema = new mongoose.Schema({
  envId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Environment',
    required: true
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    enum: ['boolean', 'string', 'number', 'json'],
    default: 'boolean'
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    default: false
  },
  variations: {
    type: mongoose.Schema.Types.Mixed,
    default: { enabled: true, disabled: false }
  },
  rules: [ruleSchema],
  rolloutPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  }
}, {
  timestamps: true
});

flagSchema.index({ envId: 1, key: 1 }, { unique: true });

const Flag = mongoose.model('Flag', flagSchema);
export default Flag;
