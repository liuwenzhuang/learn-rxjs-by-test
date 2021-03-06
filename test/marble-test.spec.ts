import { expect } from 'chai';
import { EMPTY, from, interval, of, throwError, timer } from 'rxjs';
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

  it('test from will emit all data in one time frame', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(from([1, 2, 3])).toBe('(abc|)', {
        a: 1,
        b: 2,
        c: 3,
      });
    });
  });

  it('test filter will keep orignial time points', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
      };
      const filterObservable$ = cold('          -a--b--c-|', values).pipe(filter((value) => value !== 2));
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
      const expectedMarbleVisual = '     -a-----c---|';
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
      const originObservable = cold('  -a-b-c-|', values);
      const notifierObservable = cold('----n-|', values);
      // takeUntil 的 notifier 在 5ms 时产生数据，此前 originObservable 产生了 '-a-b'，然后在 5ms 处结束
      const takeUntilObservable = originObservable.pipe(takeUntil(notifierObservable));
      expectObservable(takeUntilObservable).toBe('-a-b|', values);
    });
  });

  it('test take', () => {
    testScheduler.run((helpers) => {
      const { expectObservable } = helpers;
      const values = {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
      };
      // * 表示产生数据的时间节点（每个占用1个时间片），. 表示空闲时间节点（每个占用1个时间片）
      // timer(0, 2)的序列： a-b-c-d
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
      const innerObservable = cold(' --c--d-|', values);
      const mergeMapObservable = outterObservable.pipe(mergeMap(() => innerObservable));
      // just subscribe to all observables
      expectObservable(mergeMapObservable).toBe('--c-cd-d-|', values);
    });
  });

  it('concatMap will keep order and handle next observable only after current observable is done', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a-b-|', values);
      const innerObservable = cold(' --c--d-|', values);
      const concatObservable = outterObservable.pipe(concatMap(() => innerObservable));
      // keep observable order, b after a
      expectObservable(concatObservable).toBe('--c--d---c--d-|', values);
    });
  });

  it('switchMap will cancel current observable when other observable come', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a---b-|', values);
      const innerObservable = cold(' --c--d-|', values);
      const concatObservable = outterObservable.pipe(switchMap(() => innerObservable));
      // cut off a's trigger and response to b's trigger
      expectObservable(concatObservable).toBe('--c---c--d-|', values);
    });
  });

  it('exhaustMap will ignore other observable until current observable is done', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const outterObservable = cold('a-b-----c-|', values);
      const innerObservable = cold(' --c--d-|', values);
      const concatObservable = outterObservable.pipe(exhaustMap(() => innerObservable));
      // ignore b's trigger
      expectObservable(concatObservable).toBe('--c--d----c--d-|', values);
    });
  });
});

describe('test hot observables', () => {
  let testScheduler: TestScheduler;
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).deep.equal(expected);
    });
  });
  it('observers receive different values at different subscription time', () => {
    testScheduler.run(({ hot, expectObservable }) => {
      const hotObservable = hot('-a-b-c-d-e-f-g-h-i-');
      const observer1 = '        --^-----------!';
      const observer2 = '        -------^----!';
      expectObservable(hotObservable, observer1).toBe('---b-c-d-e-f-g-');
      expectObservable(hotObservable, observer2).toBe('-------d-e-f-');
    });
  });

  it('expectSubscriptions just care test subscribe/unsubscribe time point', () => {
    testScheduler.run(({ cold, hot, expectSubscriptions, expectObservable }) => {
      const coldObservable = cold('-a--b--|');
      const coldExpected = '       ^------!';
      // 为了触发订阅、退订，下行代码是必要的，当然也可以使用 expectObservable 来帮我们隐式的订阅
      coldObservable.subscribe();
      expectSubscriptions(coldObservable.subscriptions).toBe(coldExpected);

      const hotObservable01 = hot('-a--b--c-|');
      const activeObserver = '     --^---!'; // 结束前主动退订
      expectObservable(hotObservable01, activeObserver).toBe('----b--');
      expectSubscriptions(hotObservable01.subscriptions).toBe(activeObserver);

      const hotObservable02 = hot('--a-b--c-|');
      const negativeObserver = '   --^--------!'; // 结束后再退订
      const hotExpected = '        --^------!'; // 在结束时，已经退订了
      expectObservable(hotObservable02, negativeObserver).toBe('--a-b--c-|');
      expectSubscriptions(hotObservable02.subscriptions).toBe(hotExpected);
    });
  });
});
