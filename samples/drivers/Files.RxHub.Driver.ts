import { from, of, switchMap } from "rxjs";
import { RxHubRequest, RxHubSet } from "../../src";
import { RxHubDriver } from "../../src/RxHub.Driver";
import { promises as fs } from 'fs'




export class FileSystemRxHubDriver extends RxHubDriver {

    private base = 'Test'


    streams = {
        'Documents.Test.get': import('../streams/Documents.Test.get'),
        'Documents.Test.set': import('../streams/Documents.Test.set'),
        'Documents.Test.list': import('../streams/Documents.Test.list'),
        'Documents.Test.update': import('../streams/Documents.Test.update'),
    }

    docId(){
        return '';
    }

    get(request: RxHubRequest) {
        return from(fs.readFile(request.path))
    }

    set(request: RxHubRequest) {
        return of().pipe(request.stream,switchMap((x:RxHubSet) => from(fs.writeFile(request.path,x.set))))
    }


    update(request: RxHubRequest) {
        return of().pipe(request.stream,switchMap((x:RxHubSet) => from(fs.writeFile(request.path,x.set))))
    }


    list(request: RxHubRequest) {


    }



    arrayUnion(element: any) {
        // return arrayUnion(element)
    }

    arrayRemove(element: any) {
        // return arrayRemove(element)
    }









}