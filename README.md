# rxjs 学习

通过编写测试用例学习 rxjs

- typescript
- mocha
- ts-mocha
- nyc
- chai
- sinon
- vscode 插件 mocha sidebar

## 完成进度

- creation operators 100%
- combination operators 30%
- marble test 70%

## 运行测试

```bash
npm i
npm run test
```

## marble test

- “-” 称为一个虚拟时间片，一个“-”表示 1ms
- “a-z”表示数据流出，-a--b---c 表示 2ms 时 a 产生，5ms 时 b 产生，9ms 时 c 产生
- “|” 表示数据流的结束，---a-| 表示 4ms 时 a 产生，6ms 时数据流结束
- “#” 表示数据流出错，---a--# 表示 4ms 时 a 产生，7ms 时数据流出错
- “()” 表示多个值在同一个时间单位内会产生多个值， -(ab|) 表示 2ms 时产生了 a 和 b，然后数据流结束
- “^” 表示订阅的节点，--^-- 表示 3ms 时有个订阅者进来（只针对 hot Observable）
- “!” 表示结束订阅的节点，--^--! 表示 3ms 时有个订阅者进来，6ms 时该订阅结束

## 高阶 Observable 的 flatten 策略

flatten 的含义和 lodash 中的`_.flatten`类似，在 rxjs 中，如果 Observable 生成的结果是也是 Observable，则为了得到内部 Observable 的结果，就需要进行内部的 subscribe 操作：

```ts
import { of } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

const subscription$ = of(12, 23).pipe(map((id) => ajax(`/api/get/${id}`)));

subscription$.subscribe((req$) => {
  req$.subscribe((res) => {
    console.log(res);
  });
});
```

显然这种方式比较笨重，所以 rxjs 提供了 4 种策略将其进行 flatten 操作，方便我们能够直接拿到内部 Observable 的结果：

- mergeMap 无策略，不做特殊的处理，来者不拒，都对内部的 Observable 进行处理（即 subscribe 操作，发出结果）
- switchMap 取消策略，当新的 Observable 处理之前先将前面的 Observable 取消掉（即 unsubscribe 操作）
- concatMap 队列策略，将每个 Observable 压入队列，按顺序处理，前一个处理完成才进行下一个
- exhaustMap 专注策略，即当前 Observable 还在处理时，忽略新到来的 Observable

## Notes

- 使用 mocha 时，如果为其方法提供箭头函数，则会丢失 mocha context，如果有需要设置超时时间等，请使用普通函数
- 高阶函数指返回函数的函数，而 rxjs 高阶 Observable 指返回 Observable 的 Observable，可使用`concatAll`、`mergeAll`等将其转换为普通 Observable（产出内部 Observable 想要产出的值）
