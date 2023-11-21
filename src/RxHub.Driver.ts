import { RxHubGet, RxHubSet, RxHubTransfer, RxHubUpdate } from ".";
import { Observable, pipe } from "rxjs";

export abstract class RxHubDriver {

    constructor(options: any = {}) { }

    getStream(transfer: RxHubTransfer) {

        console.log(transfer)

        // const pathSplit = docPath.split('/')
        // const moduleName = pathSplit.join('.')

        // return (force ? of(1) : this.user$).pipe(switchMap(() => {
        //   // console.log('reeeeeeeeeeeeeeeeeeeeady')
        //   let stream: any = null
        //   let roles = this.user?.claims?.roles || [];
        //   if (!Array.isArray(roles)) roles = [];
        //   const paths: string[] = [];
        //   for (let r of roles) {
        //     if (docId) paths.push(`${moduleName}.${docId}.${action}.${r}`)
        //     paths.push(`${moduleName}.${action}.${r}`)
        //   }
        //   if (docId) paths.push(`${moduleName}.${docId}.${action}`)
        //   paths.push(`${moduleName}.${action}`)
        //   paths.sort((a, b) => b.split('.').length - a.split('.').length)
        //   for (let p of paths) {
        //     // console.log(p)
        //     stream = getModule(p)
        //     if (stream) break;
        //   }

        //   //default set 
        //   if (!stream && action == 'set') {
        //     console.warn(docPath, docId, action, 'DEFAULTS SET')
        //     stream = [pipe(map((x: any) => ({
        //       path: x.req.ref,
        //       set: x.req.set,
        //       merge: x.req.merge
        //     })))]
        //   }

        //   //default set 
        //   if (!stream && action == 'update') {
        //     console.warn(docPath, docId, action, 'DEFAULTS UPDATE')
        //     stream = [pipe(map((x: any) => ({
        //       path: x.req.ref,
        //       update: x.req.update,
        //     })))]
        //   }

        //   //default get || list 
        //   if (!stream) {
        //     console.warn(docPath, docId, action, 'DEFAULT GET || LIST')
        //     stream = [pipe(map((x: any) => x.doc || x.data))]
        //   }

        //   return from(stream).pipe(map((x: any) => {
        //     return { user: this.user, stream: x.default ? x.default : x }
        //   }));
        // }))



        return pipe

    }

    abstract get(request: RxHubGet)

    abstract set(request: RxHubSet): Observable<any>

    abstract update(request: RxHubUpdate)

    // abstract serverTimestamp(): any

    abstract docId(table?: string): string

    abstract arrayUnion(item: any)

    abstract arrayRemove(item: any)


}