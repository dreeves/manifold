import * as admin from 'firebase-admin'
import * as _ from 'lodash'
import { Bet } from '../types/bet'
import { Contract } from '../types/contract'

type DocRef = admin.firestore.DocumentReference

// Generate your own private key, and set the path below:
// https://console.firebase.google.com/u/0/project/mantic-markets/settings/serviceaccounts/adminsdk
const serviceAccount = require('../../../../Downloads/mantic-markets-firebase-adminsdk-1ep46-820891bb87.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
const firestore = admin.firestore()

async function migrateBet(contractRef: DocRef, bet: Bet) {
  const { dpmWeight, amount, id } = bet as Bet & { dpmWeight: number }
  const shares = dpmWeight + amount

  await contractRef.collection('bets').doc(id).update({ shares })
}

async function migrateContract(contractRef: DocRef, contract: Contract) {
  const bets = await contractRef
    .collection('bets')
    .get()
    .then((snap) => snap.docs.map((bet) => bet.data() as Bet))

  const totalShares = {
    YES: _.sumBy(bets, (bet) => (bet.outcome === 'YES' ? bet.shares : 0)),
    NO: _.sumBy(bets, (bet) => (bet.outcome === 'NO' ? bet.shares : 0)),
  }

  await contractRef.update({ totalShares })
}

async function migrateContracts() {
  console.log('Migrating contracts')

  const snapshot = await firestore.collection('contracts').get()
  const contracts = snapshot.docs.map((doc) => doc.data() as Contract)

  console.log('Loaded contracts', contracts.length)

  for (const contract of contracts) {
    const contractRef = firestore.doc(`contracts/${contract.id}`)
    const betsSnapshot = await contractRef.collection('bets').get()
    const bets = betsSnapshot.docs.map((bet) => bet.data() as Bet)

    console.log('contract', contract.question, 'bets', bets.length)

    for (const bet of bets) await migrateBet(contractRef, bet)
    await migrateContract(contractRef, contract)
  }
}

if (require.main === module) migrateContracts().then(() => process.exit())