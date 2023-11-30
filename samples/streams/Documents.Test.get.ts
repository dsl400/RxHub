import { pipe, map } from 'rxjs'

function test(doc, context) {
    return { ...doc, modified: true }
}


export default pipe(map((x: any) => test(x.req, x.context)))

