import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatRoom from './components/ChatRoom';
import { API, COLORS } from './constants';

function OAuth2Callback({ onLogin }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const username = params.get('username');
    const role = params.get('role');
    if (token && username && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      localStorage.setItem('role', role);
      onLogin({ token, username, role });
      window.history.replaceState({}, '', '/');
    }
  }, []);
  return (
    <div style={{ color: 'white', textAlign: 'center', marginTop: '80px', background: COLORS.bg, minHeight: '100vh' }}>
      Signing you in...
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? { token, username: localStorage.getItem('username'), role: localStorage.getItem('role') } : null;
  });
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  const isOAuth2Callback = window.location.pathname === '/oauth2/callback';

  const token = user?.token;

  const fetchRooms = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  const handleLogin = (data) => { setUser(data); };
  const handleLogout = () => { localStorage.clear(); setUser(null); setCurrentRoom(null); setRooms([]); };

  const handleSelectRoom = async (room) => {
    // join the room if not already a member
    try {
      await axios.post(`${API}/rooms/${room.id}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
    setCurrentRoom(room);
  };

  const handleCreateRoom = async (name, description) => {
    try {
      const res = await axios.post(`${API}/rooms`, { name, description }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(prev => [...prev, res.data]);
      setCurrentRoom(res.data);
    } catch (err) {
      console.error('Failed to create room', err);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    try {
      await axios.delete(`${API}/rooms/${currentRoom.id}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
    setCurrentRoom(null);
    fetchRooms();
  };

  if (isOAuth2Callback) return <OAuth2Callback onLogin={handleLogin} />;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div style={{
      display: 'flex', height: '100vh', background: COLORS.bg,
      fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden'
    }}>
      <Sidebar
        rooms={rooms}
        currentRoom={currentRoom}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
        username={user.username}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentRoom ? (
          <ChatRoom
            room={currentRoom}
            username={user.username}
            token={token}
            onLeave={handleLeaveRoom}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: COLORS.muted
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h2 style={{ color: COLORS.text, margin: 0 }}>Welcome, {user.username}!</h2>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              Select a room from the sidebar or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
