# rxjs学习

通过编写测试用例学习rxjs

- typescript
- mocha
- ts-mocha
- nyc
- chai
- sinon
- vscode插件 mocha sidebar

## 完成进度

- creation operators 100%
- combination operators 30%

## 运行测试

```bash
$ npm i
$ npm run test
```

## Notes

- 使用mocha时，如果为其方法提供箭头函数，则会丢失mocha context，如果有需要设置超时时间等，请使用普通函数
- 高阶函数指返回函数的函数，而rxjs高阶Observable指返回Observable的Observable，可使用`concatAll`、`mergeAll`等将其转换为普通Observable（产出内部Observable想要产出的值）
