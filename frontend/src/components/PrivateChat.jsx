import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import { API, WS_URL, COLORS } from '../constants';

function PrivateChat({ otherUser, username, token, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // load history
    axios.get(`${API}/messages/private/${otherUser}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setMessages(res.data)).catch(() => {});

    // connect WebSocket
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        setConnected(true);
        // subscribe to private queue
        client.subscribe(`/user/queue/private`, msg => {
          const message = JSON.parse(msg.body);
          // only show messages relevant to this conversation
          if (message.senderUsername === otherUser ||
              message.receiverUsername === otherUser) {
            setMessages(prev => [...prev, message]);
          }
        });
      },
      onDisconnect: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) clientRef.current.deactivate();
    };
  }, [otherUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !clientRef.current?.connected) return;
    clientRef.current.publish({
      destination: '/app/chat.private',
      body: JSON.stringify({
        content: input.trim(),
        receiverUsername: otherUser
      })
    });
    setInput('');
  };

  const formatTime = (sentAt) => {
    if (!sentAt) return '';
    return new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: COLORS.panel
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#5865f2', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px'
          }}>
            {otherUser?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ color: COLORS.text, fontWeight: '600', fontSize: '14px' }}>
              {otherUser}
            </div>
            <div style={{ fontSize: '11px', color: connected ? COLORS.green : COLORS.muted }}>
              ● {connected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', color: COLORS.muted, border: 'none',
          cursor: 'pointer', fontSize: '20px', padding: '0 4px'
        }}>×</button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '4px'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: COLORS.muted, marginTop: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
            <div style={{ fontSize: '14px' }}>Start a conversation with {otherUser}</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.senderUsername === username;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isOwn ? 'flex-end' : 'flex-start',
              marginBottom: '6px'
            }}>
              <div style={{
                background: isOwn ? COLORS.accent : COLORS.input,
                color: COLORS.text,
                borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 14px', maxWidth: '70%', fontSize: '14px', lineHeight: '1.5'
              }}>
                {msg.deleted
                  ? <em style={{ color: COLORS.muted }}>Message deleted</em>
                  : msg.content}
              </div>
              <span style={{
                color: COLORS.muted, fontSize: '11px',
                marginTop: '2px', marginLeft: '4px', marginRight: '4px'
              }}>
                {formatTime(msg.sentAt)}
                {isOwn && (
                  <span style={{ marginLeft: '4px' }}>
                    {msg.read ? '✓✓' : '✓'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '14px 20px', borderTop: `1px solid ${COLORS.border}`,
        background: COLORS.panel
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${otherUser}`}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '8px',
              border: `1px solid ${COLORS.border}`, background: COLORS.input,
              color: COLORS.text, fontSize: '14px', outline: 'none'
            }}
          />
          <button onClick={sendMessage} style={{
            background: COLORS.accent, color: 'white', border: 'none',
            borderRadius: '8px', padding: '10px 18px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600'
          }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrivateChat;
