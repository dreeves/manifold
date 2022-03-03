import * as _ from 'lodash'
import { Bet } from './bet'
import { Binary, CPMM, FullContract } from './contract'
import { FEES } from './fees'

export function getCpmmProbability(pool: { [outcome: string]: number }) {
  // For binary contracts only.
  const { YES, NO } = pool
  return NO / (YES + NO)
}

export function getCpmmProbabilityAfterBet(
  contract: FullContract<CPMM, Binary>,
  outcome: string,
  bet: number
) {
  const { newPool } = calculateCpmmPurchase(contract, bet, outcome)
  return getCpmmProbability(newPool)
}

export function calculateCpmmShares(
  pool: {
    [outcome: string]: number
  },
  k: number,
  bet: number,
  betChoice: string
) {
  const { YES: y, NO: n } = pool
  const numerator = bet ** 2 + bet * (y + n) - k + y * n
  const denominator = betChoice === 'YES' ? bet + n : bet + y
  const shares = numerator / denominator
  return shares
}

export function calculateCpmmPurchase(
  contract: FullContract<CPMM, Binary>,
  bet: number,
  outcome: string
) {
  const { pool, k } = contract

  const shares = calculateCpmmShares(pool, k, bet, outcome)
  const { YES: y, NO: n } = pool

  const [newY, newN] =
    outcome === 'YES'
      ? [y - shares + bet, n + bet]
      : [y + bet, n - shares + bet]

  const newPool = { YES: newY, NO: newN }

  return { shares, newPool }
}

export function calculateCpmmShareValue(
  contract: FullContract<CPMM, Binary>,
  shares: number,
  outcome: string
) {
  const { pool, k } = contract
  const { YES: y, NO: n } = pool

  const poolChange = outcome === 'YES' ? shares + y - n : shares + n - y

  const shareValue = 0.5 * (shares + y + n - Math.sqrt(4 * k + poolChange ** 2))
  return shareValue
}

export function calculateCpmmSale(
  contract: FullContract<CPMM, Binary>,
  bet: Bet
) {
  const { shares, outcome } = bet

  const saleValue = calculateCpmmShareValue(contract, shares, outcome)

  const { pool } = contract
  const { YES: y, NO: n } = pool

  const [newY, newN] =
    outcome === 'YES'
      ? [y + shares - saleValue, n - saleValue]
      : [y - saleValue, n + shares - saleValue]

  const newPool = { YES: newY, NO: newN }

  return { saleValue, newPool }
}

export function getCpmmProbabilityAfterSale(
  contract: FullContract<CPMM, Binary>,
  bet: Bet
) {
  const { newPool } = calculateCpmmSale(contract, bet)
  return getCpmmProbability(newPool)
}

export function calculateFixedPayout(
  contract: FullContract<CPMM, Binary>,
  bet: Bet,
  outcome: string
) {
  if (outcome === 'CANCEL') return calculateFixedCancelPayout(bet)
  if (outcome === 'MKT') return calculateFixedMktPayout(contract, bet)

  return calculateStandardFixedPayout(bet, outcome)
}

export function calculateFixedCancelPayout(bet: Bet) {
  return bet.amount
}

export function calculateStandardFixedPayout(bet: Bet, outcome: string) {
  const { amount, outcome: betOutcome, shares } = bet
  if (betOutcome !== outcome) return 0
  return deductCpmmFees(amount, shares - amount)
}

function calculateFixedMktPayout(
  contract: FullContract<CPMM, Binary>,
  bet: Bet
) {
  const { resolutionProbability, pool } = contract
  const p =
    resolutionProbability !== undefined
      ? resolutionProbability
      : getCpmmProbability(pool)

  const { outcome, amount, shares } = bet

  const betP = outcome === 'YES' ? p : 1 - p
  const winnings = betP * shares

  return deductCpmmFees(amount, winnings)
}

export const deductCpmmFees = (betAmount: number, winnings: number) => {
  return winnings > betAmount
    ? betAmount + (1 - FEES) * (winnings - betAmount)
    : winnings
}