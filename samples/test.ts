import { Firestore } from 'firebase/firestore'
import { RxHub } from '../src/RxHub'
import { FirestoreClientRxHubDriver } from './drivers/FirestoreClient.RxHub.Driver'


const hub = new RxHub({
    drivers:{
        'fs': new FirestoreClientRxHubDriver({} as Firestore)
    },
    defaultDriver: 'fs'
})


hub.stream('Documents/Test/testDoc.get').subscribe((x)=>console.log('output:',x))