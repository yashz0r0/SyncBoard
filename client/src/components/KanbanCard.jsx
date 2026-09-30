import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const KanbanCard = ({ card, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id, data: { type: 'Card', card } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // Get initials for assignee avatar
  const getInitials = (userObj) => {
    if (!userObj) return 'SB';
    const name = userObj.name || userObj.email || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={() => onClick(card)}
    >
      <div className="kanban-card-top-row">
        <span className="kanban-card-title">{card.title}</span>
      </div>

      <div className="kanban-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge-priority badge-${card.priority}`}>
            {card.priority}
          </span>
          {card.description && (
            <span className="kanban-card-meta-icon" title="Has description">
              ≡
            </span>
          )}
        </div>

        {card.assignedTo && (
          <div
            className="kanban-avatar-badge"
            title={`Assigned to ${card.assignedTo.name || card.assignedTo.email}`}
          >
            {getInitials(card.assignedTo)}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;
