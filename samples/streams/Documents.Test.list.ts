import { pipe, map } from 'rxjs'

function test(doc, context) {
    return { ...doc }
}


export default pipe(map((x: any) => test(x.doc, x.context)))
