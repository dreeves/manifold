import clsx from 'clsx'
import _ from 'lodash'
import { useEffect, useRef, useState } from 'react'
import { XIcon } from '@heroicons/react/solid'

import { Answer } from '../../../common/answer'
import { Contract } from '../../../common/contract'
import { AmountInput } from '../amount-input'
import { Col } from '../layout/col'
import { placeBet } from '../../lib/firebase/api-call'
import { Row } from '../layout/row'
import { Spacer } from '../layout/spacer'
import {
  formatMoney,
  formatPercent,
  formatWithCommas,
} from '../../../common/util/format'
import { InfoTooltip } from '../info-tooltip'
import { useUser } from '../../hooks/use-user'
import {
  getProbabilityAfterBet,
  getOutcomeProbability,
  calculateShares,
  calculatePayoutAfterCorrectBet,
} from '../../../common/calculate'
import { firebaseLogin } from '../../lib/firebase/users'
import { Bet } from '../../../common/bet'

export function AnswerBetPanel(props: {
  answer: Answer
  contract: Contract
  closePanel: () => void
}) {
  const { answer, contract, closePanel } = props
  const { id: answerId } = answer

  const user = useUser()
  const [betAmount, setBetAmount] = useState<number | undefined>(undefined)

  const [error, setError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputRef = useRef<HTMLElement>(null)
  useEffect(() => {
    inputRef.current && inputRef.current.focus()
  }, [])

  async function submitBet() {
    if (!user || !betAmount) return

    if (user.balance < betAmount) {
      setError('Insufficient balance')
      return
    }

    setError(undefined)
    setIsSubmitting(true)

    const result = await placeBet({
      amount: betAmount,
      outcome: answerId,
      contractId: contract.id,
    }).then((r) => r.data as any)

    console.log('placed bet. Result:', result)

    if (result?.status === 'success') {
      setIsSubmitting(false)
      closePanel()
    } else {
      setError(result?.error || 'Error placing bet')
      setIsSubmitting(false)
    }
  }

  const betDisabled = isSubmitting || !betAmount || error

  const initialProb = getOutcomeProbability(contract.totalShares, answer.id)

  const resultProb = getProbabilityAfterBet(
    contract.totalShares,
    answerId,
    betAmount ?? 0
  )

  const shares = calculateShares(contract.totalShares, betAmount ?? 0, answerId)

  const currentPayout = betAmount
    ? calculatePayoutAfterCorrectBet(contract, {
        outcome: answerId,
        amount: betAmount,
        shares,
      } as Bet)
    : 0

  const currentReturn = betAmount ? (currentPayout - betAmount) / betAmount : 0
  const currentReturnPercent = (currentReturn * 100).toFixed() + '%'

  return (
    <Col className="items-start px-2 pb-2 pt-4 sm:pt-0">
      <Row className="self-stretch items-center justify-between">
        <div className="text-xl">Buy this answer</div>

        <button className="btn-ghost btn-circle" onClick={closePanel}>
          <XIcon className="w-8 h-8 text-gray-500 mx-auto" aria-hidden="true" />
        </button>
      </Row>
      <div className="my-3 text-left text-sm text-gray-500">Amount </div>
      <AmountInput
        inputClassName="w-full"
        amount={betAmount}
        onChange={setBetAmount}
        error={error}
        setError={setError}
        disabled={isSubmitting}
        inputRef={inputRef}
      />

      <Spacer h={4} />

      <div className="mt-2 mb-1 text-sm text-gray-500">Implied probability</div>
      <Row>
        <div>{formatPercent(initialProb)}</div>
        <div className="mx-2">→</div>
        <div>{formatPercent(resultProb)}</div>
      </Row>

      <Spacer h={4} />

      <Row className="mt-2 mb-1 items-center gap-2 text-sm text-gray-500">
        Payout if chosen
        <InfoTooltip
          text={`Current payout for ${formatWithCommas(
            shares
          )} / ${formatWithCommas(
            shares + contract.totalShares[answerId]
          )} shares`}
        />
      </Row>
      <div>
        {formatMoney(currentPayout)}
        &nbsp; <span>(+{currentReturnPercent})</span>
      </div>

      <Spacer h={6} />

      {user ? (
        <button
          className={clsx(
            'btn',
            betDisabled ? 'btn-disabled' : 'btn-primary',
            isSubmitting ? 'loading' : ''
          )}
          onClick={betDisabled ? undefined : submitBet}
        >
          {isSubmitting ? 'Submitting...' : 'Submit trade'}
        </button>
      ) : (
        <button
          className="btn mt-4 whitespace-nowrap border-none bg-gradient-to-r from-teal-500 to-green-500 px-10 text-lg font-medium normal-case hover:from-teal-600 hover:to-green-600"
          onClick={firebaseLogin}
        >
          Sign in to trade!
        </button>
      )}
    </Col>
  )
}