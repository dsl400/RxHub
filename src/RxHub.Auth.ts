

export abstract class RxHubAuth{

    constructor(){}

    abstract logIn(email:string, password: string)

    abstract logOut()

    abstract register(email:string, password: string)

    abstract reset(email:string)

}