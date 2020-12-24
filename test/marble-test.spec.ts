import { expect } from 'chai';
import { EMPTY, interval, of, throwError, timer } from 'rxjs';
import { ColdObservable } from 'rxjs/internal/testing/ColdObservable';
import {
  catchError,
  concatMap,
  delay,
  exhaustMap,
  filter,
  map,
  mergeMap,
  repeat,
  switchMap,
  take,
  takeUntil,
  throttleTime,
} from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

describe('marble test use TestScheduler', () => {
  let testScheduler: TestScheduler;
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).deep.equal(expected);
    });
  });

  it('test filter will keep orignial time points', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
      };
      const filterObservable$ = cold('-a--b--c-|', values).pipe(filter((value) => value !== 2));
      expectObservable(filterObservable$).toBe('-a-----c-|', values);
    });
  });

  it('test interval emit first after period', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const subscription = interval(2).pipe(take(2));
      expectObservable(subscription).toBe('--a-(b|)', {
        a: 0,
        b: 1,
      });
    });
  });

  it('test throttleTime', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 'A',
        b: 'B',
        c: 'C',
      };
      const characterObservable$ = cold('-a--b--c---|', values);
      const expectedMarbleVisual = '-a-----c---|';
      expectObservable(characterObservable$.pipe(throttleTime(3, testScheduler))).toBe(
        expectedMarbleVisual,
        values
      );
    });
  });

  it('test delay', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
      };
      const originObservable = cold('-a-b-c-|', values);
      const delayObservable = originObservable.pipe(delay(1));
      expectObservable(delayObservable).toBe('--a-b-c-|', values);
    });
  });

  it('test takeUntil', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
        n: 0,
      };
      const originObservable = cold('-a-b-c-|', values);
      const notifierObservable = cold('----n-|', values);
      // takeUntil 的 notifier 在 5ms 时产生数据，此时 originObservable 产生了 '-a-b'，b 后的 “-”（5ms）
      // 处不会被执行，因为 notifier 在同时产生数据，导致 notifier 和 originObservable 都结束
      const takeUntilObservable = originObservable.pipe(takeUntil(notifierObservable));
      expectObservable(takeUntilObservable).toBe('-a-b|', values);
    });
  });

  it('test timer', () => {
    testScheduler.run((helpers) => {
      const { expectObservable } = helpers;
      const values = {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
      };
      // * 表示产生数据的时间节点（每个占用1个时间片），. 表示空闲时间节点（每个占用1个时间片）
      // timer(0, 2)的序列： *.*.*.*
      // take(4) 使得在第四个值产生同时流结束
      expectObservable(timer(0, 2).pipe(take(4))).toBe('a-b-c-(d|)', values);
    });
  });

  it('switchMap should cancel previous inner subscription', () => {
    testScheduler.run(({ expectObservable, cold }) => {
      const triggerObservable = cold('a-b-c-(d|)', {
        a: 0,
        b: 1,
        c: 2,
        d: null,
      });
      const subscription = triggerObservable.pipe(
        switchMap((value) => {
          return value === null ? EMPTY : timer(0, 3);
        })
      );
      expectObservable(subscription).toBe('a-a-a-|', {
        a: 0,
      });
    });
  });

  it('repeat with delay', () => {
    testScheduler.run(({ expectObservable }) => {
      const observable = of('delayed value').pipe(delay(2), repeat(3));
      expectObservable(observable).toBe('--a-a-(a|)', {
        a: 'delayed value',
      });
    });
  });

  it('test filter and map', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        // after filter and map
        x: 2,
        y: 6,
        z: 10,
      };
      const originObservable = cold('-a-b-c-d-e-|', values);
      const fitlerMapObservable = originObservable.pipe(
        // tslint:disable-next-line: no-bitwise
        filter((value) => (value & 0x1) === 1),
        map((value) => value * 2)
      );
      expectObservable(fitlerMapObservable).toBe('-x---y---z-|', values);
    });
  });
});

describe('test special Observable with marble test', () => {
  let testScheduler: TestScheduler;
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).deep.equal(expected);
    });
  });

  it('test EMPTY will fire complete directly', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(EMPTY).toBe('|');
    });
  });

  it('test throwError will fire error directly', () => {
    testScheduler.run(({ expectObservable }) => {
      const errMsg = 'err from throwError';
      expectObservable(throwError(errMsg)).toBe('#', undefined, errMsg);
    });
  });

  it('test catchError will start a new Observable', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const marbleStr = '-a--b--c-|';
      const observableWithCatchError$ = throwError('err').pipe(catchError(() => cold(marbleStr)));
      expectObservable(observableWithCatchError$).toBe(marbleStr);
    });
  });
});

describe('test flatten startegies with marble test', () => {
  let testScheduler: TestScheduler;
  const values = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
  };
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).deep.equal(expected);
    });
  });

  it('mergeMap will do nothing but subscribe every new observable', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a-b-|', values);
      const innerObservable = cold('--c--d-|', values);
      const concatObservable = outterObservable.pipe(mergeMap(() => innerObservable));
      // just subscribe to all observables
      expectObservable(concatObservable).toBe('--c-cd-d-|', values);
    });
  });

  it('concatMap will keep order and handle next observable only after current observable is done', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a-b-|', values);
      const innerObservable = cold('--c--d-|', values);
      const concatObservable = outterObservable.pipe(concatMap(() => innerObservable));
      // keep observable order, b after a
      expectObservable(concatObservable).toBe('--c--d---c--d-|', values);
    });
  });

  it('switchMap will cancel current observable when other observable come', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a---b-|', values);
      const innerObservable = cold('--c--d-|', values);
      const concatObservable = outterObservable.pipe(switchMap(() => innerObservable));
      // cut off a's trigger and response to b's trigger
      expectObservable(concatObservable).toBe('--c---c--d-|', values);
    });
  });

  it('exhaustMap will ignore other observable until current observable is done', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a-b-----c-|', values);
      const innerObservable = cold('--c--d-|', values);
      const concatObservable = outterObservable.pipe(exhaustMap(() => innerObservable));
      // ignore b's trigger
      expectObservable(concatObservable).toBe('--c--d----c--d-|', values);
    });
  });
});
