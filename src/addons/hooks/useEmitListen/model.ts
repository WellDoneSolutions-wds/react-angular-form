import { Observable, Subject } from "rxjs";

export type EmitListenTapProps<T> = (value: T) => void;

export interface EmitListenProps<T> {
  params$?: Observable<any>;
  destroy$?: Subject<void>;
  tap?: EmitListenTapProps<T>;
}
export interface EmitListenReturn<T> {
  emit: (params: T) => void;
  listen: (callback: (params: T) => void) => void;
  open: () => void;
  close: () => void;
  state: string;
}

export type Listen<T> = (params: T) => void;
