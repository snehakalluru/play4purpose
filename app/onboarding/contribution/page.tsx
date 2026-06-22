import ContributionSelector from '../../../components/Onboarding/ContributionSelector'
import React, { Suspense } from 'react'

export default function ContributionPage() {
  return (
    <div className="min-h-screen p-8 bg-background text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl mb-6">Choose your charity contribution</h1>
        <Suspense fallback={<div>Loading contribution options...</div>}>
          <ContributionSelector />
        </Suspense>
      </div>
    </div>
  )
}
