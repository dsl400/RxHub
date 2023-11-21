import { of } from 'rxjs'
import { RxHubGet, RxHubRequest, RxHubSet, RxHubUpdate } from '../../src'
import { RxHubDriver } from '../../src/RxHub.Driver'
import { serverTimestamp, arrayUnion, arrayRemove, doc, Firestore } from 'firebase/firestore'
// import { RxHubTransfer } from '../../src/types'


export class FirestoreClientRxHubDriver extends RxHubDriver {

    private streams = {
        'Documents.Test.get': import('../streams/Documents.Test.get'),
        'Documents.Test.set': import('../streams/Documents.Test.set'),
        'Documents.Test.list': import('../streams/Documents.Test.list'),
        'Documents.Test.update': import('../streams/Documents.Test.update'),
    }

    constructor(private firestore: Firestore) {
        super()
    }


    docId() {
        return ''
    }

    get(request: RxHubRequest) {
        const docRef = doc(this.firestore, request.ref)
        return of([])
    }

    set(request: RxHubSet) {

    }

    update(request: RxHubUpdate) {

    }

    list() {

    }

    serverTimestamp() {
        // return serverTimestamp()
    }


    arrayUnion(element: any) {
        // return arrayUnion(element)
    }

    arrayRemove(element: any) {
        // return arrayRemove(element)
    }

    commitBatch(batch: any) {

    }


    //   /**
    //  * 
    //  * @param t 
    //  * @param driver 
    //  * @returns 
    //  */
    //   private setDocAttributes(t: any, driver = this.defaultDriver) {
    //     if (!t.user) return;
    //     const now = this.timeStamp();
    //     if (t.set._attr) {
    //         t.set._attr.edited = now;
    //         t.set._attr.editor = t.user.name;
    //         t.set._attr.editorId = t.user.user_id;
    //         t.set._attr.uv = this.appVersion;
    //         t.set._attr.prev = this.docId(driver);
    //         t.set._attr.updated = this.serverTimestamp(driver);
    //         return;
    //     }

    //     t.set._attr = this.newDocAttributes(t, t.docId);
    // }


    // /**
    //  * 
    //  * @param t 
    //  * @param driver 
    //  * @returns 
    //  */
    // private updateDocAttributes(t: any, driver = this.defaultDriver) {
    //     if (!this.user) return;
    //     t.update['_attr.edited'] = this.timeStamp();
    //     t.update['_attr.editor'] = this.user.name;
    //     t.update['_attr.editorId'] = this.user.user_id;
    //     t.update['_attr.uv'] = this.appVersion;
    //     t.update['_attr.prev'] = this.docId(driver);
    //     t.update['_attr.updated'] = this.serverTimestamp(driver);
    //     return;
    // }





}