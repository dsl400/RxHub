import { Subject, catchError, from, map, of, switchMap } from 'rxjs'
import { RxHubRequest, RxHubSet, RxHubUpdate } from '../../src'
import { RxHubDriver } from '../../src/RxHub.Driver'
import { serverTimestamp, arrayUnion, arrayRemove, doc, Firestore, onSnapshot, DocumentSnapshot, setDoc, updateDoc, collection } from 'firebase/firestore'
// import { RxHubTransfer } from '../../src/types'


export class FirestoreClientRxHubDriver extends RxHubDriver {

    private base = 'Test'

    streams = {
        'Documents.Test.get': () => import('../streams/Documents.Test.get'),
        'Documents.Test.set': () => import('../streams/Documents.Test.set'),
        // 'Documents.Test.list':() =>  import('../streams/Documents.Test.list'),
        // 'Documents.Test.update':() =>  import('../streams/Documents.Test.update'),
    }

    constructor(private firestore: Firestore) {
        super()
    }



    docId() {
        return doc(collection(this.firestore, '')).id
    }


    get(request: RxHubRequest) {
        const docRef = doc(this.firestore, `${this.base}/${request.ref}`)
        const subject = new Subject<any>();
        onSnapshot(docRef, subject);
        return subject.pipe(map((x: DocumentSnapshot) => x.data()))
    }


    set(request: RxHubRequest) {
        const docRef = doc(this.firestore, `${this.base}/${request.ref}`)
        return of(request).pipe(
            switchMap((x: RxHubSet) => from(setDoc(docRef, x.set, x.options))),
            map(x => true),
            catchError(x => of(false))
        )
    }

    update(request: RxHubRequest) {
        const docRef = doc(this.firestore, `${this.base}/${request.ref}`)
        return of(request).pipe(
            switchMap((x: RxHubUpdate) => from(updateDoc(docRef, x.update)))
        )
    }

    list(request: RxHubRequest) {

    }

    serverTimestamp() {
        return serverTimestamp()
    }


    arrayUnion(element: any) {
        return arrayUnion(element)
    }

    arrayRemove(element: any) {
        return arrayRemove(element)
    }

    commitBatch(batch: any) {

    }








}