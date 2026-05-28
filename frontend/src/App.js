import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatRoom from './components/ChatRoom';
import PrivateChat from './components/PrivateChat';
import { API, WS_URL, COLORS } from './constants';

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
    return token ? {
      token,
      username: localStorage.getItem('username'),
      role: localStorage.getItem('role')
    } : null;
  });

  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPrivateUser, setCurrentPrivateUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const presenceClientRef = React.useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const token = user?.token;
  const username = user?.username;
  const isOAuth2Callback = window.location.pathname === '/oauth2/callback';

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

  // presence WebSocket — separate connection just for online tracking
  // presence WebSocket — separate connection just for online tracking and global topics
  useEffect(() => {
    if (!user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
       console.log("WebSocket connected successfully!");

        // 1. Unread counts subscription
        client.subscribe('/user/queue/unread', msg => {
          const data = JSON.parse(msg.body);
          setUnreadCounts(prev => ({ ...prev, [data.roomId]: data.count }));
        });

        // 2. Presence subscription — Sada je na pravom mjestu! ✅
        client.subscribe('/topic/presence', msg => {
          const users = JSON.parse(msg.body);
          setOnlineUsers(Array.isArray(users) ? users : Object.values(users));
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      }
    });

    client.activate();
    presenceClientRef.current = client;

    // Fetch initial unread counts preko Axios-a odmah pri logovanju
    axios.get(`${API}/rooms/unread`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setUnreadCounts(res.data))
    .catch(err => console.error("Failed to fetch initial unread counts", err));

    return () => {
      if (presenceClientRef.current) {
        presenceClientRef.current.deactivate();
      }
    };
  }, [user, token]); // Dodat token u dependency niz radi bezbjednosti huka

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  const handleLogin = (data) => setUser(data);

  const handleLogout = () => {
    if (presenceClientRef.current) presenceClientRef.current.deactivate();
    localStorage.clear();
    setUser(null);
    setCurrentRoom(null);
    setCurrentPrivateUser(null);
    setRooms([]);
  };

  const handleSelectRoom = async (room) => {
  setCurrentPrivateUser(null);
    try {
      await axios.post(`${API}/rooms/${room.id}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // mark as read
      await axios.post(`${API}/rooms/${room.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
      setUnreadCounts(prev => ({ ...prev, [room.id]: 0 }));
      setCurrentRoom(room);
  };

  const handleSelectUser = (selectedUsername) => {
    setCurrentRoom(null);
    setCurrentPrivateUser(selectedUsername);
  };

  const handleCreateRoom = async (name, description) => {
    try {
      const res = await axios.post(`${API}/rooms`, { name, description }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(prev => [...prev, res.data]);
      setCurrentRoom(res.data);
      setCurrentPrivateUser(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
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
        currentUser={currentPrivateUser}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
        onSelectUser={handleSelectUser}
        username={username}
        onLogout={handleLogout}
        onlineUsers={onlineUsers}
        unreadCounts={unreadCounts}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentRoom && (
          <ChatRoom
            room={currentRoom}
            username={username}
            token={token}
            onLeave={handleLeaveRoom}
          />
        )}

        {currentPrivateUser && (
          <PrivateChat
            otherUser={currentPrivateUser}
            username={username}
            token={token}
            onClose={() => setCurrentPrivateUser(null)}
          />
        )}

        {!currentRoom && !currentPrivateUser && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: COLORS.muted
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h2 style={{ color: COLORS.text, margin: 0 }}>Welcome, {username}!</h2>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              Select a room or start a direct message
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
