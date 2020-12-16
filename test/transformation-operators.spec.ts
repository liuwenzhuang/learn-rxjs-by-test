import * as sinon from 'sinon';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { scan, take } from 'rxjs/operators';
import { of, interval } from 'rxjs';

describe('scan usage', function () {
  this.timeout(6000);
  it('basic: scan could sum over time', function (done) {
    const source = [1, 2, 3];
    const originalSource = of(...source);
    let sum = 0;
    let index = 0;
    originalSource.pipe(scan((acc, val) => acc + val, 0)).subscribe(
      (item) => {
        expect(item).equal((sum += source[index++]));
      },
      done,
      done
    );
  });
  it('scan could accumulate values into an array', function (done) {
    const fakeFunc = sinon.fake();
    interval(1000)
      .pipe(
        scan((acc, val) => [...acc, val], []),
        take(5)
      )
      .subscribe(
        (value) => {
          fakeFunc(value);
        },
        done,
        () => {
          expect(fakeFunc.firstCall.lastArg).eql([0]);
          expect(fakeFunc.lastCall.lastArg).eql([0, 1, 2, 3, 4]);
          done();
        }
      );
  });
});
