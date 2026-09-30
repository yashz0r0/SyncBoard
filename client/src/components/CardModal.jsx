import React, { useState, useEffect } from 'react';

const CardModal = ({ card, isOpen, onClose, onSave, onDelete }) => {
  if (!isOpen || !card) return null;

  const [title, setTitle] = useState(card.title || '');
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority || 'MEDIUM');

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setPriority(card.priority || 'MEDIUM');
    }
  }, [card]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      _id: card._id,
      title,
      description,
      priority,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Card</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Add more details to this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(card._id)}
            >
              Delete Card
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardModal;
