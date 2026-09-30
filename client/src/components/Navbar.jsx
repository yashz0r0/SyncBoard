import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onQuickCreate, activeWorkspaceName }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (nameStr, emailStr) => {
    const str = nameStr || emailStr || 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="global-navbar">
      {/* Left: Brand & Workspace info */}
      <div className="global-navbar-left">
        <Link to="/dashboard" className="navbar-brand-badge">
          <span className="navbar-logo-icon">📋</span>
          <span className="navbar-brand-text">SyncBoard</span>
        </Link>

        {activeWorkspaceName && (
          <span className="navbar-workspace-tag">
            <span style={{ opacity: 0.6 }}>/</span>
            <span>{activeWorkspaceName}</span>
          </span>
        )}
      </div>

      {/* Right: Actions & User profile */}
      <div className="global-navbar-right">
        {onQuickCreate && (
          <button className="navbar-create-btn" onClick={onQuickCreate} title="Create a new board">
            <span>+</span>
            <span>New Board</span>
          </button>
        )}

        {/* User Profile Dropdown */}
        <div className="navbar-user-dropdown-container" ref={dropdownRef}>
          <div
            className="navbar-avatar"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user?.name || user?.email}
          >
            {getInitials(user?.name, user?.email)}
          </div>

          {showUserMenu && (
            <div className="navbar-dropdown-menu">
              <div className="navbar-dropdown-header">
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {user?.email}
                </div>
              </div>
              <div className="navbar-dropdown-divider"></div>
              <button
                className="navbar-dropdown-item"
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/dashboard');
                }}
              >
                <span>🍱</span>
                <span>Workspaces & Boards</span>
              </button>
              <div className="navbar-dropdown-divider"></div>
              <button
                className="navbar-dropdown-item danger"
                onClick={handleLogout}
              >
                <span>🚪</span>
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
