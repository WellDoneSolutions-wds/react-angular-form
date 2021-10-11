import { Observable, Subject } from "rxjs";


export interface UseSubscribeObsProps {
    obs$: Observable<any>,
    destroy$?: Subject<void>
}