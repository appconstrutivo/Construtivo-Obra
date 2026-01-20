import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationProps {
  open: boolean;
  title: string;
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose: () => void;
  action?: React.ReactNode;
}

const icons = {
  info: <Info className="h-5 w-5 text-blue-600" />,
  success: <CheckCircle className="h-5 w-5 text-green-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  error: <AlertCircle className="h-5 w-5 text-red-600" />,
};

const colors = {
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
};

export function Notification({
  open,
  title,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  action,
}: NotificationProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  // Não renderizar até estar montado no cliente
  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex px-4 py-6 pointer-events-none justify-center items-start z-50">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'max-w-md w-full pointer-events-auto overflow-hidden rounded-lg border shadow-lg',
              colors[type]
            )}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">{icons[type]}</div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="mt-1 text-sm text-gray-500">{message}</p>
                  {action && <div className="mt-3">{action}</div>}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={onClose}
                    className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Fechar</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Gerenciador de notificações global
type NotificationItem = Omit<NotificationProps, 'open' | 'onClose'> & { id: string };

interface NotificationContextType {
  showNotification: (props: Omit<NotificationItem, 'id'>) => string;
  hideNotification: (id: string) => void;
}

const NotificationContext = React.createContext<NotificationContextType>({
  showNotification: () => '',
  hideNotification: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  const showNotification = React.useCallback((props: Omit<NotificationItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { ...props, id }]);
    return id;
  }, []);

  const hideNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          open={true}
          onClose={() => hideNotification(notification.id)}
          {...notification}
        />
      ))}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 