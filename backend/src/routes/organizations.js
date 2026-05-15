import express from 'express';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.orgId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (req.params.id !== String(req.user.orgId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const organization = await Organization.findById(req.user.orgId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const members = await User.find({ orgId: req.user.orgId }).select('name email role');

    res.json({
      ...organization.toObject(),
      members
    });
  } catch (error) {
    console.error('Get organization by id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;