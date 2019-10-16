import 'jsdom-global/register';
import * as sinon from 'sinon';
import { expect, assert } from 'chai';
import { describe, it, before, after } from 'mocha';
import { combineLatest, of, timer, Observable, from, concat, interval, forkJoin, throwError, merge, fromEvent } from 'rxjs';
import { map, startWith, endWith, concatAll, take, catchError, mergeAll } from 'rxjs/operators';

describe('startWith、endWith usage', function() {
    this.timeout(3000);
    it('startWith/endWith will emit before/after source observables', function(done) {
        const source = of(1, 2, 3);
        let startIndex = 0;
        let endIndex = 1;
        const startObserver = source.pipe(startWith(0)).subscribe((item) => {
            expect(item).to.equal(startIndex++);
        });
        const endObserver = source.pipe(endWith(4)).subscribe((item) => {
            expect(item).to.equal(endIndex++);
        });
        setTimeout(() => {
            startObserver.unsubscribe();
            endObserver.unsubscribe();
            done();
        }, 2000);
    });
    it('startWith/endWith could emit multi values before/after source observables', function(done) {
        const source = from([1, 2, 3]);
        let startIndex = -3;
        let endIndex = 1;
        const startObserver = source.pipe(startWith(-3, -2, -1, 0)).subscribe((item) => {
            expect(item).to.equal(startIndex++);
        }, done, done);
        const endObserver = source.pipe(endWith(4, 5, 6)).subscribe((item) => {
            expect(item).to.equal(endIndex++);
        });
        setTimeout(() => {
            startObserver.unsubscribe();
            endObserver.unsubscribe();
            done();
        });
    });
});

describe('forkJoin usage', function() {
    this.timeout(8000);
    it('forkJoin only concern last values from observables', function(done) {
        const observable01 = of(1, 2, 3);
        const observable02 = Promise.resolve(4);
        forkJoin(observable01, observable02).subscribe((list) => {
            expect(list).to.eql([3, 4]);
        });
        forkJoin({
            result01: observable01,
            result02: observable02
        }).subscribe((resultObj) => {
            expect(resultObj).to.eql({
                result01: 3,
                result02: 4
            });
        }, done, done);
    });
    it('forkJoin will not emit anything if part of sources not end', function(done) {
        const observable01 = interval(1000);  // will not end
        const observable02 = of(-3, -2, -1);
        const mockFunc = sinon.mock().never();
        const neverEmit = forkJoin([observable01, observable02]).subscribe((list) => {
            mockFunc(list);
        });
        setTimeout(() => {
            neverEmit.unsubscribe();
            mockFunc.verify();
            done();
        }, 7000);
    });
    it('forkJoin could catch errors from inner sources outside', function(done) {
        const catchOutside = forkJoin(
            throwError('first error'),
            of(1, 2, 3),
            throwError('error from inner source')
        ).pipe(catchError((err) => of(err)));    // only receive first error from inner sources
        catchOutside.subscribe((item) => {
            expect(item).to.equal('first error');
        }, done, done);
    });
});

describe('concat usage', function() {
    this.timeout(8000);
    it('concat work likes queues, one by one', function(done) {
        const observable01 = of(1, 2, 3);
        const observable02 = of(4, 5, 6);
        const observable03 = of(7, 8, 9);
        let index = 1;
        concat(observable01, observable02, observable03).subscribe((item) => {
            expect(item).to.equal(index++);
        }, done, done);
    });
    it('subsequent observables will not run before previous observable', function(done) {
        const observable01 = interval(1000);  // will never complete
        const observable02 = of(-3, -2, -1);
        const subscriber = concat(observable01, observable02).subscribe((item) => {
            expect(item).to.least(0);
        });
        setTimeout(() => {
            subscriber.unsubscribe();
            done();
        }, 4000);
    });
});

describe('concatAll usage', function() {
    this.timeout(20000);
    it('concatAll colud flatten observables from inner observable', function(done) {
        let index = 2;
        of(1, 2, 3).pipe(
            map((item) => of(item + 1)),    // inner observable also emit observable
            concatAll()
        ).subscribe((item) => {
            expect(item).to.equal(index++);
        }, done, done);
    });
    it('concatAll also could flatten promises from inner observable', function(done) {
        const echoPromise = (value) => new Promise((resolve) => resolve(value));
        let index = 1;
        of(1, 2, 3).pipe(
            map((item) => echoPromise(item)),
            concatAll()
        ).subscribe((item) => {
            expect(item).to.equal(index++);
        }, done, done);
    });
    it('concatAll subscribe next inner observable after previous inner observable complete', function(done) {
        // observable01: ----0----1----2----3----4
        // observable02:                          --0--1
        // observable03:                                --------0
        const observable01 = interval(1000).pipe(take(5));
        const observable02 = interval(500).pipe(take(2));
        const observable03 = interval(2000).pipe(take(1));
        let count = 0;
        of(observable01, observable02, observable03).pipe( // emit observables
            concatAll()
        ).subscribe((item) => {
            if (count >= 7) {
                expect(item).equal(count - 7);
            } else if (count >= 5) {
                expect(item).equal(count - 5);
            } else {
                expect(item).equal(count);
            }
            count++;
        }, done, done);
    });
});

describe('merge usage', function() {
    this.timeout(9000);
    it('merge does not concern order and emit when part of sources emit', function(done) {
        const observable01 = interval(500).pipe(map((item) => `observable01.${item}`), take(4));  // --0--1--2--3
        const observable02 = interval(1000).pipe(map((item) => `observable02.${item}`), take(2)); // ----0----1
        const observable03 = interval(2000).pipe(map((item) => `observable03.${item}`), take(1)); // --------0
        const fakeFunc = sinon.fake();
        merge(
            observable01,
            observable02,
            observable03
        ).subscribe((item) => {
            fakeFunc(item);
        }, done, () => {
            expect(fakeFunc.callCount).to.equal(7);
            expect(fakeFunc.firstCall.lastArg).to.equal('observable01.0');
            expect(fakeFunc.getCall(1).lastArg).to.equal('observable02.0');
            done();
        });
    });
});

describe('mergeAll usuage', function() {
    this.timeout(30000);
    it('mergeAll could flatten high-order observables', function(done) {
        const observable = of(1, 2, 3);
        // high-order observables mean result in observable, not plain data
        const highOrder = observable.pipe(map((item) => of(item + 1)));
        const flatten = highOrder.pipe(mergeAll()); // emit 2 3 4
        let index = 2;
        flatten.subscribe((item) => {
            expect(item).to.equal(index++);
        }, done, done);
    });
    // tslint:disable-next-line: max-line-length
    it(`mergeAll could receive param to control maximum number of inner Observables being subscribed to concurrently`, function(done) {
        const sourceObservable = fromEvent(document, 'click');
        const hightOrderObservable = sourceObservable.pipe(  // every click triggers --0--1--2--3--4
            map(
                (event) => interval(1000).pipe(take(5))
            )
        );
        // only subscribe one click event in same time
        const flattenObservable = hightOrderObservable.pipe(mergeAll(1));
        let index = 0;
        const observer = flattenObservable.subscribe((item) => {
            expect(item).to.equal(index);
            index ++;
            // previous click done, handle next click(maybe triggered during previous click)
            if (index === 5) {
                index = 0;
            }
        });
        // click body three times
        document.body.click();
        document.body.click();
        document.body.click();
        setTimeout(() => {
            observer.unsubscribe();
            done();
        }, 20000);
    });
});

describe('combineLatest usage', function() {
    this.timeout(9000);
    it('combineLatest will actually wait for all input Observables to emit at least once, before it starts emitting results', function(done) {
        const curTimeStamp = new Date().getTime();
        combineLatest(
            timer(1000),
            timer(500),
        ).subscribe((value) => {
            // will emit after about 1000ms, not 500ms because first timer has no production yet
            const timeStamp = new Date().getTime();
            expect(timeStamp - curTimeStamp).to.be.closeTo(1000, 50);
            expect(value).to.have.lengthOf(2);
        }, done, done);
    });
    it('combineLatest pick most recent values from each observables', function(done) {
        // TIME LINE         0.0 0.5  1.0  1.5 2.0   2.5  3.0   3.5 4.0  4.5  5.0  5.5 6.0  6.5  7.0  7.5 8.0
        // 1st Observable    _   _    0(E)  _  1(E)  1    2(E)  _   3(E) 3    4(E) _   5(E) 5    6(E)  _  7(E)
        // 2nd Observable    _   0(E) 0     _  0     1(E) 1     _   1    2(E) 2    _   2    3(E) 3     _  3
        const fakeFunc = sinon.fake();
        const subscriber = combineLatest(
            timer(1000, 1000),
            timer(500, 2000),
        ).subscribe((values) => {
            fakeFunc(values);
            expect(values).to.have.lengthOf(2);
        });
        setTimeout(() => {
            subscriber.unsubscribe();
            expect(fakeFunc.callCount).to.equal(11);
            expect(fakeFunc.firstCall.lastArg).to.eql([0, 0]);
            expect(fakeFunc.lastCall.lastArg).to.eql([7, 3]);
            done();
        }, 8300);
    });
    it('combieLatest use pipe map function as projection(receive ...argArray)', function(done) {
        let index = 2;
        const observableOdd = of(1, 3, 5);    // 1(E) 3(E) 5(E) 5    5    5
        const observableEven = of(2, 4, 6);   // _    _    _    2(E) 4(E) 6(E)
        combineLatest(
            observableOdd,
            observableEven
        ).pipe(
            map(([oddValue, evenValue]) => {
                return oddValue * evenValue;
            })
        ).subscribe((projectionValue) => {
            console.log(projectionValue);
            expect(projectionValue).to.equal(5 * index);
            index += 2;
        }, done, done);
    });
});
