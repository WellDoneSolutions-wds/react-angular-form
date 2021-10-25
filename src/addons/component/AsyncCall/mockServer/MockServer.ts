import { concatMap, delay, from, map, Observable, of, take, zip } from "rxjs";
import { ModuleUtils } from "../../../../utils/lang";
import { MockServerConfig } from "./model";

export class MockServer {
  constructor(private config: MockServerConfig) {}
  static create = (config: MockServerConfig) => {
    return new MockServer(config);
  };
  getConfig() {
    const sum = this.config.responses.reduce((t, e) => t + e.ocurrence, 0);
    const ranges = this.config.responses
      .map((resp) => {
        return {
          ...resp,
          percentil: Math.floor((resp.ocurrence * 100) / sum),
        };
      })
      .reduce((t: any[], e) => {
        const lastRange =
          t.length > 0 ? t[t.length - 1] : { top: 0, bottom: 0 };
        return [
          ...t,
          {
            ...e,
            top: lastRange.top + e.percentil,
            bottom: lastRange.top,
          },
        ];
      }, []);
    const randomValue = Math.floor(Math.random() * 100);
    return ranges.find(
      (range) => randomValue > range.bottom && randomValue <= range.top
    );
  }

  invoke() {
    return of("").pipe(
      concatMap((_) => of(this.getConfig())),
      take(1),
      delay(this.config.time || Math.random() * 3000),
      concatMap((config) => {
        const data$ = config.data();
        const loadData$: Observable<any> = ModuleUtils.isObservable(data$)
          ? data$
          : ModuleUtils.isPromise(data$)
          ? from(data$)
          : of(data$);
        return zip(loadData$, of(config.isError));
      }),
      map((data) => {
        if (data[1]) throw data[0];
        return data[0];
      })
    );
  }
}
