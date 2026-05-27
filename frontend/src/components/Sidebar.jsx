import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, COLORS } from '../constants';

function Sidebar({ rooms, currentRoom, onSelectRoom, onCreateRoom,
                   username, onLogout, onSelectUser, currentUser,
                   onlineUsers }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setUsers(res.data)).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newRoomName.trim()) return;
    await onCreateRoom(newRoomName.trim(), newRoomDesc.trim());
    setNewRoomName('');
    setNewRoomDesc('');
    setShowCreate(false);
  };

  return (
    <div style={{
      width: '240px', background: COLORS.sidebar, display: 'flex',
      flexDirection: 'column', borderRight: `1px solid ${COLORS.border}`,
      fontFamily: '"Inter", "Segoe UI", sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span style={{ color: COLORS.text, fontWeight: '700', fontSize: '15px' }}>ChatApp</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

        {/* Rooms section */}
        <div style={{
          padding: '8px 16px 4px', color: COLORS.muted,
          fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>ROOMS</span>
          <button onClick={() => setShowCreate(!showCreate)} style={{
            background: 'none', border: 'none', color: COLORS.muted,
            cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px'
          }}>+</button>
        </div>

        {showCreate && (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${COLORS.border}` }}>
            <input placeholder="Room name" value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: '4px',
                border: `1px solid ${COLORS.border}`, background: COLORS.input,
                color: COLORS.text, fontSize: '13px', boxSizing: 'border-box',
                marginBottom: '6px', outline: 'none'
              }}
            />
            <input placeholder="Description (optional)" value={newRoomDesc}
              onChange={e => setNewRoomDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: '4px',
                border: `1px solid ${COLORS.border}`, background: COLORS.input,
                color: COLORS.text, fontSize: '13px', boxSizing: 'border-box',
                marginBottom: '6px', outline: 'none'
              }}
            />
            <button onClick={handleCreate} style={{
              width: '100%', padding: '6px', background: COLORS.accent,
              color: 'white', border: 'none', borderRadius: '4px',
              cursor: 'pointer', fontSize: '13px'
            }}>Create Room</button>
          </div>
        )}

        {rooms.map(room => (
          <div key={room.id} onClick={() => onSelectRoom(room)}
            style={{
              padding: '6px 16px', cursor: 'pointer', borderRadius: '4px',
              margin: '1px 8px',
              background: currentRoom?.id === room.id && !currentUser
                ? 'rgba(88,101,242,0.2)' : 'transparent',
              color: currentRoom?.id === room.id && !currentUser
                ? COLORS.text : COLORS.muted,
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span style={{ color: COLORS.muted }}>#</span>
            <span>{room.name}</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: COLORS.muted }}>
              {room.memberCount}
            </span>
          </div>
        ))}

        {/* Direct Messages section */}
        <div style={{
          padding: '16px 16px 4px', color: COLORS.muted,
          fontSize: '11px', fontWeight: '600', letterSpacing: '0.8px'
        }}>
          DIRECT MESSAGES
        </div>

        {users.map(user => {
          const isOnline = onlineUsers?.includes(user);
          const isSelected = currentUser === user;
          return (
            <div key={user} onClick={() => onSelectUser(user)}
              style={{
                padding: '6px 16px', cursor: 'pointer', borderRadius: '4px',
                margin: '1px 8px',
                background: isSelected ? 'rgba(88,101,242,0.2)' : 'transparent',
                color: isSelected ? COLORS.text : COLORS.muted,
                fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isOnline ? COLORS.green : COLORS.muted,
                flexShrink: 0
              }} />
              <span>{user}</span>
            </div>
          );
        })}
      </div>

      {/* User footer */}
      <div style={{
        padding: '10px 12px', borderTop: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: COLORS.accent, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px'
        }}>
          {username?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.text, fontSize: '13px', fontWeight: '500' }}>
            {username}
          </div>
          <div style={{ color: COLORS.green, fontSize: '11px' }}>● Online</div>
        </div>
        <button onClick={onLogout} style={{
          background: 'none', border: 'none', color: COLORS.muted,
          cursor: 'pointer', fontSize: '18px', padding: '2px'
        }} title="Sign out">⏻</button>
      </div>
    </div>
  );
}

export default Sidebar;
