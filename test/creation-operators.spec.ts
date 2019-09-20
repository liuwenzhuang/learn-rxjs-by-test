import 'jsdom-global/register';
import * as sinon from 'sinon';
import { fromEvent, from, of, Observable, defer, empty } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { expect, assert } from 'chai';
import { describe, it, before, after } from 'mocha';

describe('fromEvent usuage', function() {
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

describe('from usuage', function() {
    it('from could emit array as a sequence of values', (done) => {
        let count = 0;
        from([1, 2, 3, 4]).subscribe((item: number) => {
            assert(item === (++ count));
        }, () => {}, () => {
            assert(count === 4);
            done();
        });
    });
});

describe('of usuage', function() {
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

describe('rxjs/ajax usuage', function() {
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
    describe('ajax.getJSON usuage', function() {
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

describe('Observable constructor usuage', function() {
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

describe('defer usuage', function() {
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

describe('empty usuage', function() {
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
