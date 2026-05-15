import { useState, useEffect, useRef } from 'react';
import { projectAPI, environmentAPI, evalAPI } from '../services/api';
import FlagForgeClient from '../lib/client';
import { io } from 'socket.io-client';
import {
  Copy,
  RefreshCw,
  Zap,
  Wifi,
  WifiOff,
  ChevronRight,
  Code,
  Play
} from 'lucide-react';

const ClientDemo = () => {
  const [projects, setProjects] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [flags, setFlags] = useState([]);
  const [client, setClient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userContext, setUserContext] = useState({});
  const [evaluationResults, setEvaluationResults] = useState({});
  const [evalLoading, setEvalLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    return () => {
      if (client) client.disconnect();
      if (socket) socket.disconnect();
    };
  }, [client, socket]);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEnvironments = async (projectId) => {
    try {
      const response = await environmentAPI.getAll(projectId);
      setEnvironments(response.data);
      if (response.data.length > 0) {
        setSelectedEnv(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  };

  const connectToSocket = (env) => {
    if (socket) socket.disconnect();
    if (client) client.disconnect();

    const newSocket = io('ws://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      newSocket.emit('subscribe', {
        envKey: env.secretKey,
        userContext: { userId, email: userEmail }
      });
    });

    newSocket.on('flag-sync', ({ flags }) => {
      console.log('Flag sync:', flags);
      setFlags(flags);
    });

    newSocket.on('flag-update', ({ key, flag, isDeleted }) => {
      if (isDeleted) {
        setFlags((prev) => prev.filter((f) => f.key !== key));
      } else {
        setFlags((prev) => {
          const exists = prev.find((f) => f.key === key);
          if (exists) {
            return prev.map((f) => (f.key === key ? flag : f));
          }
          return [...prev, flag];
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);
  };

  const handleEnvSelect = (env) => {
    setSelectedEnv(env);
    setFlags([]);
    setEvaluationResults({});
    connectToSocket(env);
  };

  const handleProjectSelect = (projectId) => {
    fetchEnvironments(projectId);
  };

  const evaluateAllFlags = async () => {
    if (!selectedEnv) return;

    setEvalLoading(true);
    try {
      const context = { userId, email: userEmail, ...userContext };
      const response = await evalAPI.getAllFlags(selectedEnv.secretKey, userId || undefined);
      setEvaluationResults(response.data.flags);
    } catch (error) {
      console.error('Error evaluating flags:', error);
    } finally {
      setEvalLoading(false);
    }
  };

  const copyCode = () => {
    const code = `// FlagForge Client SDK Demo
import FlagForgeClient from '@flagforge/client';

const client = new FlagForgeClient({
  envKey: '${selectedEnv?.secretKey || 'YOUR_ENV_KEY'}',
  socketUrl: 'ws://localhost:3001'
});

await client.initialize();

// Check a boolean flag
const isEnabled = await client.bool('your_flag_key', false);

// Update user context for targeting
client.updateUserContext({
  userId: '${userId || 'user_123'}',
  email: '${userEmail || 'user@example.com'}'
});

// Listen for real-time updates
client.on('flag-updated', (key, flag) => {
  console.log('Flag updated:', key);
});

// Disconnect when done
client.disconnect();`;

    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Zap className="text-primary" />
            Client Demo
          </h1>
          <p className="text-text-secondary mt-2">
            Test your feature flags in real-time with the SDK
          </p>
        </div>

        {/* Connection Status */}
        <div className="card mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${connected ? 'text-success' : 'text-text-secondary'}`}>
              {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
              <span className="font-medium">
                {connected ? 'Connected to Real-time Updates' : 'Disconnected'}
              </span>
              {connected && (
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              )}
            </div>
          </div>
          {selectedEnv && (
            <button
              onClick={() => connectToSocket(selectedEnv)}
              className="btn btn-secondary"
            >
              <RefreshCw size={16} />
              Reconnect
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Environment Selection */}
            <div className="card">
              <h3 className="font-display font-semibold mb-4">1. Select Environment</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Project</label>
                  <select
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {environments.length > 0 && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Environment</label>
                    <div className="space-y-2">
                      {environments.map((env) => (
                        <button
                          key={env._id}
                          onClick={() => handleEnvSelect(env)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedEnv?._id === env._id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{env.name}</span>
                            {selectedEnv?._id === env._id && connected && (
                              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary font-mono truncate mt-1">
                            {env.secretKey}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Context */}
            <div className="card">
              <h3 className="font-display font-semibold mb-4">2. User Context</h3>
              <p className="text-sm text-text-secondary mb-4">
                This context is used for targeting rules (e.g., email.endsWith('@company.com'))
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">User ID</label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => {
                        setUserId(e.target.value);
                        setUserContext({ ...userContext, userId: e.target.value });
                      }}
                      placeholder="user_123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Email</label>
                    <input
                      type="text"
                      value={userEmail}
                      onChange={(e) => {
                        setUserEmail(e.target.value);
                        setUserContext({ ...userContext, email: e.target.value });
                      }}
                      placeholder="user@company.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SDK Code */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold">SDK Integration</h3>
                <button onClick={copyCode} className="btn btn-secondary text-sm">
                  <Copy size={16} />
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="bg-bg-elevated p-4 rounded-lg text-sm font-mono overflow-x-auto">
                <code className="text-text-secondary">{`// FlagForge Client SDK
import FlagForgeClient from '@flagforge/client';

const client = new FlagForgeClient({
  envKey: '${selectedEnv?.secretKey?.substring(0, 20) || 'YOUR_KEY'}...',
  socketUrl: 'ws://localhost:3001'
});

await client.initialize();
const isEnabled = await client.bool('flag_key', false);

client.on('flag-updated', (key, value) => {
  console.log(\`Flag \${key} changed!\`);
});`}</code>
              </pre>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Flags List */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Code size={18} className="text-primary" />
                  Live Flags ({flags.length})
                </h3>
              </div>
              {flags.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <p>No flags received yet</p>
                  <p className="text-sm mt-1">Select an environment to connect</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {flags.map((flag) => (
                    <div
                      key={flag._id}
                      className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg"
                    >
                      <div>
                        <p className="font-mono text-sm">{flag.key}</p>
                        <p className="text-xs text-text-secondary">{flag.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge ${flag.isEnabled ? 'badge-success' : 'badge-danger'}`}
                        >
                          {flag.isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evaluation Results */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold">Evaluate Flags</h3>
                <button
                  onClick={evaluateAllFlags}
                  disabled={!selectedEnv || evalLoading}
                  className="btn btn-primary"
                >
                  <Play size={16} />
                  Evaluate
                </button>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Evaluate all flags for the current user context using the API endpoint
              </p>
              {Object.keys(evaluationResults).length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(evaluationResults).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg"
                    >
                      <p className="font-mono text-sm">{key}</p>
                      <span
                        className={`badge ${value ? 'badge-success' : 'badge-danger'}`}
                      >
                        {JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <p>Click "Evaluate" to see results</p>
                </div>
              )}
            </div>

            {/* Event Log */}
            <div className="card">
              <h3 className="font-display font-semibold mb-4">Event Log</h3>
              <div className="bg-bg-elevated p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs">
                {connected ? (
                  <p className="text-success">
                    [{new Date().toLocaleTimeString()}] Connected to {selectedEnv?.name}
                  </p>
                ) : (
                  <p className="text-text-secondary">
                    Waiting for connection...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDemo;