import { pipe, map } from 'rxjs'

function test(doc, context) {
    
    return {
        // ...doc
        t1: { ...doc },
        t2: {
            path: 'Documents/Test2/docdata',
            set: { aaaaa: 11111111 }
        }
    }
}


export default pipe(map((x: any) => test(x.req, x.context)))
