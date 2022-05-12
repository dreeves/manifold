import clsx from 'clsx'
import React, { useEffect, useState } from 'react'

import { Col } from './layout/col'
import { User } from 'web/lib/firebase/users'
import { NumberCancelSelector } from './yes-no-selector'
import { Spacer } from './layout/spacer'
import { ResolveConfirmationButton } from './confirmation-button'
import { resolveMarket } from 'web/lib/firebase/api-call'
import { NumericContract } from 'common/contract'
import { getMappedBucket } from 'common/calculate-dpm'
import { BucketInput } from './bucket-input'

export function NumericResolutionPanel(props: {
  creator: User
  contract: NumericContract
  className?: string
}) {
  useEffect(() => {
    // warm up cloud function
    resolveMarket({} as any).catch()
  }, [])

  const { contract, className } = props

  const [outcomeMode, setOutcomeMode] = useState<
    'NUMBER' | 'CANCEL' | undefined
  >()
  const [outcome, setOutcome] = useState<string | undefined>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const resolve = async () => {
    if (!outcome) return

    let outcomeChoice = outcome
    if (outcome !== 'CANCEL') {
      const bucket = getMappedBucket(+outcome, contract)
      outcomeChoice = `${bucket}`
    }

    setIsSubmitting(true)

    const result = await resolveMarket({
      outcome: outcomeChoice,
      contractId: contract.id,
    }).then((r) => r.data)

    console.log('resolved', outcome, 'result:', result)

    if (result?.status !== 'success') {
      setError(result?.message || 'Error resolving market')
    }
    setIsSubmitting(false)
  }

  const submitButtonClass =
    outcome === 'CANCEL'
      ? 'bg-yellow-400 hover:bg-yellow-500'
      : outcome
      ? 'btn-primary'
      : 'btn-disabled'

  console.log('outcome', outcome)

  return (
    <Col className={clsx('rounded-md bg-white px-8 py-6', className)}>
      <div className="mb-6 whitespace-nowrap text-2xl">Resolve market</div>

      <div className="mb-3 text-sm text-gray-500">Outcome</div>

      <Spacer h={4} />

      <NumberCancelSelector selected={outcomeMode} onSelect={setOutcomeMode} />

      <Spacer h={4} />

      {outcomeMode === 'NUMBER' && (
        <BucketInput
          contract={contract}
          isSubmitting={isSubmitting}
          onBucketChange={setOutcome}
        />
      )}

      <div>
        {outcome === 'CANCEL' ? (
          <>All trades will be returned with no fees.</>
        ) : (
          <>Resolving this market will immediately pay out traders.</>
        )}
      </div>

      <Spacer h={4} />

      {!!error && <div className="text-red-500">{error}</div>}

      <ResolveConfirmationButton
        onResolve={resolve}
        isSubmitting={isSubmitting}
        openModalButtonClass={clsx('w-full mt-2', submitButtonClass)}
        submitButtonClass={submitButtonClass}
      />
    </Col>
  )
}