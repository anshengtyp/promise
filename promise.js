// 定义promise的三个状态
const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'

// 该方法由x来决定promise2是成功还是失败,也就是决定下一个then的成功和失败
const resolvePromise = (promise2, x, resolve, reject) => {
    // 核心就是判断x的取值是否为promise，调成功和失败，如果是普通值就直接resolve
    // 判断x是否返回的是本身 也就是说return的是promise2
    if (promise2 === x) {
        return reject(new TypeError('类型出错'))
    }
    // 判断x的数据类型,暂时认为他是一个promise对象，进一步判断他的类型
    if (typeof x === 'object' && x !== null || typeof x === 'function') {
        // 测试的时候，会成功和失败都调用
        let called
        try {
            // x.then是为了看这个prosmie对象有没有then方法
            // 取then有可能这个then属性是通过defineProperty来定义的,直接进入报错处理
            let then = x.then
            if (typeof then === 'function') {   // 如果当前x有then方法，判断他是不是一个函数
                // then能保证第二次取then的值不出现报错，这里x是指将这个函数的this指向x
                then.call(x, y => {  //y是返回的成功的值也就是resolve(y)，
                    if (called) return  //如果调用过就直接return
                    called = true  //防止多次调用成功和失败
                    // 采用上一个promise的成功结果将y向下传递
                    resolvePromise(promise2, y, resolve, reject)  // y可能还是一个promise对象,使用递归,将y传进去，直到y是一个普通值为止
                }, r => {//失败的结果
                    if (called) return  //如果调用过就直接return
                    called = true  //防止多次调用成功和失败
                    reject(r)
                })
            } else {
                // 说明x就是一个普通对象，直接成功
                resolve(x)
            }
        } catch (e) {
            // promise失败了可能还会调用成功
            if (called) return  //如果调用过就直接return
            called = true  //防止多次调用成功和失败
            reject(e)
        }
    } else {
        // 如果x不是对象也不是函数就是一个普通值，就直接把return的值x返回给下一个then进行使用
        resolve(x)
    }

}

class TYP {
    // executor函数为promise对象的函数参数
    constructor(executor) {
        this.status = PENDING //默认状态
        this.value = undefined
        this.reason = undefined
        // 保存成功的回调
        this.onResolveCallbank = []
        // 保存失败的回调数组
        this.onRejectedCallback = []
        //executor函数的参数resolve
        let resolve = (value) => {
            // 防止状态改变又去更新状态
            if (this.status === PENDING) {
                this.value = value
                // 成功之后修改状态
                this.status = FULFILLED
                // 如果调用了成功的函数就执行存起来的成功数组
                this.onResolveCallbank.forEach(fn => fn())
            }
        }
        //executor函数的参数resolve
        let reject = (reason) => {
            if (this.status === PENDING) {
                this.reason = reason
                this.status = REJECTED
                this.onRejectedCallback.forEach(fn => fn()) //发布
            }
        }
        // 用来处理new promise内部报错，只能处理同步的错误，最后调用reject函数处理报错
        try {
            // 默认会立即执行,两个参数
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }
    // promise的then方法,有俩个参数，分别对应成功和失败的函数
    then(onFulfilled, onRejected) {
        // onFulfilled,onRejected是可选参数
        // date=>date代表将date return作为下一个then的参数
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : date => date
        onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }
        // then之后返回一个promise对象
        let promise2 = new TYP((resolve, reject) => {
            // 解决同步
            if (this.status === FULFILLED) {
                // js运行机制先执行微任务在执行宏任务，使用定时器为了拿到prommise2这个对象
                setTimeout(() => {
                    // try是用来处理异步任务中new promise内部错误问题，调用reject来处理
                    try {
                        // 成功调用的函数，传递成功的值,x是当前then return的值,将作为下一个then的参数使用
                        let x = onFulfilled(this.value)
                        // 1.调用promise2的resolve方法将x的值作为下一个then的参数
                        // 2.x可能是普通值也可能是一个promise
                        // 3.x决定了promise方法的状态是成功还是失败
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0);
            }

            if (this.status === REJECTED) {
                setTimeout(() => {
                    try {
                        // 失败调用的函数,传递失败的值
                        let x = onRejected(this.reason)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0);
            }

            // 当状态为pending的时候需要把成功或者失败的函数存起来处理异步函数
            if (this.status === PENDING) {
                // 将成功的回调放在数组里面
                this.onResolveCallbank.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value)
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0);
                })
                // 将失败的回调放在数组里面,用函数执行是为了方便日后添加逻辑
                this.onRejectedCallback.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason)
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0);
                })
            }
        })
        // 将promise2作为下一个then的参数
        return promise2
    }
}


// 测试
let p = new TYP((resolve, reject) => {
    reject('成功率')
})

let promise2 = p.then(date => {
    // console.log(date);
    return 10000
}, err => {
    return 0
})


promise2.then(a => {
    return a
}, err => {
    return err
}).then(b => {
    return b
}, err => {
    return err
}).then(date => {
    console.log(date);
}, err => {
    console.log(err);
})
// 0

// // 测试时会调用此方法
// Promise.defer = Promise.deferred = function () {
//     let dfd = {};
//     dfd.promise = new Promise((resolve,reject)=>{
//         dfd.resolve = resolve;
//         dfd.reject = reject
//     })
//     return dfd;
// }