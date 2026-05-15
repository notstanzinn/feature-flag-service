import express from 'express';
import Flag from '../models/Flag.js';
import Environment from '../models/Environment.js';
import { getAllFlagsCache, setAllFlagsCache } from '../services/redisService.js';
import { evaluateFlag, evaluateAllFlags } from '../services/flagEvaluator.js';

const router = express.Router();

const getCachedOrDBFlags = async (envSecretKey) => {
  let cachedFlags = await getAllFlagsCache(envSecretKey);

  if (cachedFlags) {
    return Object.values(cachedFlags);
  }

  const env = await Environment.findOne({ secretKey: envSecretKey });
  if (!env) return null;

  const flags = await Flag.find({ envId: env._id });

  if (flags.length > 0) {
    const flagsObj = {};
    flags.forEach((f) => {
      flagsObj[f.key] = f.toObject();
    });
    await setAllFlagsCache(envSecretKey, flagsObj);
  }

  return flags;
};

router.post('/:envKey', async (req, res) => {
  try {
    const { envKey } = req.params;
    const { flagKey, userContext } = req.body;

    const flags = await getCachedOrDBFlags(envKey);
    if (!flags) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    if (flagKey) {
      const flag = flags.find((f) => f.key === flagKey);
      if (!flag) {
        return res.status(404).json({ message: 'Flag not found' });
      }

      const result = evaluateFlag(flag, userContext || {});
      return res.json({ key: flagKey, value: result });
    }

    const results = evaluateAllFlags(flags, userContext || {});
    res.json({ flags: results });
  } catch (error) {
    console.error('Evaluate flag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:envKey/flags', async (req, res) => {
  try {
    const { envKey } = req.params;

    const flags = await getCachedOrDBFlags(envKey);
    if (!flags) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    const { userId } = req.query;
    const userContext = userId ? { userId } : {};

    const results = evaluateAllFlags(flags, userContext);
    res.json({ flags: results });
  } catch (error) {
    console.error('Get all flags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:envKey/:flagKey', async (req, res) => {
  try {
    const { envKey, flagKey } = req.params;
    const userContext = req.query;

    const flags = await getCachedOrDBFlags(envKey);
    if (!flags) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    const flag = flags.find((f) => f.key === flagKey);
    if (!flag) {
      return res.status(404).json({ message: 'Flag not found' });
    }

    const result = evaluateFlag(flag, userContext);
    res.json({ key: flagKey, value: result });
  } catch (error) {
    console.error('Get flag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;