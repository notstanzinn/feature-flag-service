import express from 'express';
import Project from '../models/Project.js';
import Environment from '../models/Environment.js';
import Flag from '../models/Flag.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({ orgId: req.user.orgId }).sort({ createdAt: -1 });

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const environments = await Environment.find({ projectId: project._id });
        const envIds = environments.map((e) => e._id);
        const flagCount = await Flag.countDocuments({ envId: { $in: envIds } });

        return {
          ...project.toObject(),
          environments,
          flagCount
        };
      })
    );

    res.json(projectsWithCounts);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const project = await Project.create({
      orgId: req.user.orgId,
      name,
      description: description || ''
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      orgId: req.user.orgId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.name = req.body.name || project.name;
    project.description = req.body.description !== undefined ? req.body.description : project.description;

    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      orgId: req.user.orgId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const environments = await Environment.find({ projectId: project._id });
    const envIds = environments.map((e) => e._id);

    await Flag.deleteMany({ envId: { $in: envIds } });
    await Environment.deleteMany({ projectId: project._id });

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;