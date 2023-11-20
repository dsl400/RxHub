import { RxHubAuth } from "./RxHub.Auth"
import { RxHubDialog } from "./RxHub.Dialog"
import { RxHubDriver } from "./RxHub.Driver"


export type RxHubConfig = {
    drivers:{
        [key:string]: RxHubDriver
    }
    auth: RxHubAuth
    dialog: RxHubDialog
}



export type RxHubGet = string | { path: string }

export type RxHubSet = {
    path: string
    set: any
    options?: any
}

export type RxHubUpdate = {
    path: string
    update: any
    options?: any
}

export type RxHubQueryFilters = any[] //@TODO QueryFilters type definition
export type RxHubQueryOptions = any[] //@TODO QueryOptions type definition

export type RxHubList = {
    path: string,
    filters: RxHubQueryFilters
    options?: RxHubQueryOptions
}

export type RxHubCount = {
    path: string,
    filters: RxHubQueryFilters
    options?: RxHubQueryOptions
}

export type RxHubTransfer = RxHubGet | RxHubSet | RxHubUpdate | RxHubList | RxHubCount

export type RxHubBatch = RxHubTransfer | {
    [key: string]: RxHubTransfer
}


export type DialogOptions = {
    title: string
    text: string
    btnYes: string
    btnNo: string
}

export type RxHubUser = {
    name: string
    uid: string
    roles: string[]
}
