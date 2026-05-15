import express from 'express';
import Project from '../models/Project.js';
import Environment from '../models/Environment.js';
import Flag from '../models/Flag.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { projectId } = req.query;

    let query = {};
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, orgId: req.user.orgId });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      query.projectId = projectId;
    } else {
      const projects = await Project.find({ orgId: req.user.orgId }).select('_id');
      query.projectId = { $in: projects.map((p) => p._id) };
    }

    const environments = await Environment.find(query).sort({ createdAt: -1 });
    res.json(environments);
  } catch (error) {
    console.error('Get environments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { projectId, name } = req.body;

    if (!projectId || !name) {
      return res.status(400).json({ message: 'Project ID and name are required' });
    }

    const project = await Project.findOne({ _id: projectId, orgId: req.user.orgId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const environment = await Environment.create({
      projectId,
      name
    });

    res.status(201).json(environment);
  } catch (error) {
    console.error('Create environment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id);

    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    const project = await Project.findOne({
      _id: environment.projectId,
      orgId: req.user.orgId
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(environment);
  } catch (error) {
    console.error('Get environment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id);

    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    const project = await Project.findOne({
      _id: environment.projectId,
      orgId: req.user.orgId
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Flag.deleteMany({ envId: environment._id });
    await Environment.findByIdAndDelete(environment._id);

    res.json({ message: 'Environment deleted' });
  } catch (error) {
    console.error('Delete environment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/sdk-keys', protect, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id);

    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }

    const project = await Project.findOne({
      _id: environment.projectId,
      orgId: req.user.orgId
    });

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      clientKey: environment.secretKey,
      baseUrl: `${req.protocol}://${req.get('host')}`
    });
  } catch (error) {
    console.error('Get SDK keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;