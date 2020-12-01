import { expect } from 'chai';
import { filter, map, throttleTime } from 'rxjs/operators';
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
      // “-” 称为一个虚拟时间片，一个“-”表示10ms
      // “a-z”表示数据流出，-a--b---c 表示 20ms时a产生，50ms时b产生，90ms时c产生
      // “|” 表示数据流的结束，---a-| 表示 40ms时a产生，60ms时数据流结束
      // “#” 表示数据流出错，---a--# 表示 40ms时a产生，70ms时数据流出错
      // “()” 表示多个值在同一个时间单位内会产生多个值， -(ab|) 表示 20ms时产生了 a和b，然后数据流结束
      // “^” 表示订阅的节点，--^-- 表示 30ms时有个订阅者进来
      // “!” 表示结束订阅的节点，--^--! 表示 30ms时有个订阅者进来，60ms时该订阅结束
      const characterObservable$ = hot('-a--b--c---|', values);
      const expectedMarbleVisual = '-a-----c---|';
      expectObservable(characterObservable$.pipe(throttleTime(3, testScheduler))).toBe(
        expectedMarbleVisual,
        values
      );
    });
  });

  it('test map', () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;
      const values = {
        a: 1,
        b: 2,
        c: 3,
        x: 1,
        y: 4,
        z: 9,
      };
      const originObservable = cold('-a--b-c--|', values);
      const multiSelfObservable = originObservable.pipe(map((item) => item * item));
      expectObservable(multiSelfObservable).toBe('-x--y-z--|', values);
    });
  });

  it('test filter', () => {
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
