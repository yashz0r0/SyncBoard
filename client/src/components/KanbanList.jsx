import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

const LIST_THEMES = [
  { headerBg: '#3d1b46', containerBg: '#27112d', accent: '#c084fc' }, // Starter Guide / Purple
  { headerBg: '#593e0b', containerBg: '#3b2904', accent: '#facc15' }, // Today / Amber-Gold
  { headerBg: '#144629', containerBg: '#0d2e1b', accent: '#4ade80' }, // This Week / Green
  { headerBg: '#1a365d', containerBg: '#10243e', accent: '#60a5fa' }, // Blue
  { headerBg: '#3730a3', containerBg: '#231f69', accent: '#a5b4fc' }, // Indigo
];

const KanbanList = ({
  list,
  index = 0,
  cards,
  onCardClick,
  onAddCard,
  onDeleteList,
}) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const theme = LIST_THEMES[index % LIST_THEMES.length];

  const { setNodeRef } = useDroppable({
    id: list._id,
    data: { type: 'List', list },
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddCard(list._id, newTitle.trim());
    setNewTitle('');
    setIsAddingCard(false);
  };

  const cardIds = cards.map((c) => c._id);

  return (
    <div
      className="kanban-list"
      style={{
        background: theme.containerBg,
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Themed List Header */}
      <div
        className="kanban-list-header"
        style={{
          background: theme.headerBg,
          borderTop: `3px solid ${theme.accent}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="kanban-list-title">{list.name}</span>
          <span className="kanban-list-count">{cards.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            style={{ color: '#cbd5e1' }}
            title="Delete List"
            onClick={() => onDeleteList(list._id)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Droppable Area & Sortable Cards */}
      <div ref={setNodeRef} className="kanban-cards-area">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card._id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>

      {/* Add Card Form or Trigger */}
      {isAddingCard ? (
        <form onSubmit={handleAddSubmit} className="kanban-add-card-form">
          <input
            type="text"
            className="form-input"
            placeholder="Enter card title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            required
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              Add Card
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => {
                setIsAddingCard(false);
                setNewTitle('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-btn" onClick={() => setIsAddingCard(true)}>
          <span style={{ fontSize: '15px' }}>+</span>
          <span>Add a card</span>
        </button>
      )}
    </div>
  );
};

export default KanbanList;
