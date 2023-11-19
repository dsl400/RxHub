import { pipe } from "../node_modules/rxjs/dist/types/index";

export abstract class RxHubDriver {

    tag: string

    constructor(tag: string, options: any = {}) {
        this.tag = tag
    }

    abstract serverTimestamp(): any

    abstract docId(table?: string): string

    abstract getStream(): typeof pipe

    abstract arrayUnion(item: any)

    abstract arrayRemove(item: any)


}