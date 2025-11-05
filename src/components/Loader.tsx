import React from 'react'

type LoaderProps = {
  show?: boolean
  text?: string
}

function Loader({ show = false, text = 'Loading...' }: LoaderProps) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/10 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg border border-gray-200">
        <div className="h-6 w-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="text-sm font-medium text-gray-800">{text}</div>
      </div>
    </div>
  )
}

export default Loader


