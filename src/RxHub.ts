import {
    BehaviorSubject,
    Observable,
    combineLatest,
    debounceTime,
    isObservable,
    map,
    of,
    switchMap
} from 'rxjs';
import { RxHubAuth } from './RxHub.Auth';
import { RxHubDriver } from './RxHub.Driver';
import { RxHubBatch, RxHubConfig, RxHubGet, RxHubTransfer, RxHubUser } from './types';

interface RxHubQuery {
    path: string
    ref: string
    id: string
}


export class RxHub {

    private drivers: { [key: string]: RxHubDriver } = {}
    private defaultDriver: RxHubDriver
    private appVersion: string
    private timeStamp: () => string | number

    private auth: RxHubAuth


    constructor(confing: RxHubConfig) {

    }




    // loadDriver(driver: RxHubDriver) {
    //     if (this.drivers[driver.tag]) {
    //         throw `Driver '${driver.tag}' is already loaded `;
    //     }
    //     this.drivers[driver.tag] = driver;
    // }


    user!: any;

    settings: any;

    user$ = new BehaviorSubject<RxHubUser | null>(null)

    execute(batch: RxHubBatch) {
        return this.stream(batch).subscribe()
    }



    /**
     * 
     * @param batch 
     * @returns ....
     * 
     * usage:
     *    
     *    simple document read
     *    ex: this.db2.stream('[driver://]path/to/document') 
     *    result: this will create a stream to the referenced document path 
     *            default driver will be used if no driver is specified
     * 
     *  
     * 
     * 
     *    single transaction
     *    ex: this.db2.stream({
     *      path: [driver://]path/to/document,
     *      [set|update: data],
     *      [options: write_options]
     *    }) 
     *
     * 
     *    multiple transactions
     *    ex: this.db2.stream({
     *      t1: [driver://]path/to/document,
     *      t2:{
     *        path: [driver://]path/to/document,
     *        [set|update: data],
     *        [options: write_options]
     *      },
     *      t3: from([1,2,3])  << observable proxied trough stream
     *    }) 
     * 
     *  
     */
    stream(batch: RxHubBatch): Observable<any> {
        return this._stream(batch)
    }

    private _stream(queries: RxHubBatch, force: boolean = false) {

        /**
         * this allows the method to be called with a single string argument 
         * ex: this.db2.stream('[driver://]path/to/document')
         */
        if (typeof queries == 'string') queries = { __data__: { path: queries } } as RxHubBatch;

        /**
         * this allows the method to be called for a single transaction
         * ex: this.db2.stream({path:'driver://path/to/document' ....}) 
         */
        if (typeof queries != 'string' && queries.path) {
            queries = { __data__: queries } as RxHubBatch;
        }


        /**
         * a place to store read transactions
         */
        const read: any = {}

        /**
         * a place to store write transactions
         */
        const write: any = {}

        /**
         * a place to store references to transaction results
         */
        const streamContext: any = {}


        /**
         * for every transaction in batch
         */
        for (let key in queries as any) {


            // const key = _key as keyof typeof queries;

            /**
             * this will allow us to proxy an observable along side our streams
             */
            if (isObservable(queries[key])) {
                read[key] = queries[key] as Observable<any>;
                continue;
            }


            let _q: RxHubTransfer = queries[key];

            /**
             * this will allow us to accept simple document path as query
             */
            if (typeof _q == 'string') {
                _q = { path: _q } as RxHubGet;
            } else {
                _q = { ..._q } as RxHubTransfer;
            }

            const q: any = _q as RxHubQuery

            /**
             * extract the driver
             */
            const qDriverSplit = q.path.split('://')
            const driverName = qDriverSplit[0] as keyof typeof this.drivers
            q.driver = qDriverSplit.length > 1 ? this.drivers[driverName] : this.defaultDriver;

            /**
             * extract query path
             */
            const qPath: string = qDriverSplit.length > 1 ? qDriverSplit[1] : qDriverSplit[0];

            /**
             * extract document ref
             */
            const segments: string[] = qPath.split('.');
            q.ref = segments[0];

            /**
             * extract document id
             */
            const pathSegments = q.ref.split('/');
            q.docId = pathSegments.length % 2 ? pathSegments.pop() : '';

            /**
             * extract collection path
             */
            q.collectionPath = pathSegments.join('/');

            /**
             * extract action and arguments
             */
            let args: string[] = [];
            if (segments.length > 1) {
                const actionAndArgs = segments.pop();
                const actionSplit = actionAndArgs?.split(':');
                q.action = actionSplit?.[0] || '';
                args = actionSplit?.[1] ? actionSplit[1].split(',') : [];
            }

            /**
             * build arguments object
             */
            q.args = args.reduce((acc: any, a: string) => {
                const split = a.split('=');
                acc[split[0]] = split[1];
                return acc;
            }, {})

            /**
             * determine action
             */
            if (!q.action) {
                if (!q.update && !q.set && !q.filters) q.action = 'get';
                if (q.filters) q.action = 'list';
                if (q.set) q.action = 'set';
                if (q.update) q.action = 'update';
            }

            /**
             * get stream for curent action
             */
            q.stream = q.driver.getStream(q)
            // q.stream = q.count ? of() : this.getStream(pathSegments.join('.'), q.docId, q.action!, force)

            console.warn(q.ref, q.action, q.filters || q.set || q.update || '')

            /**
             * add a reference to stream context inside the query item
             */
            q.streamContext = streamContext

            /**
             * add the key used for the query inside the query item 
             * we will need it later to access the value of the query in te stream
             * streamContext[key] = result 
             */
            q.key = key


            /**
             * split reads and writes in a separate container
             * and route every action to it's specific executor
             */
            if (q.filters) { //list
                read[key] = q.driver.query(q)
            } else if (q.count) { //count
                read[key] = q.driver.count(q)
            } else if (q.set) {//write
                if (q.path.includes('/Documents/') && !q.set._new) this.setDocAttributes(q.set, q.driver)
                write[key] = q.driver.set(q)
            } else if (q.update) { //write
                if (q.path.includes('/Documents/')) this.updateDocAttributes(q.update, q.driver)
                write[key] = q.driver.update(q)
            } else { //read
                read[key] = q.driver.get(q)
            }
        }

        /**
         * return if we only have one transaction
         */
        if (read.__data__) return read.__data__;
        if (write.__data__) return write.__data__;


        /**
         * count reads and writes
         */
        const reads = Object.values(read).length;
        const writes = Object.values(write).length;


        /**
         * return if the batch contains only reads 
         */
        if (reads && !writes) return combineLatest(read).pipe(debounceTime(50)) as Observable<any>


        /**
         * return if the batch contains only writes 
         */
        if (!reads && writes) return combineLatest(write) as Observable<any>


        /**
         * cascade operations reads then writes
         */
        return combineLatest(read as any)
            .pipe(
                debounceTime(100),
                switchMap((x: any) =>
                    combineLatest(write as any).pipe(map((y: any) => {
                        return {
                            ...x, ...y
                        }
                    }))),
                debounceTime(50)
            ) as Observable<any>
    }


    // /**
    //  * 
    //  * @param dialogData 
    //  * @param action 
    //  * @param data 
    //  * @param driver 
    //  * @returns 
    //  */
    // confirmCall(dialogData: any, action: string, data: any, driver = this.defaultDriver): Observable<any> {
    //     return this.dialog.confirm(dialogData).pipe(
    //         switchMap((x: any) => !x ? of(null) : this.call(action, data, driver)))
    // }


    /**
     * 
     * @param action 
     * @param data 
     * @param driver 
     * @returns 
     */
    call(action: string, data?: any, driver: any = this.defaultDriver) {
        return driver.call(action, data)
    }


    /** 
     * @param driver 
     * @returns 
     */
    deleteField(driver: any = this.defaultDriver) {
        if (!driver) driver = this.defaultDriver;
        return driver.deleteField();
    }


    /**
     * 
     * @param driver 
     * @returns 
     */
    serverTimestamp(driver = this.defaultDriver) {
        return driver.serverTimestamp()
    }


    /**
     * 
     * @param driver 
     * @returns 
     */
    docId(driver = this.defaultDriver) {
        return driver.docId()
    }


    /**
     * 
     * @param t 
     * @param docId 
     * @returns 
     */
    private newDocAttributes(t: any, docId: string) {

        const now = this.timeStamp();

        return {
            created: now,
            saved: this.serverTimestamp(),
            creator: this.user.name,
            creatorId: this.user.user_id,
            edited: now,
            original: docId || '',
            editor: this.user.name,
            editorId: this.user.user_id,
            cv: this.appVersion,
            deleted: false,
        }
    }

    /**
     * 
     * @param t 
     * @param driver 
     * @returns 
     */
    private setDocAttributes(t: any, driver = this.defaultDriver) {
        if (!t.user) return;
        const now = this.timeStamp();
        if (t.set._attr) {
            t.set._attr.edited = now;
            t.set._attr.editor = t.user.name;
            t.set._attr.editorId = t.user.user_id;
            t.set._attr.uv = this.appVersion;
            t.set._attr.prev = this.docId(driver);
            t.set._attr.updated = this.serverTimestamp(driver);
            return;
        }

        t.set._attr = this.newDocAttributes(t, t.docId);
    }


    /**
     * 
     * @param t 
     * @param driver 
     * @returns 
     */
    private updateDocAttributes(t: any, driver = this.defaultDriver) {
        if (!this.user) return;
        t.update['_attr.edited'] = this.timeStamp();
        t.update['_attr.editor'] = this.user.name;
        t.update['_attr.editorId'] = this.user.user_id;
        t.update['_attr.uv'] = this.appVersion;
        t.update['_attr.prev'] = this.docId(driver);
        t.update['_attr.updated'] = this.serverTimestamp(driver);
        return;
    }





    /**
     * 
     * @param docPath 
     * @param docId 
     * @param action 
     * @param force 
     * @returns 
     */
    private getStream(docPath: string, docId: string | undefined, action: string, force: boolean = false) {
        const pathSplit = docPath.split('/')
        const moduleName = pathSplit.join('.')
        return this.user$.pipe(switchMap(() => {
            let stream: any = null
            let roles = this.user$.value.roles || [];
            if (!Array.isArray(roles)) roles = [];
            const paths: string[] = [];
            for (let r of roles) {
                if (docId) paths.push(`${moduleName}.${docId}.${action}.${r}`)
                paths.push(`${moduleName}.${action}.${r}`)
            }
            if (docId) paths.push(`${moduleName}.${docId}.${action}`)
            paths.push(`${moduleName}.${action}`)
            paths.sort((a, b) => b.split('.').length - a.split('.').length)
            for (let p of paths) {
                // stream = this.getModule(p)
                if (stream) break;
            }

            // //default set 
            // if (!stream && action == 'set') {
            //     console.warn(docPath, docId, action, 'DEFAULT SET')
            //     stream = [pipe(map((x: any) => ({
            //         path: x.req.ref,
            //         set: x.req.set,
            //         merge: x.req.merge
            //     })))]
            // }

            // //default set 
            // if (!stream && action == 'update') {
            //     console.warn(docPath, docId, action, 'DEFAULT UPDATE')
            //     stream = [pipe(map((x: any) => ({
            //         path: x.req.ref,
            //         update: x.req.update,
            //     })))]
            // }

            // //default get || list 
            // if (!stream) {
            //     console.warn(docPath, docId, action, 'DEFAULT GET || LIST')
            //     stream = [pipe(map((x: any) => x.doc || x.data))]
            // }

            // return from(stream).pipe(map((x: any) => {
            //     return { user: this.user, stream: x.default ? x.default : x }
            // }));
            return of(1)
        }))
    }


    // /**
    //  * 
    //  * @param message 
    //  * @param action 
    //  * @param config 
    //  * @returns 
    //  */
    // notify(message: string, action?: string | undefined, config?:any) {
    //     if(!this.toast)
    //     return this.toast.open(message, action || 'Ok!', config || { duration: 3000 })
    // }

    // /**
    //  * 
    //  * @param dialogData 
    //  * @param transactions 
    //  * @returns 
    //  */
    // confirm(dialogData: any, transactions: any): Observable<any> {
    //     return this.dialog.confirm(dialogData).pipe(
    //         switchMap((x: any) => !x ? of(null) : this.stream(transactions)))
    // }


    // /**
    //  * 
    //  * @param dialogData 
    //  * @param transactions 
    //  */
    // confirmEx(dialogData: any, transactions: any) {
    //     this.dialog.confirm(dialogData).pipe(
    //         switchMap((x: any) => !x ? of(null) : this.stream(transactions)),
    //         take(1)
    //     ).subscribe()
    // }

    /**
     * 
     * @param item 
     * @param driver 
     * @returns 
     */
    arrayUnion(item: any, driver = this.defaultDriver) {
        return driver.arrayUnion(item)
    }


    /**
     * 
     * @param item 
     * @param driver 
     * @returns 
     */
    arrayRemove(item: any, driver = this.defaultDriver) {
        return driver.arrayRemove(item)
    }


    // /**
    //  * 
    //  * @param doc 
    //  * @param tag 
    //  * @param update 
    //  * @param driver 
    //  */
    // addTag(doc: Db2Doc, tag: string, update: any = {}, driver = this.defaultDriver) {
    //     this.stream({
    //         path: `${doc._collection}/${doc._id}`,
    //         update: {
    //             ...update,
    //             'tags': this.arrayUnion(tag, driver),
    //         }
    //     }).subscribe()
    // }


    // /**
    //  * 
    //  * @param doc 
    //  * @param tag 
    //  * @param update 
    //  * @param driver 
    //  */
    // removeTag(doc: Db2Doc, tag: string, update: any = {}, driver = this.defaultDriver) {
    //     this.stream({
    //         path: `${doc._collection}/${doc._id}`,
    //         update: {
    //             ...update,
    //             'tags': this.arrayRemove(tag, driver),
    //         }
    //     }).subscribe()
    // }


    // /**
    //  * 
    //  * @param doc 
    //  * @param tag 
    //  * @param update 
    //  * @param driver 
    //  */
    // toggleTag(doc: Db2Doc, tag: string, update: any = {}, driver = this.defaultDriver) {
    //     this.stream({
    //         path: `${doc._collection}/${doc._id}`,
    //         update: {
    //             ...update,
    //             'tags': doc?.tags?.includes(tag) ? this.arrayRemove(tag, driver) : this.arrayUnion(tag, driver),
    //         }
    //     }).subscribe()
    // }

    logOut() {
        this.auth.logOut()
    }

    reset(email: string) {
        this.auth.reset(email);
    }

    register(email: string, password: string) {
        this.auth.register(email, password)
    }

    logIn(email: string, password: string) {
        this.auth.logIn(email, password)
    }

}

export function copyDoc(doc: any) {
    const result: any = {}
    Object.keys(doc || {}).filter((k: string) => k.charAt(0) != '_')
        .map((key: string) => result[key] = doc[key])
    return result;

}
