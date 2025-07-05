// Simple notification service for user feedback
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

class NotificationService {
  private listeners: Array<(notification: Notification) => void> = [];

  public subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public show(type: NotificationType, title: string, message: string, duration = 5000): void {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      duration
    };

    this.listeners.forEach(listener => listener(notification));
  }

  public success(title: string, message: string): void {
    this.show('success', title, message);
  }

  public error(title: string, message: string): void {
    this.show('error', title, message);
  }

  public warning(title: string, message: string): void {
    this.show('warning', title, message);
  }

  public info(title: string, message: string): void {
    this.show('info', title, message);
  }
}

export const notificationService = new NotificationService();
