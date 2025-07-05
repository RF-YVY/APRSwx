import React, { useState, useEffect } from 'react';
import { notificationService, Notification } from '../services/notificationService';

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [...prev, notification]);

      // Auto-remove after duration
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notification.duration || 5000);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification-item ${notification.type} visible`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-icon">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <div className="notification-close">✕</div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
