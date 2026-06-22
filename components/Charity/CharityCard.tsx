"use client"
import React from 'react'
import type { Charity } from '../../types'

export default function CharityCard({ charity, onSelect }: { charity: Charity; onSelect: (id: string) => void }) {
  return (
    <div className="p-4 bg-gradient-to-br from-surface/40 to-surface/60 rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <img src={charity.logo_url || '/placeholder.png'} alt="logo" className="w-12 h-12 rounded-md object-cover" />
        <div className="flex-1">
          <div className="font-semibold">{charity.name}</div>
          <div className="text-sm text-muted">{charity.description}</div>
        </div>
        <button onClick={() => onSelect(charity.id)} className="ml-4 px-3 py-2 bg-accent rounded-md">Select</button>
      </div>
    </div>
  )
}
