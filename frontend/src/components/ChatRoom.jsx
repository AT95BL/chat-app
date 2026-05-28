import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import { API, WS_URL, COLORS } from '../constants';

function ChatRoom({ room, username, token, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const bottomRef = useRef(null);

  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef({});

  useEffect(() => {
    // load history
    axios.get(`${API}/rooms/${room.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setMessages(res.data));

    // connect WebSocket
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        setConnected(true);

        // subscribe to room topic
        client.subscribe(`/topic/room.${room.id}.typing`, msg => {
          const event = JSON.parse(msg.body);
          if (event.username === username) return;

          setTypingUsers(prev => {
            if (!prev.includes(event.username)) return [...prev, event.username];
            return prev;
          });

          // clear typing after 2 seconds of no events
          clearTimeout(typingTimeoutRef.current[event.username]);
          typingTimeoutRef.current[event.username] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== event.username));
          }, 2000);
        });

        // announce join
        client.publish({
          destination: '/app/chat.join',
          body: JSON.stringify({ roomId: room.id, content: '' })
        });

        // subscribe to room messages — ADD THIS, it's missing
      client.subscribe(`/topic/room.${room.id}`, msg => {
        const message = JSON.parse(msg.body);
        setMessages(prev => [...prev, message]);
      });

      // subscribe to delete events — ADD THIS TOO
      client.subscribe(`/topic/room.${room.id}.delete`, msg => {
        const event = JSON.parse(msg.body);
        setMessages(prev => prev.map(m =>
          m.id === event.messageId ? { ...m, deleted: true } : m
        ));
    });
      },
      onDisconnect: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) clientRef.current.deactivate();
    };
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !clientRef.current?.connected) return;
    clientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ roomId: room.id, content: input.trim() })
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
        <div>
          <span style={{ color: COLORS.text, fontWeight: '600', fontSize: '15px' }}>
            # {room.name}
          </span>
          {room.description && (
            <span style={{ color: COLORS.muted, fontSize: '13px', marginLeft: '10px' }}>
              {room.description}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: connected ? COLORS.green : COLORS.red }}>
            ● {connected ? 'Connected' : 'Disconnected'}
          </span>
          <button onClick={onLeave} style={{
            background: 'rgba(237,66,69,0.15)', color: COLORS.red,
            border: '1px solid rgba(237,66,69,0.3)', borderRadius: '4px',
            padding: '4px 12px', cursor: 'pointer', fontSize: '12px'
          }}>
            Leave
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '4px'
      }}>
        {messages.map((msg, i) => {
          const isSystem = msg.type === 'JOIN' || msg.type === 'LEAVE';
          const isOwn = msg.senderUsername === username;

          if (isSystem) return (
            <div key={i} style={{ textAlign: 'center', color: COLORS.muted, fontSize: '12px', padding: '4px 0' }}>
              {msg.content}
            </div>
          );

          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isOwn ? 'flex-end' : 'flex-start',
              marginBottom: '6px'
            }}>
              {!isOwn && (
                <span style={{ color: COLORS.accent, fontSize: '12px', fontWeight: '600', marginBottom: '2px', marginLeft: '4px' }}>
                  {msg.senderUsername}
                </span>
              )}
              
              {/* OVDJE JE UBACIŠ: Novi isječak koda zamjenjuje stari div za oblačić poruke */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                {isOwn && !msg.deleted && (
                  <button
                    onClick={() => clientRef.current?.publish({
                      destination: '/app/chat.delete',
                      body: JSON.stringify({ messageId: msg.id, roomId: room.id })
                    })}
                    style={{
                      background: 'none', border: 'none', color: COLORS.muted,
                      cursor: 'pointer', fontSize: '14px', padding: '2px', opacity: 0.5
                    }}
                  >🗑</button>
                )}
              </div>

              <span style={{ color: COLORS.muted, fontSize: '11px', marginTop: '2px', marginLeft: '4px', marginRight: '4px' }}>
                {formatTime(msg.sentAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      
      {typingUsers.length > 0 && (
            <div style={{
              padding: '4px 20px', fontSize: '12px', color: COLORS.muted,
              fontStyle: 'italic'
            }}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
              <span style={{ animation: 'pulse 1s infinite' }}>...</span>
            </div>
      )}
      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.panel }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            value={input}
            // onChange={e => setInput(e.target.value)}
            onChange={e => {
              setInput(e.target.value);
              if (clientRef.current?.connected) {
                clientRef.current.publish({
                  destination: '/app/chat.typing',
                  body: JSON.stringify({ roomId: room.id, content: '' })
                });
              }
            }}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message #${room.name}`}
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

export default ChatRoom;
