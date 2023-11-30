import { RxHubGet, RxHubRequest, RxHubSet, RxHubTransfer, RxHubUpdate, RxHubUser } from ".";
import { Observable, from, map, of, pipe, switchMap, tap } from "rxjs";

export abstract class RxHubDriver {


    abstract streams: { [key: string]: () => Promise<any> }

    constructor(options: any = {}) { }

    // getStream(user$: Observable<RxHubUser>, transfer: RxHubTransfer):<T>(source: Observable<T>) => Observable<T> {
    getStream(user: RxHubUser, r: RxHubRequest): any {

        // return pipe(map(x=>x))

        let roles = user?.roles || [];

        let stream = null;

        const moduleName = r.collectionPath.split('/').join('.')

        const paths: string[] = [];
        for (let role of roles) {
            if (r.docId) paths.push(`${moduleName}.${r.docId}.${r.action}.${role}`)
            paths.push(`${moduleName}.${r.action}.${role}`)
        }
        if (r.docId) paths.push(`${moduleName}.${r.docId}.${r.action}`)
        paths.push(`${moduleName}.${r.action}`)
        paths.sort((a, b) => b.split('.').length - a.split('.').length);

        for (let p of paths) {
            stream = this.streams[p]?.()
            if (stream) {
                break;
            }
        }

        //default set 
        if (!stream && r.action == 'set') {
            console.warn(r.ref, 'DEFAULTS SET')
            stream = [{
                default: pipe(map((x: any) => ({
                    path: x.req.ref,
                    set: x.req.set,
                    options: x.req.options
                })))
            }]
        }

        //default set 
        if (!stream && r.action == 'update') {
            console.warn(r.ref, 'DEFAULTS UPDATE')
            stream = [{
                default: pipe(map((x: any) => ({
                    path: x.req.ref,
                    update: x.req.update,
                })))
            }]
        }

        //default get || list 
        if (!stream) {
            console.warn(r.ref, 'DEFAULT GET || LIST')
            stream = [{ default: pipe(map((x: any) => x.doc || x.data)) }]
        }
        
        return from(stream).pipe(
            map((x: any) => x.default),  
        )
    }

    abstract get(request: RxHubGet)

    abstract set(request: RxHubSet): Observable<any>

    abstract update(request: RxHubUpdate)

    abstract list(request: RxHubUpdate)

    // abstract serverTimestamp(): any

    abstract docId(table?: string): string

    abstract arrayUnion(item: any)

    abstract arrayRemove(item: any)


}