import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSMessage } from '../types/aprs';

interface MessagePanelProps {
  className?: string;
}

const MessagePanel: React.FC<MessagePanelProps> = ({ className }) => {
  const { messages, sendMessage, isConnected } = useWebSocket();
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [filter, setFilter] = useState('');
  const [showOnlyToMe, setShowOnlyToMe] = useState(false);
  const [myCallsign, setMyCallsign] = useState(''); // TODO: Get from user settings
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const isMyMessage = (message: APRSMessage): boolean => {
    return message.source_callsign === myCallsign;
  };

  const isMessageToMe = (message: APRSMessage): boolean => {
    return message.addressee === myCallsign;
  };

  const filteredMessages = messages.filter(message => {
    // Filter by search term
    if (filter && !message.source_callsign.toLowerCase().includes(filter.toLowerCase()) && 
        !message.addressee.toLowerCase().includes(filter.toLowerCase()) &&
        !message.message_text.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    
    // Filter messages to/from me
    if (showOnlyToMe && !isMyMessage(message) && !isMessageToMe(message)) {
      return false;
    }
    
    return true;
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !recipient.trim() || !isConnected) {
      return;
    }

    // Send message via WebSocket
    sendMessage({
      type: 'send_message',
      addressee: recipient.toUpperCase(),
      message: newMessage.trim(),
      source_callsign: myCallsign
    });

    // Clear form
    setNewMessage('');
    setRecipient('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageType = (message: APRSMessage): 'sent' | 'received' | 'bulletin' => {
    if (isMyMessage(message)) {
      return 'sent';
    } else if (isMessageToMe(message)) {
      return 'received';
    }
    return 'bulletin';
  };

  const getMessageIcon = (message: APRSMessage): string => {
    if (message.is_ack) return '✅';
    
    switch (getMessageType(message)) {
      case 'sent': return '📤';
      case 'received': return '📥';
      case 'bulletin': return '📢';
      default: return '💬';
    }
  };

  const getUniqueCallsigns = (): string[] => {
    const callsigns = new Set<string>();
    messages.forEach(message => {
      callsigns.add(message.source_callsign);
      callsigns.add(message.addressee);
    });
    return Array.from(callsigns).sort();
  };

  return (
    <div className={`message-panel ${className || ''}`}>
      <div className="message-panel-header">
        <h3>Messages ({messages.length})</h3>
        
        <div className="message-controls">
          <input
            type="text"
            placeholder="Filter messages..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="message-filter"
          />
          
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showOnlyToMe}
              onChange={(e) => setShowOnlyToMe(e.target.checked)}
            />
            My messages only
          </label>
        </div>
      </div>

      <div className="message-content">
        <div className="message-list">
          {filteredMessages.length === 0 ? (
            <div className="no-messages">
              <p>No messages found</p>
              {filter && <p>Try adjusting your search terms</p>}
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`message-item ${getMessageType(message)} ${message.is_ack ? 'ack' : ''}`}
              >
                <div className="message-header">
                  <div className="message-info">
                    <span className="message-icon">
                      {getMessageIcon(message)}
                    </span>
                    <span className="message-route">
                      {message.source_callsign} → {message.addressee}
                    </span>
                    {message.message_number && (
                      <span className="message-number">
                        #{message.message_number}
                      </span>
                    )}
                  </div>
                  <div className="message-time">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
                
                <div className="message-text">
                  {message.message_text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="message-compose">
        <div className="compose-header">
          <h4>Send Message</h4>
          <div className="connection-status">
            {isConnected ? (
              <span className="connected">🟢 Connected</span>
            ) : (
              <span className="disconnected">🔴 Disconnected</span>
            )}
          </div>
        </div>
        
        <div className="compose-form">
          <div className="compose-inputs">
            <div className="input-group">
              <label>From:</label>
              <input
                type="text"
                placeholder="Your callsign"
                value={myCallsign}
                onChange={(e) => setMyCallsign(e.target.value.toUpperCase())}
                className="callsign-input"
                maxLength={9}
              />
            </div>
            
            <div className="input-group">
              <label>To:</label>
              <input
                type="text"
                placeholder="Recipient callsign"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.toUpperCase())}
                className="callsign-input"
                maxLength={9}
                list="callsign-list"
              />
              <datalist id="callsign-list">
                {getUniqueCallsigns().map(callsign => (
                  <option key={callsign} value={callsign} />
                ))}
              </datalist>
            </div>
          </div>
          
          <div className="message-input-group">
            <textarea
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="message-input"
              rows={3}
              maxLength={67} // APRS message limit
              disabled={!isConnected}
            />
            <div className="message-info">
              <span className="char-count">
                {newMessage.length}/67
              </span>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !recipient.trim() || !myCallsign.trim() || !isConnected}
                className="send-button"
              >
                Send 📤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePanel;
