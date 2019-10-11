import 'jsdom-global/register';
import * as sinon from 'sinon';
import { fromEvent, from, of, Observable, defer, empty, generate, interval, range, throwError, timer } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { expect, assert } from 'chai';
import { describe, it, before, after } from 'mocha';

describe('fromEvent usage', function() {
    this.timeout(5000);
    it('fromEvent could convert event to Observable', function(done) {
        const button = document.createElement('button');
        fromEvent(button, 'click').subscribe((event: MouseEvent) => {
            console.log(event.target);
            expect(event.target).to.be.an.instanceof(HTMLButtonElement);
            done();
        });
        setTimeout(() => {
            button.click();
        }, 2000);
    });
});

describe('from usage', function() {
    it('from could emit array as a sequence of values', (done) => {
        let count = 0;
        from([1, 2, 3, 4]).subscribe((item: number) => {
            assert(item === (++ count));
        }, () => {}, () => {
            assert(count === 4);
            done();
        });
    });
    it('from could emit string as a sequence of characters', (done) => {
        const source = 'Hello World';
        let index = 0;
        from(source).subscribe((item) => {
            expect(item).to.equal(source.charAt(index));
            index += 1;
        }, done, done);
    });
    it('from could convert a promise to observable', (done) => {
        const source = 'Hello World';
        const observableFromPromise = from(new Promise((resolve) => resolve(source)));
        observableFromPromise.subscribe((res) => {
            expect(res).to.equal(source);
            done();
        });
    });
    it('from could convert map to observable', (done) => {
        const source1 = [1, 'Hello'];
        const source2 = [2, 'World'];
        const map = new Map();
        map.set(1, 'Hello');
        map.set(2, 'World');
        let index = 0;
        from(map).subscribe((item) => {
            expect(item).to.eql(index === 0 ? source1 : source2);
            index += 1;
        }, done, done);
    });
});

describe('of usage', function() {
    it('of delevier values in sequence', (done) => {
        let count = 0;
        of(1, 2, 3, 4).subscribe((item) => {
            expect(item).to.equal(++ count);
        }, done, () => {
            assert(count === 4);
            done();
        });
    });
});

describe('rxjs/ajax usage', function() {
    this.timeout(10000);
    const url = `https://api.github.com/users?per_page=2`;
    it('ajax could receive url and fetch response object', (done) => {
        const usersObservable = ajax(url);
        usersObservable.subscribe((res) => {
            expect(res.status).to.equal(200);
        }, done, done);
    });
    it('ajax could receive object with url, method, headers, body... attributes', (done) => {
        const usersObservable = ajax({
            url,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: {

            },
        });
        usersObservable.subscribe((res) => {
            expect(res.status).to.equal(200);
        }, done, done);
    });
    describe('ajax.getJSON usage', function() {
        let mockFunc: sinon.SinonExpectation;
        before(function() {
            mockFunc = sinon.mock().never();
        });
        after(function() {
            mockFunc.verify();
        });
        it('ajax.getJSON fetch data', (done) => {
            const usersDataObservable = ajax.getJSON(url);
            usersDataObservable.subscribe((users) => {
                expect(users).to.an.instanceof(Array);
            }, done, done);
        });
        it('ajax.getJSON receive Error Object', (done) => {
            const notFoundUrl = `https://api.github.com/error`;
            const usersDataObservable = ajax.getJSON(notFoundUrl);
            usersDataObservable.subscribe(mockFunc, (error) => {
                expect(error).to.an.instanceof(Error);
                done();
            }, done);
        });
    });
});

describe('Observable constructor usage', function() {
    this.timeout(10000);
    let fakeFunc: sinon.SinonSpy;
    let mockFunc: sinon.SinonExpectation;
    before(() => {
        fakeFunc = sinon.fake();
        mockFunc = sinon.mock().exactly(4);
    });
    after(() => {
        expect(fakeFunc.getCall(0).lastArg).to.equal('Hello');
        expect(fakeFunc.getCall(1).lastArg).to.equal('World');
        mockFunc.verify();
    });
    it('Observable constructor receive function and create a Observable', function() {
        const newObservable = new Observable((observer) => {
            observer.next('Hello');
            observer.next('World');
            observer.complete();
        });
        newObservable.subscribe((data) => {
            fakeFunc(data);
        });
    });
    it('Observable constructor receive function which could return unsubscribe function', function(done) {
        let count = 0;
        const evenObservable = new Observable((observer) => {
            const timer = setInterval(() => {
                if (count % 2 === 0) {
                    observer.next(count);
                }
                count += 1;
            }, 1000);
            return () => clearInterval(timer);
        });
        const unsubscriber = evenObservable.subscribe((item) => {
            console.log(`interval received: ${item}: ${count}`);
            mockFunc(item);
        }, () => {}, () => {
            console.log(`subscribe complete: ${count}`);
        });
        // unsubscribe after 8s
        setTimeout(() => {
            unsubscriber.unsubscribe();
            done();
        }, 8000);
    });
});

describe('defer usage', function() {
    this.timeout(10000);
    it('defer could delay retrive operators of Observable util subscribed', function(done) {
        const s1 = of(new Date().getTime());  // current date time
        const s2 = defer(() => of(new Date().getTime()));  // date time at the moment of subscribe
        const curTimeStamp = new Date().getTime();
        s1.subscribe((timestamp) => {
            expect(timestamp).to.be.closeTo(curTimeStamp, 10);
        });
        setTimeout(() => {
            s2.subscribe((timestamp) => {
                expect(timestamp - curTimeStamp).to.be.greaterThan(2000);
                done();
            });
        }, 2500);
    });
});

describe('empty usage', function() {
    let mockNextFunc: sinon.SinonExpectation;
    let mockCompleteFunc: sinon.SinonExpectation;
    before(function() {
        mockNextFunc = sinon.mock().never();
        mockCompleteFunc = sinon.mock().exactly(1);
    });
    after(function() {
        mockNextFunc.verify();
        mockCompleteFunc.verify();
    });
    it('empty should complete directly without next', function() {
        empty().subscribe({
            next: mockNextFunc,
            complete: mockCompleteFunc,
        });
    });
});

describe('generate usage', function() {
    this.timeout(10000);
    it('generate should terminate after reach predicate condition', function(done) {
        const fakeFunc = sinon.fake();
        generate(2, (x) => x <= 8, (x) => x + 3).subscribe((item) => {
            fakeFunc(item);
        }, done, () => {
            expect(fakeFunc.lastCall.lastArg).to.equal(8);
            expect(fakeFunc.callCount).to.equal(3);
            done();
        });
    });
    it('generate could execute something before emit', function(done) {
        const fakeFunc = sinon.fake();
        generate(2, (x) => x <= 8, (x) => x + 3, (x) => '*'.repeat(x)).subscribe((item) => {
            fakeFunc(item);
        }, done, () => {
            expect(fakeFunc.firstCall.lastArg).to.equal('*'.repeat(2));
            expect(fakeFunc.lastCall.lastArg).to.equal('*'.repeat(8));
            expect(fakeFunc.callCount).to.equal(3);
            done();
        });
    });
});

describe('interval usage', function() {
    this.timeout(5000);
    it('interval could emit sequence of values at specified interval', function(done) {
        let index = 0;
        const subscriber = interval(1000).subscribe((item) => {
            expect(item).to.equal(index);
            index += 1;
        });
        setTimeout(() => {
            subscriber.unsubscribe();
            done();
        }, 3000);
    });
});

describe('range usage', function() {
    this.timeout(5000);
    it('range emit a sequence of number by a range', function(done) {
        const fakeFunc = sinon.fake();
        // from 5, 10 times. in other words, [5, 15) or [5, 14]
        range(5, 10).subscribe((item) => {
            fakeFunc(item);
        }, done, () => {
            assert.strictEqual(fakeFunc.callCount, 10);
            expect(fakeFunc.firstCall.lastArg).to.equal(5);
            expect(fakeFunc.lastCall.lastArg).to.equal(10 + 5 - 1);
            done();
        });
    });
});

describe('throwError usage', function() {
    this.timeout(5000);
    it('throwError emit error directly, even complete will not be trigger', function(done) {
        const nextMockFunc = sinon.mock().never();
        const completeMockFunc = sinon.mock().never();
        const errorFakeFunc = sinon.fake();
        const subscriber = throwError('Error Message').subscribe({
            next: nextMockFunc,
            error: errorFakeFunc,
            complete: completeMockFunc,
        });
        setTimeout(() => {
            subscriber.unsubscribe();
            completeMockFunc.verify();
            nextMockFunc.verify();
            expect(errorFakeFunc.lastCall.lastArg).to.equal('Error Message');
            done();
        }, 1500);
    });
});

describe('timer usage', function() {
    this.timeout(10000);
    it('timer only emit once with only one paramter', function(done) {
        const mockFunc = sinon.mock().exactly(1);
        timer(1000).subscribe((item) => {
            mockFunc();
            expect(item).to.equal(0);
        }, done, done);
    });
    // tslint:disable-next-line: max-line-length
    it('timer emit first after delay(first argument) and emit subsequent values every period(second argument)', function(done) {
        let curTimeStamp = new Date().getTime();
        let index = 0;
        const subscriber = timer(1000, 2000).subscribe((item) => {
            const timeStamp = new Date().getTime();
            if (index === 0) {
                // emit first after delay(first arguemnt, 1000 ms here)
                expect(timeStamp - curTimeStamp).to.be.closeTo(1000, 20);
            } else {
                // emit subsequent values every period(second argument, 2000 ms here)
                expect(timeStamp - curTimeStamp).to.be.closeTo(2000, 20);
            }
            curTimeStamp = timeStamp;
            index ++;
        });
        setTimeout(() => {
            subscriber.unsubscribe();
            done();
        }, 8000);
    });
});
