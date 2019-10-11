import * as sinon from 'sinon';
import { Observable, interval } from 'rxjs';
import { take } from 'rxjs/operators';
import { expect, assert } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';

describe(`Observable usage`, function() {
    let testObservable: Observable<number>;
    let completeFunc;
    let nextFunc;
    let count;
    this.timeout(10000);
    beforeEach(() => {
        count = 0;
        testObservable = interval(1000).pipe(take(2));
        completeFunc = sinon.mock().exactly(1);
        nextFunc = sinon.mock().exactly(2);
    });
    afterEach(() => {
        completeFunc.verify();
        nextFunc.verify();
        assert(count === 2);
    });
    it('Observable.subscribe receive object contain next, error, complete', function(done) {
        testObservable.subscribe({
            next(data) {
                expect(data).to.equal(count ++);
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
    it('Observable.subscribe receive three functions', function(done) {
        testObservable.subscribe((data) => {
            expect(data).to.equal(count ++);
            nextFunc();
        }, (error) => {
            done(error);
        }, () => {
            completeFunc();
            done();
        });
    });
    it('Observable.subscribe.add could func as complte function', function(done) {
        testObservable.subscribe((data) => {
            expect(data).to.equal(count ++);
            nextFunc();
        }, (error) => {
            done(error);
        }).add(() => {
            completeFunc();
            done();
        });
    });
});
