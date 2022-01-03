import { Bet } from './firebase/bets'
import { Contract } from './firebase/contracts'

const fees = 0.02

export function getProbability(pool: { YES: number; NO: number }) {
  const [yesPool, noPool] = [pool.YES, pool.NO]
  const numerator = Math.pow(yesPool, 2)
  const denominator = Math.pow(yesPool, 2) + Math.pow(noPool, 2)
  return numerator / denominator
}

export function getProbabilityAfterBet(
  pool: { YES: number; NO: number },
  outcome: 'YES' | 'NO',
  bet: number
) {
  const [YES, NO] = [
    pool.YES + (outcome === 'YES' ? bet : 0),
    pool.NO + (outcome === 'NO' ? bet : 0),
  ]
  return getProbability({ YES, NO })
}

export function calculateShares(
  pool: { YES: number; NO: number },
  bet: number,
  betChoice: 'YES' | 'NO'
) {
  const [yesPool, noPool] = [pool.YES, pool.NO]

  return betChoice === 'YES'
    ? bet + (bet * noPool ** 2) / (yesPool ** 2 + bet * yesPool)
    : bet + (bet * yesPool ** 2) / (noPool ** 2 + bet * noPool)
}

export function calculatePayout(
  contract: Contract,
  bet: Bet,
  outcome: 'YES' | 'NO' | 'CANCEL' | 'MKT'
) {
  const { amount, outcome: betOutcome, shares } = bet

  if (outcome === 'CANCEL') return amount
  if (outcome === 'MKT') return calculateMktPayout(contract, bet)

  if (betOutcome !== outcome) return 0

  const { totalShares, totalBets } = contract

  if (totalShares[outcome] === 0) return 0

  const startPool = contract.startPool.YES + contract.startPool.NO
  const truePool = contract.pool.YES + contract.pool.NO - startPool

  if (totalBets[outcome] >= truePool)
    return (amount / totalBets[outcome]) * truePool

  const total = totalShares[outcome] - totalBets[outcome]
  const winningsPool = truePool - totalBets[outcome]

  return (1 - fees) * (amount + ((shares - amount) / total) * winningsPool)
}

function calculateMktPayout(contract: Contract, bet: Bet) {
  const p =
    contract.pool.YES ** 2 / (contract.pool.YES ** 2 + contract.pool.NO ** 2)
  const weightedTotal =
    p * contract.totalBets.YES + (1 - p) * contract.totalBets.NO

  const startPool = contract.startPool.YES + contract.startPool.NO
  const truePool = contract.pool.YES + contract.pool.NO - startPool

  const betP = bet.outcome === 'YES' ? p : 1 - p

  if (weightedTotal >= truePool) {
    return ((betP * bet.amount) / weightedTotal) * truePool
  }

  const winningsPool = truePool - weightedTotal

  const weightedShareTotal =
    p * (contract.totalShares.YES - contract.totalBets.YES) +
    (1 - p) * (contract.totalShares.NO - contract.totalBets.NO)

  return (
    (1 - fees) *
    (betP * bet.amount +
      ((betP * (bet.shares - bet.amount)) / weightedShareTotal) * winningsPool)
  )
}

export function resolvedPayout(contract: Contract, bet: Bet) {
  if (contract.resolution)
    return calculatePayout(contract, bet, contract.resolution)
  throw new Error('Contract was not resolved')
}

export function currentValue(contract: Contract, bet: Bet) {
  const prob = getProbability(contract.pool)
  const yesPayout = calculatePayout(contract, bet, 'YES')
  const noPayout = calculatePayout(contract, bet, 'NO')

  return prob * yesPayout + (1 - prob) * noPayout
}

export function calculateSaleAmount(contract: Contract, bet: Bet) {
  const { shares, outcome } = bet

  const { YES: yesPool, NO: noPool } = contract.pool
  const { YES: yesStart, NO: noStart } = contract.startPool
  const { YES: yesShares, NO: noShares } = contract.totalShares

  const [y, n, s] = [yesPool, noPool, shares]

  const shareValue =
    outcome === 'YES'
      ? // https://www.wolframalpha.com/input/?i=b+%2B+%28b+n%5E2%29%2F%28y+%28-b+%2B+y%29%29+%3D+c+solve+b
        (n ** 2 +
          s * y +
          y ** 2 -
          Math.sqrt(
            n ** 4 + (s - y) ** 2 * y ** 2 + 2 * n ** 2 * y * (s + y)
          )) /
        (2 * y)
      : (y ** 2 +
          s * n +
          n ** 2 -
          Math.sqrt(
            y ** 4 + (s - n) ** 2 * n ** 2 + 2 * y ** 2 * n * (s + n)
          )) /
        (2 * n)

  const startPool = yesStart + noStart
  const pool = yesPool + noPool - startPool

  const probBefore = yesPool ** 2 / (yesPool ** 2 + noPool ** 2)
  const f = pool / (probBefore * yesShares + (1 - probBefore) * noShares)

  const myPool = outcome === 'YES' ? yesPool - yesStart : noPool - noStart

  const adjShareValue = Math.min(Math.min(1, f) * shareValue, myPool)

  const saleAmount = (1 - fees) * adjShareValue
  return saleAmount
}