import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

const DraggableInboxCard = ({ item, onDelete, onSendToBoard, lists, selectedListId }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `inbox-${item.id}`,
    data: { type: 'InboxCard', item },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.35 : 1,
        cursor: 'grab',
      }
    : { cursor: 'grab' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="inbox-card-item"
    >
      <div className="inbox-card-top">
        <span className="inbox-card-title">{item.title}</span>
        <button
          className="inbox-card-delete"
          title="Remove from Inbox"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ✕
        </button>
      </div>

      <div className="inbox-card-bottom">
        <div style={{ display: 'flex', gap: '8px', color: '#8c9cb8', fontSize: '12px' }}>
          <span title="Drag to any list on the board">✋ Drag to list</span>
          <span>≡</span>
        </div>

        {lists.length > 0 && (
          <button
            className="inbox-send-btn"
            title={`Send to ${lists.find((l) => l._id === selectedListId)?.name || 'Board'}`}
            onClick={(e) => {
              e.stopPropagation();
              onSendToBoard(item);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            → Move
          </button>
        )}
      </div>
    </div>
  );
};

const InboxPanel = ({
  isOpen,
  onClose,
  lists,
  inboxItems,
  onAddItem,
  onDeleteItem,
  onSendToBoard,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState('');

  useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0]._id);
    }
  }, [lists, selectedListId]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddItem(newTitle.trim());
    setNewTitle('');
  };

  if (!isOpen) return null;

  return (
    <div className="inbox-panel">
      {/* Inbox Header */}
      <div className="inbox-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📥</span>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff' }}>Inbox</span>
          <span className="inbox-count-badge">{inboxItems.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button className="inbox-icon-btn" title="Close Inbox" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* Add a Card Input */}
      <form onSubmit={handleAdd} className="inbox-add-form">
        <input
          type="text"
          className="inbox-add-input"
          placeholder="Add a card..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>

      {/* Drag instruction tip */}
      <div style={{ padding: '0 16px 8px 16px', fontSize: '11px', color: '#8c9cb8' }}>
        Tip: Drag any card directly to a board column!
      </div>

      {/* Inbox Items Feed */}
      <div className="inbox-items-feed">
        {inboxItems.length === 0 ? (
          <div className="inbox-empty">
            <span style={{ fontSize: '24px', opacity: 0.7 }}>📭</span>
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#8c9cb8' }}>Your inbox is clear!</p>
          </div>
        ) : (
          inboxItems.map((item) => (
            <DraggableInboxCard
              key={item.id}
              item={item}
              onDelete={onDeleteItem}
              onSendToBoard={onSendToBoard}
              lists={lists}
              selectedListId={selectedListId}
            />
          ))
        )}
      </div>

      {/* Move target selector if lists exist */}
      {lists.length > 0 && (
        <div className="inbox-target-selector">
          <span style={{ fontSize: '11px', color: '#8c9cb8' }}>Target list:</span>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="inbox-list-select"
          >
            {lists.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bottom helper widget */}
      <div className="inbox-bottom-widget">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⚡</span>
          <span style={{ fontSize: '12px', color: '#c1c7d0', fontWeight: 500 }}>
            Consolidate your to-dos
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#8c9cb8' }}>▲</span>
      </div>
    </div>
  );
};

export default InboxPanel;
