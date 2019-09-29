import * as sinon from 'sinon';
import { expect, assert } from 'chai';
import { describe, it, before, after } from 'mocha';
import { combineLatest, of, timer, Observable, from } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

describe('startWith usuage', function() {
    this.timeout(3000);
    it('startWith will emit before source observables', function(done) {
        const source = of(1, 2, 3);
        let index = 0;
        source.pipe(startWith(0)).subscribe((item) => {
            expect(item).to.equal(index ++);
        }, done, done);
    });
    it('startWith could emit multi values before source observables', function(done) {
        const source = from([1, 2, 3]);
        let index = -3;
        source.pipe(startWith(-3, -2, -1, 0)).subscribe((item) => {
            expect(item).to.equal(index ++);
        }, done, done);
    });
});

describe('combineLatest usuage', function() {
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
