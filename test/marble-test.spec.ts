import { expect } from 'chai';
import { EMPTY, interval, merge, of, timer } from 'rxjs';
import {
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

  it('test throttleTime', () => {
    testScheduler.run((helpers) => {
      const { hot, expectObservable } = helpers;
      const values = {
        a: 'A',
        b: 'B',
        c: 'C',
      };
      // “-” 称为一个虚拟时间片，一个“-”表示1ms
      // “a-z”表示数据流出，-a--b---c 表示 2ms时a产生，5ms时b产生，9ms时c产生
      // “|” 表示数据流的结束，---a-| 表示 4ms时a产生，6ms时数据流结束
      // “#” 表示数据流出错，---a--# 表示 4ms时a产生，7ms时数据流出错
      // “()” 表示多个值在同一个时间单位内会产生多个值， -(ab|) 表示 2ms时产生了 a和b，然后数据流结束
      // “^” 表示订阅的节点，--^-- 表示 3ms时有个订阅者进来
      // “!” 表示结束订阅的节点，--^--! 表示 3ms时有个订阅者进来，6ms时该订阅结束
      const characterObservable$ = hot('-a--b--c---|', values);
      const expectedMarbleVisual = '-a-----c---|';
      expectObservable(characterObservable$.pipe(throttleTime(3, testScheduler))).toBe(
        expectedMarbleVisual,
        values
      );
    });
  });

  it('test merge and exhaustMap', () => {
    const values = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    testScheduler.run(({ cold, expectObservable }) => {
      const exhaustPreferInnerObservable = merge(
        cold('-a-b-c-|', values),
        cold('----------d-|', values)
      ).pipe(
        exhaustMap((value, index) => {
          expect(index).to.lessThan(2);
          if (index === 0) {
            expect(value).to.equal(1);
          }
          if (index === 1) {
            expect(value).to.equal(4);
          }
          return cold('--a-b-c-|', values);
        })
      );
      expectObservable(exhaustPreferInnerObservable).toBe('---a-b-c----a-b-c-|', values);
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

  it('test EMPTY takes up frame', () => {
    testScheduler.run(({ expectObservable }) => {
      expectObservable(EMPTY).toBe('|');
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

describe('test flatten startegies with marble test', () => {
  let testScheduler: TestScheduler;
  const value = {
    a: 0,
    b: 1,
    c: 2,
  };
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).deep.equal(expected);
    });
  });

  it('test interval emit first after period', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const subscription = interval(2).pipe(take(2));
      expectObservable(subscription).toBe('--a-(b|)', value);
    });
  });

  it('mergeMap will do nothing but subscribe every new observable', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const subscription = interval(2).pipe(
        take(2),
        mergeMap((_, index) => {
          // index:0 -a-b-c-|
          // index:1 --a--b--c--|
          const freeFrame = '-'.repeat(index + 1);
          const marbles = `${freeFrame}a${freeFrame}b${freeFrame}c${freeFrame}|`;
          return cold(marbles, value);
        })
      );
      expectObservable(subscription).toBe('---a-bac-b--c--|', value);
    });
  });
});
