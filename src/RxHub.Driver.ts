import { RxHubGet, RxHubRequest, RxHubSet, RxHubTransfer, RxHubUpdate, RxHubUser } from ".";
import { Observable, from, map, of, pipe, switchMap, tap } from "rxjs";

export abstract class RxHubDriver {


    abstract streams: { [key: string]: Promise<any> }

    constructor(options: any = {}) { }

    // getStream(user$: Observable<RxHubUser>, transfer: RxHubTransfer):<T>(source: Observable<T>) => Observable<T> {
    getStream(user: RxHubUser, r: RxHubRequest): any {

        return pipe(map(x=>x))

        let roles = user.roles || [];

        let stream = null;

        const moduleName = r.ref.replace('/', '.')
        const paths: string[] = [];
        for (let role of roles) {
            if (r.docId) paths.push(`${moduleName}.${r.docId}.${r.action}.${role}`)
            paths.push(`${moduleName}.${r.action}.${role}`)
        }
        if (r.docId) paths.push(`${moduleName}.${r.docId}.${r.action}`)
        paths.push(`${moduleName}.${r.action}`)
        paths.sort((a, b) => b.split('.').length - a.split('.').length)
        for (let p of paths) {
            // console.log(p)
            stream = this.streams[p]
            if (stream) {
                stream = stream()
                break;
            }

            //default set 
            if (!stream && r.action == 'set') {
                console.warn(r.ref, 'DEFAULTS SET')
                stream = [pipe(map((x: any) => ({
                    path: x.req.ref,
                    set: x.req.set,
                    merge: x.req.merge
                })))]
            }

            //default set 
            if (!stream && r.action == 'update') {
                console.warn(r.ref, 'DEFAULTS UPDATE')
                stream = [pipe(map((x: any) => ({
                    path: x.req.ref,
                    update: x.req.update,
                })))]
            }

            //default get || list 
            if (!stream) {
                console.warn(r.ref, 'DEFAULT GET || LIST')
                stream = [pipe(map((x: any) => x.doc || x.data))]
            }

        }
        // return of(pipe(map(x => ({ 111111111: x }))))
        return from(stream()).pipe(
            tap(x => console.log(1111111111111, x)),
            map((x: any) => {
                return { stream: x.default ? x.default : x }
            }),
            map(x => x)
        );

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