import React, { useState, useEffect } from 'react';
import api from '../api/client';

const ActivityModal = ({ boardId, isOpen, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && boardId) {
      fetchActivities();
    }
  }, [isOpen, boardId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/activities/board/${boardId}`);
      setActivities(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📜 Board Activity History</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p style={{ color: '#6b778c', padding: '16px 0', textAlign: 'center' }}>
            Loading history...
          </p>
        ) : activities.length === 0 ? (
          <p style={{ color: '#6b778c', padding: '24px 0', textAlign: 'center' }}>
            No activity recorded on this board yet.
          </p>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.map((act) => (
              <div
                key={act._id}
                style={{
                  padding: '12px 14px',
                  background: '#fafbfc',
                  borderRadius: '6px',
                  border: '1px solid #dfe1e6',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#172b4d' }}>
                    👤 {act.user?.name || act.user?.email || 'Unknown User'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b778c' }}>
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#344563' }}>
                  {act.details}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;
