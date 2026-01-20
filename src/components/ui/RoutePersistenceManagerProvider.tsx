'use client';

import { ReactNode } from 'react';
import RoutePersistenceManager from './RoutePersistenceManager';

export default function RoutePersistenceManagerProvider({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <>
      <RoutePersistenceManager />
      {children}
    </>
  );
} 