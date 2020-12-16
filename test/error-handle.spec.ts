import { expect } from 'chai';
import { interval, of, throwError } from 'rxjs';
import { delay, finalize, mergeMap, retry, retryWhen, tap } from 'rxjs/operators';

describe('error handle with catchError, retry and so on', () => {
  it('retry will retry observable when error occur', (done) => {
    const errorMsg = 'Greater than 3';
    const timer$ = interval(100).pipe(
      mergeMap((value) => {
        if (value > 3) {
          return throwError(errorMsg);
        }
        return of(value);
      }),
      retry(2),
      finalize(done)
    );
    let index = 0;
    let count = 0;
    timer$.subscribe(
      (value) => {
        expect(value).to.equal(index);
        if (index === 3) {
          // throwError after 3, and retry interval
          index = 0;
          count++;
        } else {
          index++;
        }
      },
      (err) => {
        expect(err).to.equal(errorMsg);
        // start + retry1 + retry2 = 3 times
        expect(count).to.equal(3);
      }
    );
  });

  it('retryWhen will not repeat source observable until notifier observable emit', (done) => {
    const errorMsg = 'Greater than 3';
    let count = 0;
    let index = 0;
    const timer$ = interval(50).pipe(
      mergeMap((value) => {
        if (value > 3) {
          return throwError(errorMsg);
        }
        return of(value);
      }),
      // after error occur 100ms, retry
      retryWhen((error) => {
        return error.pipe(
          delay(100),
          tap(() => {
            if (count > 2) {
              throw errorMsg;
            }
            count++;
          })
        );
      }),
      finalize(done)
    );
    timer$.subscribe(
      (value) => {
        expect(value).to.equal(index);
        if (index === 3) {
          // throwError after 3, and retry interval
          index = 0;
        } else {
          index++;
        }
      },
      (err) => {
        expect(err).to.equal(errorMsg);
        expect(count).to.equal(3);
      }
    );
  });
});
