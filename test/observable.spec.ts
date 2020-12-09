import * as sinon from 'sinon';
import { Observable, interval, Subject, from } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { expect, assert } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';

describe(`Observable usage`, () => {
  let testObservable: Observable<number>;
  let completeFunc;
  let nextFunc;
  let count;
  beforeEach(function () {
    count = 0;
    testObservable = interval(10).pipe(take(2));
    completeFunc = sinon.mock().exactly(1);
    nextFunc = sinon.mock().exactly(2);
  });
  afterEach(function () {
    completeFunc.verify();
    nextFunc.verify();
    assert(count === 2);
  });

  it('Observable.subscribe receive object contain next, error, complete', function (done) {
    testObservable.subscribe({
      next(data) {
        expect(data).to.equal(count++);
        nextFunc();
      },
      error(error) {
        done(error);
      },
      complete() {
        completeFunc();
        done();
      },
    });
  });
  it('Observable.subscribe receive three functions', function (done) {
    testObservable.subscribe(
      (data) => {
        expect(data).to.equal(count++);
        nextFunc();
      },
      (error) => {
        done(error);
      },
      () => {
        completeFunc();
        done();
      }
    );
  });
  it('Observable.subscribe.add could func as complte function', function (done) {
    testObservable
      .subscribe(
        (data) => {
          expect(data).to.equal(count++);
          nextFunc();
        },
        (error) => {
          done(error);
        }
      )
      .add(() => {
        completeFunc();
        done();
      });
  });
});

describe('Subject test', () => {
  it('Subject also implement as an observer', () => {
    const nextFunc = sinon.mock().exactly(6);

    const subject = new Subject();
    subject.subscribe(nextFunc);
    subject.subscribe(nextFunc);

    from([1, 2, 3])
      .pipe(
        finalize(() => {
          nextFunc.verify();
        })
      )
      .subscribe(subject); // subject as observer
  });

  it('Subject will unavailable after complete, error, unsubscribe', () => {
    const nextFunc = sinon.mock().exactly(2);
    const exceptionFunc = sinon.mock().exactly(1);
    const subject = new Subject();
    subject.subscribe(nextFunc);
    subject.next(1);
    subject.next(2);

    subject.complete();
    subject.next(3); // next after complete will be ignore sliently

    subject.unsubscribe();
    try {
      subject.next(4); // next after unsubscribe will throw ObjectUnsubscribedError
    } catch (err) {
      exceptionFunc();
    }

    setTimeout(() => {
      nextFunc.verify();
      exceptionFunc.verify();
    });
  });
});
