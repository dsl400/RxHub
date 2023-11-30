

export abstract class RxHubAuth{
    
    private _user

    constructor(){}

    get user(){
        return {...this._user || {}}
    }

    abstract logIn(email:string, password: string)

    abstract logOut()

    abstract register(email:string, password: string)

    abstract reset(email:string)

}