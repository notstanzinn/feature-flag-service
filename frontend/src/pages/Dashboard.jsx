import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, environmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  FolderKanban,
  Globe,
  Server,
  Trash2,
  ChevronRight,
  Box
} from 'lucide-react';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newEnv, setNewEnv] = useState({ name: '' });
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectAPI.create(newProject);
      setShowProjectModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleDeleteProject = async (id) => {
    if (confirm('Delete this project and all its environments?')) {
      try {
        await projectAPI.delete(id);
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleCreateEnv = async (e) => {
    e.preventDefault();
    try {
      await environmentAPI.create({
        projectId: selectedProject._id,
        name: newEnv.name
      });
      setShowEnvModal(false);
      setNewEnv({ name: '' });
      fetchProjects();
    } catch (error) {
      console.error('Error creating environment:', error);
    }
  };

  const openEnvModal = (project) => {
    setSelectedProject(project);
    setShowEnvModal(true);
  };

  const getEnvColor = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('prod')) return 'text-success';
    if (lower.includes('staging')) return 'text-warning';
    return 'text-primary';
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <p className="text-text-secondary mt-1">
              {user?.orgName} - Manage your projects and feature flags
            </p>
          </div>
          <button
            onClick={() => setShowProjectModal(true)}
            className="btn btn-primary"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-16">
            <FolderKanban size={48} className="mx-auto text-text-secondary mb-4" />
            <h3 className="text-xl font-medium mb-2">No Projects Yet</h3>
            <p className="text-text-secondary mb-6">
              Create your first project to start managing feature flags
            </p>
            <button
              onClick={() => setShowProjectModal(true)}
              className="btn btn-primary"
            >
              <Plus size={20} />
              Create Project
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <div key={project._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                      <FolderKanban className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">
                        {project.name}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        {project.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEnvModal(project)}
                      className="btn btn-secondary text-sm py-2"
                    >
                      <Plus size={16} />
                      Environment
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project._id)}
                      className="p-2 text-text-secondary hover:text-danger transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {project.environments?.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-text-secondary font-medium">Environments</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {project.environments.map((env) => (
                        <div
                          key={env._id}
                          onClick={() => navigate(`/projects/${project._id}?env=${env._id}`)}
                          className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg cursor-pointer hover:border-primary/30 border border-transparent transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Globe size={18} className={getEnvColor(env.name)} />
                            <div>
                              <p className="font-medium text-sm">{env.name}</p>
                              <p className="text-xs text-text-secondary font-mono">
                                {env.secretKey.substring(0, 20)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`badge ${env.name.toLowerCase().includes('prod') ? 'badge-success' : 'badge-info'}`}>
                              {project.flagCount} flags
                            </span>
                            <ChevronRight size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-bg-elevated rounded-lg">
                    <Server size={24} className="mx-auto text-text-secondary mb-2" />
                    <p className="text-text-secondary text-sm">
                      No environments yet
                    </p>
                    <button
                      onClick={() => openEnvModal(project)}
                      className="text-primary text-sm hover:underline mt-1"
                    >
                      Add environment
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Awesome App"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Environment Modal */}
      {showEnvModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-4">
              Add Environment
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              Creating environment for: <span className="text-primary">{selectedProject?.name}</span>
            </p>
            <form onSubmit={handleCreateEnv} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Environment Name
                </label>
                <input
                  type="text"
                  value={newEnv.name}
                  onChange={(e) => setNewEnv({ ...newEnv, name: e.target.value })}
                  placeholder="Production"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnvModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;