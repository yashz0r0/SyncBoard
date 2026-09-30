import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import KanbanList from '../components/KanbanList';
import CardModal from '../components/CardModal';
import ActivityModal from '../components/ActivityModal';
import InboxPanel from '../components/InboxPanel';
import BottomDock from '../components/BottomDock';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const BoardView = () => {
  const { boardId } = useParams();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inbox State (supports dragging directly from Inbox onto any board list)
  const [inboxItems, setInboxItems] = useState(() => {
    try {
      const saved = localStorage.getItem('syncboard_inbox_items');
      return saved
        ? JSON.parse(saved)
        : [
            { id: '1', title: 'See it, send it, save it for later', createdAt: new Date().toISOString() },
          ];
    } catch {
      return [{ id: '1', title: 'See it, send it, save it for later', createdAt: new Date().toISOString() }];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('syncboard_inbox_items', JSON.stringify(inboxItems));
    } catch (e) {
      console.error(e);
    }
  }, [inboxItems]);

  const [isInboxOpen, setIsInboxOpen] = useState(true);
  const [isStarred, setIsStarred] = useState(false);

  // Drag and Drop active item (supports both Kanban cards and Inbox cards)
  const [activeItem, setActiveItem] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals & Inline Inputs
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [showAddList, setShowAddList] = useState(false);

  // Socket ref
  const socketRef = useRef(null);

  // Require 5px movement before drag activates so clicking to open modal works naturally
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 1. Fetch initial board data & connect Socket.IO
  useEffect(() => {
    fetchBoardData();

    // Connect directly to backend to avoid proxy abort errors
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Join board room
    socket.emit('join:board', boardId);

    // Real-time Event Listeners
    socket.on('card:created', (newCard) => {
      setCards((prev) => {
        if (prev.some((c) => c._id === newCard._id)) return prev;
        return [...prev, newCard];
      });
    });

    socket.on('card:updated', (updatedCard) => {
      setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
      setSelectedCard((prev) => (prev && prev._id === updatedCard._id ? updatedCard : prev));
    });

    socket.on('card:moved', (movedCard) => {
      setCards((prev) => prev.map((c) => (c._id === movedCard._id ? movedCard : c)));
    });

    socket.on('card:deleted', (deletedCardId) => {
      setCards((prev) => prev.filter((c) => c._id !== deletedCardId));
      setSelectedCard((prev) => (prev && prev._id === deletedCardId ? null : prev));
    });

    socket.on('list:created', (newList) => {
      setLists((prev) => (prev.some((l) => l._id === newList._id) ? prev : [...prev, newList]));
    });

    socket.on('list:deleted', (deletedListId) => {
      setLists((prev) => prev.filter((l) => l._id !== deletedListId));
      setCards((prev) => prev.filter((c) => c.listId !== deletedListId));
    });

    // Cleanup on unmount or board change
    return () => {
      socket.emit('leave:board', boardId);
      socket.disconnect();
    };
  }, [boardId]);

  // 2. Fetch cards when search/filter change
  useEffect(() => {
    if (boardId) {
      fetchCards();
    }
  }, [search, priorityFilter]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      setError('');

      const boardRes = await api.get(`/boards/${boardId}`);
      setBoard(boardRes.data.data);

      const listsRes = await api.get(`/lists/board/${boardId}`);
      setLists(listsRes.data.data || []);

      await fetchCards();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    try {
      let url = `/cards/${boardId}?limit=100`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;

      const res = await api.get(url);
      setCards(res.data.data || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
    }
  };

  // 3. Drag and Drop Handlers (Inbox -> List and Card -> Card/List)
  const handleDragStart = (event) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'InboxCard') {
      setActiveItem({ type: 'InboxCard', item: activeData.item });
    } else {
      const card = cards.find((c) => c._id === active.id);
      if (card) setActiveItem({ type: 'Card', card });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeData = active.data.current;

    // A. DRAGGING FROM INBOX DIRECTLY ONTO A BOARD LIST!
    if (activeData?.type === 'InboxCard') {
      const inboxItem = activeData.item;
      const overId = over.id;

      let targetListId;
      const isOverList = lists.some((l) => l._id === overId);
      if (isOverList) {
        targetListId = overId;
      } else {
        const overCard = cards.find((c) => c._id === overId);
        if (overCard) targetListId = overCard.listId;
      }

      if (!targetListId) return;

      // 1. Remove from Inbox
      setInboxItems((prev) => prev.filter((i) => i.id !== inboxItem.id));

      // 2. Add to the target board list in database
      await handleAddCard(targetListId, inboxItem.title);
      return;
    }

    // B. REORDERING/MOVING EXISTING BOARD CARDS
    const activeCardId = active.id;
    const overId = over.id;

    const movingCard = cards.find((c) => c._id === activeCardId);
    if (!movingCard) return;

    const isOverList = lists.some((l) => l._id === overId);
    let targetListId;
    let targetPosition;

    if (isOverList) {
      targetListId = overId;
      const targetListCards = cards.filter((c) => c.listId === targetListId && c._id !== activeCardId);
      targetPosition = targetListCards.length;
    } else {
      const overCard = cards.find((c) => c._id === overId);
      if (!overCard) return;
      targetListId = overCard.listId;
      targetPosition = overCard.position;
    }

    if (movingCard.listId === targetListId && movingCard.position === targetPosition) {
      return;
    }

    // Optimistic UI update
    const updatedCards = cards.map((c) => {
      if (c._id === activeCardId) {
        return { ...c, listId: targetListId, position: targetPosition };
      }
      return c;
    });
    setCards(updatedCards);

    // Persist to backend
    try {
      await api.patch(`/cards/${activeCardId}/move`, {
        listId: targetListId,
        position: targetPosition,
      });
    } catch (err) {
      console.error('Failed to persist card move:', err);
      fetchCards();
    }
  };

  // 4. Create List
  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    try {
      const res = await api.post('/lists', {
        name: newListTitle,
        boardId,
      });
      setLists([...lists, res.data.data]);
      setNewListTitle('');
      setShowAddList(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create list');
    }
  };

  // 5. Delete List
  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list and all its cards?')) return;

    try {
      await api.delete(`/lists/${listId}`);
      setLists(lists.filter((l) => l._id !== listId));
      setCards(cards.filter((c) => c.listId !== listId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete list');
    }
  };

  // 6. Create Card (also used when moving or dropping from Inbox)
  const handleAddCard = async (listId, title) => {
    try {
      const res = await api.post('/cards', {
        title,
        listId,
        boardId,
      });
      setCards((prev) => {
        if (prev.some((c) => c._id === res.data.data._id)) return prev;
        return [...prev, res.data.data];
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create card');
    }
  };

  // 7. Update Card
  const handleSaveCard = async (updatedData) => {
    try {
      const res = await api.patch(`/cards/${updatedData._id}`, updatedData);
      setCards(cards.map((c) => (c._id === updatedData._id ? res.data.data : c)));
      setIsModalOpen(false);
      setSelectedCard(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update card');
    }
  };

  // 8. Delete Card
  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;

    try {
      await api.delete(`/cards/${cardId}`);
      setCards(cards.filter((c) => c._id !== cardId));
      setIsModalOpen(false);
      setSelectedCard(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete card');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('📋 Board link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="board-loading-screen">
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
        <p style={{ color: '#c1c7d0', fontSize: '14px' }}>Loading Board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trello-board-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="error-banner">{error}</div>
        <Link to="/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="trello-board-page">
      {/* Top Global Navbar */}
      <Navbar onQuickCreate={() => setShowAddList(true)} />

      {/* DndContext wrapping BOTH Inbox and Board so you can drag from Inbox straight onto lists! */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="trello-workspace-layout">
          {/* Left Panel: Inbox (supports dragging cards directly out) */}
          <InboxPanel
            isOpen={isInboxOpen}
            onClose={() => setIsInboxOpen(false)}
            lists={lists}
            inboxItems={inboxItems}
            onAddItem={(title) => {
              const newItem = { id: Date.now().toString(), title, createdAt: new Date().toISOString() };
              setInboxItems([newItem, ...inboxItems]);
            }}
            onDeleteItem={(id) => {
              setInboxItems(inboxItems.filter((i) => i.id !== id));
            }}
            onSendToBoard={async (item, listId) => {
              const target = listId || (lists.length > 0 ? lists[0]._id : null);
              if (!target) return;
              setInboxItems(inboxItems.filter((i) => i.id !== item.id));
              await handleAddCard(target, item.title);
            }}
          />

          {/* Right Canvas: Themed Board View */}
          <div className="trello-board-canvas-area">
            {/* Board Header Bar */}
            <div className="trello-board-header">
              <div className="trello-board-header-left">
                <Link
                  to="/dashboard"
                  className="trello-board-back-btn"
                  title="Back to Dashboard"
                >
                  ← Boards
                </Link>

                <h1 className="trello-board-title">{board?.name || 'My Trello board'}</h1>

                <span className="trello-board-view-icon" title="Board View">
                  000 ▾
                </span>

                <span className="trello-board-live-tag">
                  ● Live Sync
                </span>

                <button
                  className={`trello-icon-btn ${isStarred ? 'starred' : ''}`}
                  onClick={() => setIsStarred(!isStarred)}
                  title="Star Board"
                >
                  {isStarred ? '★' : '☆'}
                </button>

                <span className="trello-board-lock-icon" title="Workspace visible">
                  🔒
                </span>
              </div>

              <div className="trello-board-header-right">
                {/* Share Button */}
                <button className="trello-share-btn" onClick={handleShare}>
                  <span>+</span>
                  <span>Share</span>
                </button>

                {/* Owner-only History Button */}
                {board?.workspaceId?.owner === user?._id && (
                  <button
                    className="trello-board-action-btn"
                    onClick={() => setIsActivityOpen(true)}
                    title="View Audit History"
                  >
                    📜 History
                  </button>
                )}

                {/* Search Cards */}
                <input
                  type="text"
                  className="trello-board-search-input"
                  placeholder="Search cards..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {/* Priority Filter */}
                <select
                  className="trello-board-filter-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="trello-kanban-canvas">
              {lists.map((list, idx) => {
                const listCards = cards.filter((c) => c.listId === list._id);

                return (
                  <KanbanList
                    key={list._id}
                    list={list}
                    index={idx}
                    cards={listCards}
                    onCardClick={(card) => {
                      setSelectedCard(card);
                      setIsModalOpen(true);
                    }}
                    onAddCard={handleAddCard}
                    onDeleteList={handleDeleteList}
                  />
                );
              })}

              {/* Add New List Column */}
              <div className="add-list-panel">
                {showAddList ? (
                  <div className="kanban-list" style={{ background: '#27112d', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <form onSubmit={handleAddList}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter list title..."
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        autoFocus
                        required
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ padding: '6px 12px' }}
                        >
                          Add List
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px' }}
                          onClick={() => {
                            setShowAddList(false);
                            setNewListTitle('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button className="trello-add-list-btn" onClick={() => setShowAddList(true)}>
                    <span>+</span>
                    <span>Add another list</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Floating Navigation Pill Dock */}
          <BottomDock
            isInboxOpen={isInboxOpen}
            onToggleInbox={() => setIsInboxOpen(!isInboxOpen)}
            currentBoardId={boardId}
          />
        </div>

        {/* Unified Drag Overlay for both Inbox items and Kanban cards */}
        <DragOverlay>
          {activeItem?.type === 'InboxCard' ? (
            <div
              className="inbox-card-item"
              style={{
                transform: 'rotate(2deg)',
                boxShadow: '0 16px 32px rgba(0,0,0,0.6)',
                width: '240px',
                borderColor: '#38bdf8',
                background: '#1e293b',
              }}
            >
              <div className="inbox-card-title">{activeItem.item.title}</div>
              <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>
                Drop into any list ↘
              </div>
            </div>
          ) : activeItem?.type === 'Card' ? (
            <div
              className="kanban-card"
              style={{
                transform: 'rotate(2deg)',
                boxShadow: '0 16px 32px rgba(0,0,0,0.6)',
                borderColor: '#c084fc',
              }}
            >
              <div className="kanban-card-title">{activeItem.card.title}</div>
              <div className="kanban-card-footer">
                <span className={`badge-priority badge-${activeItem.card.priority}`}>
                  {activeItem.card.priority}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card Details Modal */}
      <CardModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />

      {/* Activity History Modal (Workspace Owner Only) */}
      <ActivityModal
        boardId={boardId}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  );
};

export default BoardView;
