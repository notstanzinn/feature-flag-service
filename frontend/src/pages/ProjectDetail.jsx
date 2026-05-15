import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  projectAPI,
  environmentAPI,
  flagAPI
} from '../services/api';
import {
  Plus,
  Flag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Copy,
  Settings,
  ChevronLeft,
  Zap,
  Target,
  Users
} from 'lucide-react';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const envIdFromUrl = searchParams.get('env');

  const [project, setProject] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const [showRules, setShowRules] = useState(null);

  const fetchProject = async () => {
    try {
      const response = await projectAPI.getAll();
      const found = response.data.find((p) => p._id === projectId);
      setProject(found);
      return found;
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchEnvironments = async () => {
    try {
      const response = await environmentAPI.getAll(projectId);
      setEnvironments(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  };

  const fetchFlags = async (envId) => {
    try {
      const response = await flagAPI.getAll(envId);
      setFlags(response.data);
    } catch (error) {
      console.error('Error fetching flags:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const proj = await fetchProject();
      const envs = await fetchEnvironments();

      if (envIdFromUrl) {
        const env = envs.find((e) => e._id === envIdFromUrl);
        if (env) {
          setSelectedEnv(env);
          await fetchFlags(env._id);
        }
      } else if (envs.length > 0) {
        setSelectedEnv(envs[0]);
        await fetchFlags(envs[0]._id);
      }

      setLoading(false);
    };

    init();
  }, [projectId, envIdFromUrl]);

  const handleEnvChange = async (env) => {
    setSelectedEnv(env);
    await fetchFlags(env._id);
  };

  const handleToggleFlag = async (flag) => {
    try {
      const response = await flagAPI.update(flag._id, {
        isEnabled: !flag.isEnabled
      });
      setFlags(flags.map((f) => (f._id === flag._id ? response.data : f)));
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const handleDeleteFlag = async (flagId) => {
    if (confirm('Delete this flag?')) {
      try {
        await flagAPI.delete(flagId);
        setFlags(flags.filter((f) => f._id !== flagId));
      } catch (error) {
        console.error('Error deleting flag:', error);
      }
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
  };

  const [newFlag, setNewFlag] = useState({
    key: '',
    name: '',
    description: '',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100
  });

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    try {
      if (editingFlag) {
        const response = await flagAPI.update(editingFlag._id, newFlag);
        setFlags(flags.map((f) => (f._id === editingFlag._id ? response.data : f)));
      } else {
        const response = await flagAPI.create({
          ...newFlag,
          envId: selectedEnv._id
        });
        setFlags([...flags, response.data]);
      }
      setShowFlagModal(false);
      setEditingFlag(null);
      setNewFlag({
        key: '',
        name: '',
        description: '',
        type: 'boolean',
        defaultValue: false,
        isEnabled: true,
        rolloutPercentage: 100
      });
    } catch (error) {
      console.error('Error saving flag:', error);
    }
  };

  const openEditModal = (flag) => {
    setEditingFlag(flag);
    setNewFlag({
      key: flag.key,
      name: flag.name,
      description: flag.description || '',
      type: flag.type,
      defaultValue: flag.defaultValue,
      isEnabled: flag.isEnabled,
      rolloutPercentage: flag.rolloutPercentage || 100
    });
    setShowFlagModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{project.name}</h1>
            <p className="text-text-secondary text-sm">
              {project.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Environment Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
          <span className="text-text-secondary text-sm">Environments:</span>
          {environments.map((env) => (
            <button
              key={env._id}
              onClick={() => handleEnvChange(env)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedEnv?._id === env._id
                  ? 'bg-primary text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {env.name}
            </button>
          ))}
        </div>

        {selectedEnv ? (
          <>
            {/* SDK Key */}
            <div className="card mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">SDK Environment Key</p>
                <p className="font-mono text-sm">{selectedEnv.secretKey}</p>
              </div>
              <button
                onClick={() => handleCopyKey(selectedEnv.secretKey)}
                className="btn btn-secondary"
              >
                <Copy size={16} />
                Copy Key
              </button>
            </div>

            {/* Flags */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Flag size={20} className="text-primary" />
                Feature Flags
              </h2>
              <button
                onClick={() => {
                  setEditingFlag(null);
                  setNewFlag({
                    key: '',
                    name: '',
                    description: '',
                    type: 'boolean',
                    defaultValue: false,
                    isEnabled: true,
                    rolloutPercentage: 100
                  });
                  setShowFlagModal(true);
                }}
                className="btn btn-primary"
              >
                <Plus size={20} />
                New Flag
              </button>
            </div>

            {flags.length === 0 ? (
              <div className="card text-center py-12">
                <Flag size={48} className="mx-auto text-text-secondary mb-4" />
                <h3 className="text-lg font-medium mb-2">No Flags Yet</h3>
                <p className="text-text-secondary mb-6">
                  Create your first feature flag to get started
                </p>
                <button
                  onClick={() => setShowFlagModal(true)}
                  className="btn btn-primary"
                >
                  <Plus size={20} />
                  Create Flag
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((flag) => (
                  <div
                    key={flag._id}
                    className="card hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleFlag(flag)}
                          className="text-2xl"
                        >
                          {flag.isEnabled ? (
                            <ToggleRight className="text-success" size={32} />
                          ) : (
                            <ToggleLeft className="text-text-secondary" size={32} />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{flag.name}</h3>
                            <span className="badge badge-info">{flag.type}</span>
                          </div>
                          <p className="font-mono text-sm text-text-secondary">
                            {flag.key}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowRules(showRules === flag._id ? null : flag._id)}
                          className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
                          title="Targeting Rules"
                        >
                          <Target size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(flag)}
                          className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteFlag(flag._id)}
                          className="p-2 hover:bg-bg-elevated rounded-lg text-text-secondary hover:text-danger transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {showRules === flag._id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-text-secondary mb-1">Default Value</p>
                            <p className="font-mono">
                              {JSON.stringify(flag.defaultValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-secondary mb-1">Rollout</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${flag.rolloutPercentage || 100}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-sm">
                                {flag.rolloutPercentage || 100}%
                              </span>
                            </div>
                          </div>
                        </div>
                        {flag.rules?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-text-secondary mb-2">Rules</p>
                            {flag.rules.map((rule, i) => (
                              <div key={i} className="bg-bg-elevated p-3 rounded-lg mb-2">
                                <div className="flex items-center gap-2">
                                  <Users size={14} />
                                  <span className="text-sm font-medium">{rule.type}</span>
                                  {rule.percentage && (
                                    <span className="text-sm text-text-secondary">
                                      ({rule.percentage}%)
                                    </span>
                                  )}
                                </div>
                                {rule.conditions?.length > 0 && (
                                  <div className="mt-2 text-xs text-text-secondary font-mono">
                                    {rule.conditions.map((c, j) => (
                                      <span key={j}>
                                        {c.attribute} {c.operator} "{c.value}"
                                        {j < rule.conditions.length - 1 ? ' AND ' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-12">
            <p className="text-text-secondary">
              Select an environment to view flags
            </p>
          </div>
        )}
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-xl font-bold mb-4">
              {editingFlag ? 'Edit Flag' : 'Create Flag'}
            </h2>
            <form onSubmit={handleCreateFlag} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-secondary">
                    Flag Key
                  </label>
                  <input
                    type="text"
                    value={newFlag.key}
                    onChange={(e) =>
                      setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
                    }
                    placeholder="new_feature"
                    required
                    disabled={editingFlag}
                    className={editingFlag ? 'opacity-50' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-secondary">
                    Type
                  </label>
                  <select
                    value={newFlag.type}
                    onChange={(e) => setNewFlag({ ...newFlag, type: e.target.value })}
                  >
                    <option value="boolean">Boolean</option>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                  placeholder="New Feature"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Description
                </label>
                <textarea
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Default Value
                </label>
                {newFlag.type === 'boolean' ? (
                  <select
                    value={newFlag.defaultValue}
                    onChange={(e) =>
                      setNewFlag({ ...newFlag, defaultValue: e.target.value === 'true' })
                    }
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={newFlag.type === 'number' ? 'number' : 'text'}
                    value={newFlag.defaultValue}
                    onChange={(e) => setNewFlag({ ...newFlag, defaultValue: e.target.value })}
                    placeholder={
                      newFlag.type === 'json' ? '{"key": "value"}' : 'Default value'
                    }
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Rollout Percentage: {newFlag.rolloutPercentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newFlag.rolloutPercentage}
                  onChange={(e) =>
                    setNewFlag({ ...newFlag, rolloutPercentage: parseInt(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFlag.isEnabled}
                    onChange={(e) => setNewFlag({ ...newFlag, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="toggle-switch peer-checked:bg-primary"></div>
                </label>
                <span className="text-sm">Enable this flag</span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFlagModal(false);
                    setEditingFlag(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingFlag ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;