import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as _ from 'lodash'
import { Contract } from './types/contract'
import { getValues } from './utils'
import { Bet } from './types/bet'

const firestore = admin.firestore()

const oneDay = 1000 * 60 * 60 * 24

export const updateContractMetrics = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const contracts = await getValues<Contract>(
      firestore.collection('contracts')
    )
    await Promise.all(
      contracts.map(async (contract) => {
        const volume24Hours = await computeVolumeFrom(contract, oneDay)
        const volume7Days = await computeVolumeFrom(contract, oneDay * 7)

        const contractRef = firestore.doc(`contracts/${contract.id}`)
        return contractRef.update({
          volume24Hours,
          volume7Days,
        })
      })
    )
  })

const computeVolumeFrom = async (contract: Contract, timeAgoMs: number) => {
  const bets = await getValues<Bet>(
    firestore
      .collection(`contracts/${contract.id}/bets`)
      .where('createdTime', '>', Date.now() - timeAgoMs)
  )

  return _.sumBy(bets, (bet) => Math.abs(bet.amount))
}