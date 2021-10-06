import {PartialObserver, Subject, Subscription} from 'rxjs';

export interface EventEmitter<T> extends Subject<T> {

  __isAsync: boolean;

  new(isAsync?: boolean): EventEmitter<T>;

  emit(value?: T): void;

  subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void):
      Subscription;

  subscribe(observerOrNext?: any, error?: any, complete?: any): Subscription;
}

class EventEmitter_ extends Subject<any> {
  __isAsync: boolean;  // tslint:disable-line

  constructor(isAsync: boolean = false) {
    super();
    this.__isAsync = isAsync;
  }

  emit(value?: any) {
    super.next(value);
  }

  subscribe(observerOrNext?: any, error?: any, complete?: any): Subscription {
    let nextFn = observerOrNext;
    let errorFn = error || (() => null);
    let completeFn = complete;

    if (observerOrNext && typeof observerOrNext === 'object') {
      const observer = observerOrNext as PartialObserver<unknown>;
      nextFn = observer.next?.bind(observer);
      errorFn = observer.error?.bind(observer);
      completeFn = observer.complete?.bind(observer);
    }

    if (this.__isAsync) {
      errorFn = _wrapInTimeout(errorFn);

      if (nextFn) {
        nextFn = _wrapInTimeout(nextFn);
      }

      if (completeFn) {
        completeFn = _wrapInTimeout(completeFn);
      }
    }

    const sink = super.subscribe({next: nextFn, error: errorFn, complete: completeFn});

    if (observerOrNext instanceof Subscription) {
      observerOrNext.add(sink);
    }

    return sink;
  }
}

function _wrapInTimeout(fn: (value: unknown) => any) {
  return (value: unknown) => {
    setTimeout(fn, undefined, value);
  };
}

/**
 * @publicApi
 */
export const EventEmitter2: {
  new (isAsync?: boolean): EventEmitter<any>; new<T>(isAsync?: boolean): EventEmitter<T>;
  readonly prototype: EventEmitter<any>;
} = EventEmitter_ as any;
