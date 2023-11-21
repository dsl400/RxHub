import { getFirestore } from 'firebase/firestore'
import { RxHub } from '../src/RxHub'
import { FirestoreClientRxHubDriver } from './drivers/FirestoreClient.RxHub.Driver'
import { initializeApp } from "firebase/app";
import { firebaseConfig } from './local_config';

const firebase = initializeApp(firebaseConfig)



const hub = new RxHub({
    drivers:{
        'fs': new FirestoreClientRxHubDriver(getFirestore())
    },
    defaultDriver: 'fs'
})



hub.stream('Documents/Test/testDoc.get').subscribe((x)=>console.log('output:',x))