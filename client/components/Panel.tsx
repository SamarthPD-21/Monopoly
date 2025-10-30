import React from 'react'

export default function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 panel rounded-md border ${className}`}>
      {children}
    </div>
  )
}

