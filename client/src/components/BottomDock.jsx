import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const BottomDock = ({
  isInboxOpen,
  onToggleInbox,
  currentBoardId,
}) => {
  const navigate = useNavigate();
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  useEffect(() => {
    if (showBoardSwitcher) {
      loadAllBoards();
    }
  }, [showBoardSwitcher]);

  const loadAllBoards = async () => {
    try {
      setLoadingBoards(true);
      const wsRes = await api.get('/workspaces');
      const workspaces = wsRes.data.data || [];

      const allBoards = [];
      for (const ws of workspaces) {
        const bRes = await api.get(`/boards/workspace/${ws._id}`);
        const wsBoards = bRes.data.data || [];
        wsBoards.forEach((b) => {
          allBoards.push({ ...b, workspaceName: ws.name });
        });
      }
      setBoards(allBoards);
    } catch (err) {
      console.error('Failed to load boards for switcher:', err);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleSelectBoard = (boardId) => {
    setShowBoardSwitcher(false);
    if (boardId !== currentBoardId) {
      navigate(`/boards/${boardId}`);
    }
  };

  return (
    <>
      <div className="bottom-dock-container">
        <div className="bottom-dock-pill">
          {/* Inbox Button */}
          <button
            className={`bottom-dock-btn ${isInboxOpen ? 'active' : ''}`}
            onClick={onToggleInbox}
            title="Toggle Inbox"
          >
            <span>📥</span>
            <span>Inbox</span>
          </button>

          {/* Board View Button */}
          <button
            className="bottom-dock-btn active"
            onClick={() => {
              const canvas = document.querySelector('.trello-kanban-canvas');
              if (canvas) canvas.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Board Canvas"
          >
            <span>🍱</span>
            <span>Board</span>
          </button>

          {/* Switch Boards Button */}
          <button
            className={`bottom-dock-btn ${showBoardSwitcher ? 'active' : ''}`}
            onClick={() => setShowBoardSwitcher(!showBoardSwitcher)}
            title="Switch Boards"
          >
            <span>🗂️</span>
            <span>Switch boards</span>
          </button>
        </div>
      </div>

      {/* Switch Boards Popover / Modal */}
      {showBoardSwitcher && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200 }}
          onClick={() => setShowBoardSwitcher(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">🗂️ Switch Boards</h3>
              <button className="modal-close" onClick={() => setShowBoardSwitcher(false)}>
                ✕
              </button>
            </div>

            {loadingBoards ? (
              <p style={{ textAlign: 'center', color: '#8c9cb8', padding: '16px' }}>
                Loading boards...
              </p>
            ) : boards.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#8c9cb8', padding: '16px' }}>
                No boards found.
              </p>
            ) : (
              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {boards.map((b) => {
                  const isCurrent = b._id === currentBoardId;

                  return (
                    <div
                      key={b._id}
                      onClick={() => handleSelectBoard(b._id)}
                      style={{
                        padding: '10px 14px',
                        background: isCurrent ? '#1c2b42' : '#1d2125',
                        border: isCurrent ? '1.5px solid #579dff' : '1px solid #38414a',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c9cb8' }}>
                          Workspace: {b.workspaceName}
                        </div>
                      </div>

                      {isCurrent ? (
                        <span style={{ fontSize: '11px', color: '#579dff', fontWeight: 600 }}>
                          Current Board
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#8c9cb8' }}>→</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/dashboard')}
                style={{ fontSize: '13px' }}
              >
                Go to Dashboard
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowBoardSwitcher(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomDock;
