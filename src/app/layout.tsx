import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { ObraProvider } from '@/contexts/ObraContext'
import { AuthLayoutCheck } from '@/components/layout/AuthLayoutCheck'
import ClientNotificationProvider from '@/components/ui/client-notification-provider'
import RoutePersistenceManagerProvider from '@/components/ui/RoutePersistenceManagerProvider'
import { PathDataAttribute } from '@/components/ui/PathDataAttribute'
import SystemInitializer from '@/components/layout/SystemInitializer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Construtivo - Sistema de Controle de Obras',
  description: 'Sistema para acompanhamento e controle de obras da construção civil',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SystemInitializer />
        <AuthProvider>
          <ObraProvider>
            <ClientNotificationProvider>
              <RoutePersistenceManagerProvider>
                <PathDataAttribute />
                <AuthLayoutCheck>
                  {children}
                </AuthLayoutCheck>
              </RoutePersistenceManagerProvider>
            </ClientNotificationProvider>
          </ObraProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 