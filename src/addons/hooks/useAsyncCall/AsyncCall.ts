import produce from "immer";
import {
  catchError,
  concatMap,
  debounceTime,
  delay,
  exhaustMap,
  flatMap,
  from,
  iif,
  map,
  mapTo,
  merge,
  mergeMap,
  Observable,
  of,
  retryWhen,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
} from "rxjs";
import { ModuleUtils } from "../../../utils/lang";
import {
  IProcessingStatus,
  IRetryProcessing,
  ProcessingType,
} from "../../common/model";
import {
  IAsyncCallConfigProps,
  IAsyncCallExecuteProps,
  IAsyncCallState,
  SetDataType,
  SetDataTypeCallbackType,
} from "./model";

export const initialStateAsyncCall: IAsyncCallState = {
  params: {},
  status: {},
  errors: [],
};

export const getTypeOperation = (processingType: ProcessingType) => {
  switch (processingType) {
    case ProcessingType.CONCAT:
      return concatMap;
    case ProcessingType.EXHAUST:
      return exhaustMap;
    case ProcessingType.FLAT:
      return flatMap;
    case ProcessingType.MERGE:
      return mergeMap;
    case ProcessingType.SWITCH:
      return switchMap;
    default:
      return switchMap;
  }
};

export class AsyncCall<P, D> {
  private execute$ = new Subject<P>();
  public newState: IAsyncCallState<D, P> = initialStateAsyncCall;
  private setData$Subject = new Subject<SetDataTypeCallbackType<D>>();

  constructor(
    private executeFn$: IAsyncCallExecuteProps<D, P>,
    private config: IAsyncCallConfigProps<D, P>,
    private setState: (
      a: (prevState: IAsyncCallState<D, P>) => IAsyncCallState<D, P>
    ) => void,
    public destroy$: Subject<void>
  ) {
    this.destroy$ = destroy$ ? destroy$ : new Subject<void>();
    this.init = this.init.bind(this);
    this.getState = this.getState.bind(this);
    this.reload = this.reload.bind(this);
    this.initSetData = this.initSetData.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  getStatus() {
    return this.newState.status.status;
  }

  private initSetData() {
    this.setData$Subject
      .pipe(
        takeUntil(this.destroy$),
        tap((setData) => {
          this.setState((prevState) => {
            const newState = produce((draft: IAsyncCallState) => {
              const state = this.getState();
              debugger;
              draft.status.data = setData(state.status.data);
            })(prevState);
            this.newState = newState;
            return newState;
          });
        })
      )
      .subscribe();
  }

  init() {
    this.initSetData();
    const processingStatus$ = new Subject<void>();
    const config: IAsyncCallConfigProps<D, P> = this.config ? this.config : {};
    const params$ = config.source$
      ? merge(this.config.source$, this.execute$)
      : this.execute$;
    const asyncOperation = getTypeOperation(config.processingType);
    merge(
      processingStatus$.pipe(
        mapTo<IProcessingStatus>({ status: "PROCESSING" })
      ),
      params$.pipe(
        takeUntil(this.destroy$),
        debounceTime(10),
        tap((params) => {
          this.setState((prevState) => {
            const newState = produce((draft: IAsyncCallState) => {
              draft.params = params;
              draft.errors = [];
            })(prevState);
            this.newState = newState;
            return newState;
          });
          processingStatus$.next();
        }),
        asyncOperation((params: P) => {
          const data$ = this.executeFn$ ? this.executeFn$(params) : of(params);
          const loadData$: Observable<any> = ModuleUtils.isObservable(data$)
            ? data$
            : ModuleUtils.isPromise(data$)
            ? from(data$)
            : of(data$);
          const retryConfig: IRetryProcessing = config.retry
            ? config.retry
            : {
                interval: 1000,
                maxRetryAttempts: 0,
              };
          const maxRetryAttempts = retryConfig.maxRetryAttempts
            ? retryConfig.maxRetryAttempts
            : 0;
          const retryWhenStatus = retryConfig.retryWhenStatus
            ? retryConfig.retryWhenStatus
            : [];
          const notRetryWhenStatus = retryConfig.notRetryWhenStatus
            ? retryConfig.notRetryWhenStatus
            : [];
          return loadData$.pipe(
            retryWhen((errors) =>
              errors.pipe(
                tap((e) => {
                  this.setState((prevState) => {
                    const newState = produce((draft: IAsyncCallState) => {
                      draft.errors.push(e);
                    })(prevState);
                    this.newState = newState;
                    return newState;
                  });
                }),
                concatMap((e: any, i) =>
                  iif(
                    () => {
                      if (i < maxRetryAttempts) {
                        const responseStatus = (e || {}).status || 0;
                        const retry = !!retryWhenStatus.find(
                          (status) => status === responseStatus
                        );
                        if (retry) {
                          return false;
                        }
                        const notRetry = !!notRetryWhenStatus.find(
                          (status) => status === responseStatus
                        );
                        if (notRetry) {
                          return true;
                        }
                        if (retryConfig.retryWhen && retryConfig.retryWhen(e)) {
                          return false;
                        }
                        if (
                          retryConfig.noRetryWhen &&
                          retryConfig.noRetryWhen(e)
                        ) {
                          return true;
                        }
                        return false;
                      }
                      return true;
                    },
                    throwError(e),
                    of(e).pipe(
                      delay(
                        ((retryConfig.typeInterval === "LINEAR" && 1) ||
                          (retryConfig.typeInterval === "EXPONENTIAL" && i)) *
                          retryConfig.interval
                      )
                    )
                  )
                )
              )
            ),
            take(1),
            map((data): IProcessingStatus => {
              return {
                status: "SUCCESS",
                data,
              };
            }),
            catchError((error): Observable<IProcessingStatus> => {
              return of({ status: "ERROR", error });
            })
          );
        })
      )
    )
      .pipe(
        takeUntil(this.destroy$),
        tap((processingStatus) => {
          this.setState((prevState) => {
            const newState = produce((draft: IAsyncCallState) => {
              draft.status.data = processingStatus.data;
              draft.status.error = processingStatus.error;
            })(prevState);
            this.newState = newState;
            return newState;
          });
        }),
        tap((processingStatus) => {
          const params = this.newState.params;
          processingStatus.status === "PROCESSING" &&
            config.onProcessing &&
            config.onProcessing(params);
          processingStatus.status === "ERROR" &&
            config.onError &&
            config.onError(processingStatus.error, params);
          processingStatus.status === "SUCCESS" &&
            config.onSuccess &&
            config.onSuccess(processingStatus.data, params);
          this.setState((prevState) => {
            const newState = produce((draft: IAsyncCallState) => {
              draft.status.status = processingStatus.status;
            })(prevState);
            this.newState = newState;
            return newState;
          });
        })
      )
      .subscribe();
  }

  getState() {
    return this.newState;
  }

  reload() {
    this.execute$.next(this.newState.params);
  }

  get execute(): (params: P) => void {
    return this.execute$.next.bind(this.execute$);
  }

  get setData(): SetDataType<D> {
    return this.setData$Subject.next.bind(this.setData$Subject);
  }
}
