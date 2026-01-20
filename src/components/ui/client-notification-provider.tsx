'use client';

import { NotificationProvider, useNotification } from './notification';

export default function ClientNotificationProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

// Re-exportar o hook para facilitar o uso
export { useNotification }; 