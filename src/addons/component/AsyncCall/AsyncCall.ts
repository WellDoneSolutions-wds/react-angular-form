import {
  catchError,
  concatMap,
  delay,
  exhaustMap,
  from,
  iif,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  retryWhen,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from "rxjs";
import {
  IAsyncCallExecution,
  IRetryProcessing,
  ProcessingType,
} from "../../..";
import { ModuleUtils } from "../../../utils/lang";
import {
  AsyncCallSetStateType,
  IAsyncCallConfigProps,
  IAsyncCallExecuteProps,
  IAsyncCallState,
} from "./model";

export const getTypeOperation = (processingType: ProcessingType) => {
  switch (processingType) {
    case ProcessingType.CONCAT:
      return concatMap;
    case ProcessingType.EXHAUST:
      return exhaustMap;
    case ProcessingType.MERGE:
      return mergeMap;
    case ProcessingType.SWITCH:
      return switchMap;
    default:
      return switchMap;
  }
};

export const initialStateAsyncCall: IAsyncCallState<any, any> = {
  params: {},
  execution: {},
  errors: [],
};

export type SetDataTypeCallbackType<T> = (prevData: T) => T;

export type SetDataType<T> = (callBack: SetDataTypeCallbackType<T>) => void;

export class AsyncCall<P = void, D = any> {
  private execute$ = new Subject<P>();
  private setData$Subject = new Subject<SetDataTypeCallbackType<D>>();
  private internalDestroy$ = new Subject<void>();

  newState: IAsyncCallState<P, D> = initialStateAsyncCall;
  execution$: Observable<IAsyncCallExecution>;

  static config<P, D>(
    executeFn$: IAsyncCallExecuteProps<P, D>,
    config: IAsyncCallConfigProps<P, D>,
    setState?: AsyncCallSetStateType<P, D>
  ) {
    return new AsyncCall<P, D>(executeFn$, config, setState);
  }

  constructor(
    private executeFn$: IAsyncCallExecuteProps<P, D>,
    public config: IAsyncCallConfigProps<P, D>,
    private setState?: AsyncCallSetStateType<P, D>
  ) {
    this.reload = this.reload.bind(this);
    this.getState = this.getState.bind(this);
    this.destroy = this.destroy.bind(this);
    this.init = this.init.bind(this);

    const effectiveDestroy$ = config.destroy$
      ? merge(config.destroy$, this.internalDestroy$)
      : this.internalDestroy$;

    this.setData$Subject
      .pipe(
        takeUntil(effectiveDestroy$),
        tap((setData) => {
          this.setState &&
            this.setState((prevState) => {
              const state = this.getState();
              const newState: IAsyncCallState<any, any> = {
                ...prevState,
                execution: {
                  ...prevState.execution,
                  data: setData(state.execution.data!),
                },
              };
              this.newState = newState;
              return newState;
            });
        })
      )
      .subscribe();

    const processingStatus$ = new Subject<void>();
    const internalConfig: IAsyncCallConfigProps<P, D> = this.config
      ? this.config
      : {};
    const params$ = internalConfig.source$
      ? merge(internalConfig.source$, this.execute$)
      : this.execute$;
    const asyncOperation = getTypeOperation(internalConfig.processingType!);
    this.execution$ = params$.pipe(
      takeUntil(effectiveDestroy$),
      tap((params) => {
        this.setState &&
          this.setState((prevState: IAsyncCallState<any, any>) => {
            const newState: IAsyncCallState<any, any> = {
              ...prevState,
              params,
              execution: { data: null, error: null, status: "PROCESSING" },
              errors: [],
            };
            this.newState = newState;
            return newState;
          });
        internalConfig.onProcessing && internalConfig.onProcessing(params);

        processingStatus$.next();
      }),
      asyncOperation((params: P) => {
        const data$ = this.executeFn$
          ? this.executeFn$(params)
          : of(params).pipe(map((p: any) => p as D));
        const loadData$: Observable<any> = ModuleUtils.isObservable(data$)
          ? data$
          : ModuleUtils.isPromise(data$)
          ? from(data$)
          : of(data$);
        const retryConfig: IRetryProcessing = internalConfig.retry
          ? internalConfig.retry
          : {
              interval: 1000,
              maxRetryAttempts: 0,
            };
        const maxRetryAttempts = retryConfig.maxRetryAttempts
          ? retryConfig.maxRetryAttempts
          : 0;
        const notRetryWhenStatus = retryConfig.notRetryWhenStatus
          ? retryConfig.notRetryWhenStatus
          : [];

        return loadData$.pipe(
          retryWhen((errors) =>
            errors.pipe(
              tap((e) => {
                this.setState &&
                  this.setState((prevState: IAsyncCallState<any, any>) => {
                    const newState: IAsyncCallState<any, any> = {
                      ...prevState,
                      errors: [e, ...prevState.errors],
                    };
                    this.newState = newState;
                    return newState;
                  });
              }),
              concatMap((e: any, i) =>
                iif(
                  () => {
                    if (i < maxRetryAttempts) {
                      const responseStatus = (e || {}).status || 0;
                      const notRetry = !!notRetryWhenStatus.find(
                        (status) => status === responseStatus
                      );
                      if (notRetry) {
                        return true;
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
                      (retryConfig.typeInterval === "LINEAR" ? 1 : i) *
                        retryConfig.interval
                    )
                  )
                )
              )
            )
          ),
          map((data): IAsyncCallExecution => {
            return {
              status: "SUCCESS",
              data,
            };
          }),
          tap((execution) => {
            const params = this.newState.params;
            this.setState &&
              this.setState((prevState: IAsyncCallState<any, any>) => {
                const newState: IAsyncCallState<any, any> = {
                  ...prevState,
                  execution: {
                    ...prevState.execution,
                    data: execution.data,
                    error: null,
                  },
                };
                this.newState = newState;
                return newState;
              });
            internalConfig.onSuccess &&
              internalConfig.onSuccess(execution.data, params);
            this.setState &&
              this.setState((prevState: IAsyncCallState<any, any>) => {
                const newState: IAsyncCallState<any, any> = {
                  ...prevState,
                  execution: { ...prevState.execution, status: "SUCCESS" },
                };
                this.newState = newState;
                return newState;
              });
          }),
          catchError((error): Observable<IAsyncCallExecution> => {
            const errorStatus: IAsyncCallExecution = { status: "ERROR", error };
            return of(errorStatus).pipe(
              tap((processingStatus) => {
                const params = this.newState.params;
                this.setState &&
                  this.setState((prevState: IAsyncCallState<any, any>) => {
                    const newState: IAsyncCallState<any, any> = {
                      ...prevState,
                      execution: {
                        ...prevState.execution,
                        data: null,
                        error: processingStatus.error,
                      },
                    };
                    this.newState = newState;
                    return newState;
                  });
                config.onError &&
                  config.onError(processingStatus.error, params);

                this.setState &&
                  this.setState((prevState: IAsyncCallState<any, any>) => {
                    const newState: IAsyncCallState<any, any> = {
                      ...prevState,
                      execution: { ...prevState.execution, status: "ERROR" },
                    };
                    this.newState = newState;
                    return newState;
                  });
              })
            );
          })
        );
      })
    );
  }

  getState() {
    return this.newState;
  }

  reload() {
    this.execute$.next(this.newState.params);
  }

  destroy() {
    this.internalDestroy$.next();
    this.internalDestroy$.complete();
  }

  get execute(): (params: P) => void {
    return this.execute$.next.bind(this.execute$);
  }

  get setData(): SetDataType<D> {
    return this.setData$Subject.next.bind(this.setData$Subject);
  }

  init() {
    this.execution$.subscribe();
  }
}
