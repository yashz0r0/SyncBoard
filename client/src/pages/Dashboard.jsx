import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');

  const [showBoardModal, setShowBoardModal] = useState(false);
  const [boardName, setBoardName] = useState('');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  // 1. Fetch Workspaces on component mount
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/workspaces');
      const wsList = res.data.data || [];
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        setActiveWorkspace(wsList[0]);
        fetchBoards(wsList[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Boards
  const fetchBoards = async (workspaceId) => {
    try {
      const res = await api.get(`/boards/workspace/${workspaceId}`);
      setBoards(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch boards');
    }
  };

  const handleSelectWorkspace = (ws) => {
    setActiveWorkspace(ws);
    fetchBoards(ws._id);
  };

  // 3. Create Workspace
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;

    try {
      const res = await api.post('/workspaces', {
        name: wsName,
        description: wsDesc,
      });
      const newWs = res.data.data;
      setWorkspaces([...workspaces, newWs]);
      setActiveWorkspace(newWs);
      setBoards([]);
      setWsName('');
      setWsDesc('');
      setShowWorkspaceModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create workspace');
    }
  };

  // 4. Create Board
  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!boardName.trim() || !activeWorkspace) return;

    try {
      const res = await api.post('/boards', {
        name: boardName,
        workspaceId: activeWorkspace._id,
      });
      const newBoard = res.data.data;
      setBoards([...boards, newBoard]);
      setBoardName('');
      setShowBoardModal(false);
      navigate(`/boards/${newBoard._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create board');
    }
  };

  // 5. Add Team Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim() || !activeWorkspace) return;

    try {
      const res = await api.post(`/workspaces/${activeWorkspace._id}/members`, {
        email: memberEmail.trim(),
      });
      const updatedWs = res.data.data;

      setActiveWorkspace(updatedWs);
      setWorkspaces(workspaces.map((w) => (w._id === updatedWs._id ? updatedWs : w)));
      setMemberEmail('');
      setShowMemberModal(false);
      alert('Teammate added successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add team member');
    }
  };

  const isOwner = activeWorkspace?.owner?._id
    ? activeWorkspace.owner._id.toString() === user?._id?.toString()
    : activeWorkspace?.owner?.toString() === user?._id?.toString();

  const getWorkspaceInitial = (nameStr) => {
    return (nameStr?.trim()[0] || 'W').toUpperCase();
  };

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <Navbar
        onQuickCreate={() => setShowBoardModal(true)}
        activeWorkspaceName={activeWorkspace?.name}
      />

      <div className="dashboard-content-layout">
        {/* Left Sidebar: Workspaces & Team */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-workspaces-header">
            <span className="sidebar-section-heading">Workspaces</span>
            <button
              className="sidebar-add-btn"
              title="Create Workspace"
              onClick={() => setShowWorkspaceModal(true)}
            >
              +
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', padding: '10px 14px' }}>
              Loading workspaces...
            </p>
          ) : workspaces.length === 0 ? (
            <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '13px' }}>
              No workspaces found.
              <button
                className="btn btn-primary"
                style={{ marginTop: '10px', fontSize: '12px', width: '100%' }}
                onClick={() => setShowWorkspaceModal(true)}
              >
                + New Workspace
              </button>
            </div>
          ) : (
            <div className="sidebar-workspace-list">
              {workspaces.map((ws) => {
                const isSelected = activeWorkspace?._id === ws._id;

                return (
                  <div
                    key={ws._id}
                    className={`sidebar-workspace-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectWorkspace(ws)}
                  >
                    <div className="sidebar-ws-badge">
                      {getWorkspaceInitial(ws.name)}
                    </div>
                    <span className="sidebar-ws-name">{ws.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Workspace Team Members */}
          {activeWorkspace && (
            <>
              <div className="sidebar-divider"></div>
              <div className="sidebar-workspaces-header">
                <span className="sidebar-section-heading">Teammates</span>
                {isOwner && (
                  <button
                    className="sidebar-add-btn"
                    title="Invite Member"
                    onClick={() => setShowMemberModal(true)}
                  >
                    +
                  </button>
                )}
              </div>

              <div className="sidebar-members-list">
                {activeWorkspace.members?.map((m) => (
                  <div key={m._id || m} className="sidebar-member-item">
                    <span className="sidebar-member-avatar">
                      {getWorkspaceInitial(m.name || m.email)}
                    </span>
                    <span className="sidebar-member-name">
                      {m.name || m.email || 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {error && <div className="error-banner">{error}</div>}

          {activeWorkspace ? (
            <div>
              {/* Workspace Header Bar */}
              <div className="workspace-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="workspace-header-badge">
                    {getWorkspaceInitial(activeWorkspace.name)}
                  </div>
                  <div>
                    <h1 className="workspace-header-title">{activeWorkspace.name}</h1>
                    <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                      {activeWorkspace.description || 'Manage tasks, track progress, and collaborate in real-time.'}
                    </p>
                  </div>
                </div>

                <div className="workspace-action-pills">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowMemberModal(true)}
                  >
                    <span>👥</span>
                    <span>Team ({activeWorkspace.members?.length || 1})</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowBoardModal(true)}
                  >
                    <span>+</span>
                    <span>Create Board</span>
                  </button>
                </div>
              </div>

              {/* Boards Toolbar & Search */}
              <div className="boards-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                    Boards ({boards.length})
                  </span>
                </div>

                {boards.length > 0 && (
                  <input
                    type="text"
                    className="boards-search-input"
                    placeholder="Search boards in this workspace..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                )}
              </div>

              {/* Boards Grid */}
              <div className="dashboard-boards-grid">
                {filteredBoards.map((b) => (
                  <Link
                    key={b._id}
                    to={`/boards/${b._id}`}
                    className="dashboard-board-card"
                  >
                    <div className="board-card-accent-bar"></div>
                    <div className="board-card-body">
                      <div className="board-card-name">{b.name}</div>
                      <div className="board-card-footer-info">
                        <span className="board-card-sub">Open board</span>
                        <span className="board-card-arrow">→</span>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Create New Board Card Tile */}
                <div
                  className="dashboard-create-board-card"
                  onClick={() => setShowBoardModal(true)}
                >
                  <span className="create-board-icon">+</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>
                    Create new board
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Kanban workflow with live sync
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No workspace selected.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '14px' }}
                onClick={() => setShowWorkspaceModal(true)}
              >
                + Create Workspace
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Create Workspace */}
      {showWorkspaceModal && (
        <div className="modal-overlay" onClick={() => setShowWorkspaceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Workspace</h3>
              <button className="modal-close" onClick={() => setShowWorkspaceModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace}>
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Engineering, Product, Marketing"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="What is this workspace used for?"
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowWorkspaceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Board */}
      {showBoardModal && (
        <div className="modal-overlay" onClick={() => setShowBoardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Board</h3>
              <button className="modal-close" onClick={() => setShowBoardModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoard}>
              <div className="form-group">
                <label className="form-label">Board Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sprint Backlog, Roadmap 2026"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Workspace</label>
                <select
                  className="form-input"
                  value={activeWorkspace?._id || ''}
                  onChange={(e) => {
                    const ws = workspaces.find((w) => w._id === e.target.value);
                    if (ws) handleSelectWorkspace(ws);
                  }}
                >
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBoardModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Members */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">👥 Team Members</h3>
              <button className="modal-close" onClick={() => setShowMemberModal(false)}>
                ✕
              </button>
            </div>

            {/* Existing Members */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Workspace Members</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {activeWorkspace?.members?.map((m) => (
                  <div
                    key={m._id || m}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#131924',
                      border: '1px solid #26334a',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="sidebar-member-avatar">
                        {getWorkspaceInitial(m.name || m.email)}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                          {m.name || 'Member'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{m.email}</div>
                      </div>
                    </div>
                    {activeWorkspace?.owner?._id === m._id && (
                      <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>
                        Owner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Member Form (Owner Only) */}
            {isOwner ? (
              <form onSubmit={handleAddMember}>
                <div className="form-group">
                  <label className="form-label">Invite Teammate by Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="colleague@example.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowMemberModal(false)}
                  >
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Invite Member
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMemberModal(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
