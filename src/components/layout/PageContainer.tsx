import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-4 lg:p-8">{children}</div>
    </main>
  )
}
