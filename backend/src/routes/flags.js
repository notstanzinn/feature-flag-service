import express from 'express';
import Flag from '../models/Flag.js';
import Environment from '../models/Environment.js';
import Project from '../models/Project.js';
import { protect } from '../middleware/auth.js';
import {
  setFlagCache,
  getAllFlagsCache,
  setAllFlagsCache,
  invalidateEnvCache
} from '../services/redisService.js';
import { emitFlagUpdate } from '../socket/index.js';

const router = express.Router();

const verifyEnvAccess = async (envId, orgId) => {
  const environment = await Environment.findById(envId);
  if (!environment) return null;

  const project = await Project.findOne({ _id: environment.projectId, orgId });
  if (!project) return null;

  return environment;
};

const syncFlagsToRedis = async (envId) => {
  const flags = await Flag.find({ envId });
  const env = await Environment.findById(envId);
  if (env && flags.length > 0) {
    const flagsObj = {};
    flags.forEach((f) => {
      flagsObj[f.key] = f.toObject();
    });
    await setAllFlagsCache(env.secretKey, flagsObj);
  }
  return flags;
};

router.get('/', protect, async (req, res) => {
  try {
    const { envId } = req.query;

    if (!envId) {
      return res.status(400).json({ message: 'Environment ID is required' });
    }

    const environment = await verifyEnvAccess(envId, req.user.orgId);
    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    let cachedFlags = await getAllFlagsCache(environment.secretKey);
    let flags;

    if (cachedFlags) {
      flags = Object.values(cachedFlags);
    } else {
      flags = await syncFlagsToRedis(envId);
    }

    res.json(flags);
  } catch (error) {
    console.error('Get flags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { envId, key, name, description, type, defaultValue, isEnabled, rules, rolloutPercentage } = req.body;

    if (!envId || !key || !name) {
      return res.status(400).json({ message: 'Environment ID, key, and name are required' });
    }

    const environment = await verifyEnvAccess(envId, req.user.orgId);
    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    const existingFlag = await Flag.findOne({ envId, key });
    if (existingFlag) {
      return res.status(400).json({ message: 'Flag with this key already exists' });
    }

    const flag = await Flag.create({
      envId,
      key: key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name,
      description: description || '',
      type: type || 'boolean',
      defaultValue: defaultValue !== undefined ? defaultValue : false,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      rules: rules || [],
      rolloutPercentage: rolloutPercentage !== undefined ? rolloutPercentage : 100
    });

    await setFlagCache(environment.secretKey, flag.key, flag.toObject());

    emitFlagUpdate(environment.secretKey, flag.key, flag.toObject());

    res.status(201).json(flag);
  } catch (error) {
    console.error('Create flag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const flag = await Flag.findById(req.params.id);

    if (!flag) {
      return res.status(404).json({ message: 'Flag not found' });
    }

    const environment = await verifyEnvAccess(flag.envId, req.user.orgId);
    if (!environment) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    const allowedUpdates = ['name', 'description', 'type', 'defaultValue', 'isEnabled', 'rules', 'rolloutPercentage'];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        flag[field] = updates[field];
      }
    });

    await flag.save();

    await setFlagCache(environment.secretKey, flag.key, flag.toObject());

    emitFlagUpdate(environment.secretKey, flag.key, flag.toObject());

    res.json(flag);
  } catch (error) {
    console.error('Update flag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const flag = await Flag.findById(req.params.id);

    if (!flag) {
      return res.status(404).json({ message: 'Flag not found' });
    }

    const environment = await verifyEnvAccess(flag.envId, req.user.orgId);
    if (!environment) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Flag.findByIdAndDelete(flag._id);

    await invalidateEnvCache(environment.secretKey);

    emitFlagUpdate(environment.secretKey, flag.key, null, true);

    res.json({ message: 'Flag deleted' });
  } catch (error) {
    console.error('Delete flag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;