import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  isObservable,
  map,
  of,
  pipe,
  switchMap,
  tap
} from 'rxjs';
import { RxHubAuth } from './RxHub.Auth';
import { RxHubDriver } from './RxHub.Driver';
import { RxHubBatch, RxHubConfig, RxHubGet, RxHubRequest, RxHubTransfer, RxHubUser } from './types';



export class RxHub {

  private drivers: { [key: string]: RxHubDriver } = {}
  private defaultDriver: RxHubDriver
  private appVersion

  private auth: RxHubAuth


  constructor(config: RxHubConfig) {
    this.defaultDriver = config.drivers[config.defaultDriver]
    this.appVersion = config.appVersion
  }

  settings: any;

  user$ = new BehaviorSubject<RxHubUser | null>(null)

  execute(batch: RxHubBatch) {
    return this.stream(batch).subscribe()
  }




  /**
   * 
   * @param requests 
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
  stream(requests: string | RxHubBatch) {

    /**
     * this allows the method to be called with a single string argument 
     * ex: this.db2.stream('[driver://]path/to/document')
     */
    if (typeof requests == 'string') requests = { __data__: { path: requests } } as RxHubBatch;

    /**
     * this allows the method to be called for a single transaction
     * ex: this.db2.stream({path:'driver://path/to/document' ....}) 
     */
    if (typeof requests != 'string' && requests.path) {
      requests = { __data__: requests } as RxHubBatch;
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

    const writeCluster = {}


    /**
     * for every transaction in batch
     */
    for (let key in requests as any) {


      // const key = _key as keyof typeof queries;

      /**
       * this will allow us to proxy an observable along side our streams
       */
      if (isObservable(requests[key])) {
        read[key] = requests[key] as Observable<any>;
        continue;
      }


      let _r: RxHubTransfer = requests[key];


      /**
       * this will allow us to accept simple document path as query
      */
      if (typeof _r == 'string') {
        _r = { path: _r } as RxHubGet;
      } else {
        _r = { ..._r } as RxHubTransfer;
      }

      const r: any = _r as RxHubRequest

      /**
       * extract the driver
      */
      const qDriverSplit = r.path.split('://')
      const driverName = qDriverSplit[0];
      r.driver = qDriverSplit.length > 1 ? this.drivers[driverName] : this.defaultDriver;

      /**
        * extract query path
        */
      const qPath: string = qDriverSplit.length > 1 ? qDriverSplit[1] : qDriverSplit[0];

      /**
       * extract document ref
       */
      const segments: string[] = qPath.split('.');
      r.ref = segments[0];

      /**
       * extract document id
      */
      const pathSegments = r.ref.split('/');
      r.docId = pathSegments.length % 2 ? pathSegments.pop() : '';

      /**
       * extract collection path
        */
      r.collectionPath = pathSegments.join('/');

      /**
       * extract action and arguments
      */
      let args: string[] = [];
      if (segments.length > 1) {
        const actionAndArgs = segments.pop();
        const actionSplit = actionAndArgs?.split(':');
        r.action = actionSplit?.[0] || '';
        args = actionSplit?.[1] ? actionSplit[1].split(',') : [];
      }

      /**
       * build arguments object
      */
      r.args = args.reduce((acc: any, a: string) => {
        const split = a.split('=');
        acc[split[0]] = split[1];
        return acc;
      }, {})

      /**
       * determine action
      */
      if (!r.action) {
        if (!r.update && !r.set && !r.filters) r.action = 'get';
        if (r.filters) r.action = 'list';
        if (r.set) r.action = 'set';
        if (r.update) r.action = 'update';
      }



      /**
       * add a reference to stream context inside the query item
       */
      r.streamContext = streamContext


      /**
       * add the key used for the query inside the query item 
       * we will need it later to access the value of the query in te stream
       * streamContext[key] = result 
       */
      r.key = key



      /**
       * get stream for curent action
      */
      r.stream = pipe(
        switchMap(x => this.user$.pipe(
          switchMap(u => r.driver.getStream(u, r).pipe(
            tap(() => {
              Object.seal(x)
              streamContext[key] = x;
            }),
            switchMap((s: any) => of({
              req: x,
              context: {
                ...r,
                user: u,
                streamContext
              }
            }).pipe(s)),
            // switchMap((x: any) => {

            // }),
            // tap(x => console.log('kkkkkkkkkkkkk', x))
          )),
        )),
      )

      /**
       * prevent accidental data alteration
       */
      Object.seal(r);

      console.warn(r.ref, r.action, r.filters || r.set || r.update || '')

      /**
       * split reads and writes in a separate container
       * and route every action to it's specific executor
       */
      if (r.filters) { //list
        read[key] = r.driver.query(r)
      } else if (r.count) { //count
        read[key] = r.driver.count(r)
      } else if (r.set) {//write
        // if (q.path.includes('/Documents/') && !q.set._new) this.setDocAttributes(q.set, q.driver)
        write[key] = of(r).pipe(
          r.stream,
          switchMap((x: RxHubRequest) => {
            if (x.path && r.set) return r.driver.set(r);

            const effects = { ...x }
            for (let [key, entry] of Object.entries(effects)) {
              if (entry.path == r.path) effects[key] = of(entry)
            }
            return this.stream(effects);
          })
        )
      } else if (r.update) { //write
        // if (q.path.includes('/Documents/')) this.updateDocAttributes(q.update, q.driver)
        write[key] = r.driver.update(r)
      } else { //read
        read[key] = r.driver.get(r).pipe(r.stream)
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
  docId(driver = this.defaultDriver) {
    return driver.docId()
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

export default {
  RxHub
}