import { Observable, Subject } from "rxjs";

export interface EmitListenProps {
    destroy$?: Subject<void>
}
export type EmitListenReturnEmit<T> = () => {}
export type EmitListenReturnListen<T = any> = () => void


export interface IEmitListenProps {
    params$?: Observable<any>,
    destroy$?: Subject<void>
}

export type EmitReturn<T> = (params: T) => void
export type ListenReturn<T> = (params: T) => void
export type EmitListenReturnOpen = () => void
export type EmitListenReturnClose = () => void
export enum EmitListenReturnState {
    OPEN = 'OPEN',
    CLOSE = 'CLOSE',
}

export interface EmitListenReturn<T = any> {
    emit: EmitReturn<T>,
    listen: ListenReturn<T>,
    open: EmitListenReturnOpen,
    close: EmitListenReturnClose,
    state: EmitListenReturnState
}
