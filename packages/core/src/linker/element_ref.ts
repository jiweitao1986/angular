/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * A wrapper around a native element inside of a View.
 * View中原生元素的包裹
 *
 * An `ElementRef` is backed by a render-specific element. In the browser, this is usually a DOM
 * element.
 * 一个ElementRef背后往往有一个用于渲染的元素，在浏览器中，往往是一个DOM元素
 * 
 * @security Permitting direct access to the DOM can make your application more vulnerable to
 * XSS attacks. Carefully review any use of `ElementRef` in your code. For more detail, see the
 * [Security Guide](http://g.co/ng/security).
 * 允许直接访问DOM往往会让你的应用更容易被XSS攻击。小心检查代码中所有使用ElementRef的地方。
 * 更多细节参见:.....
 *
 * @stable
 */
// Note: We don't expose things like `Injector`, `ViewContainer`, ... here,
// i.e. users have to ask for what they need. With that, we can build better analysis tools
// and could do better codegen in the future.
export class ElementRef {
  /**
   * The underlying native element or `null` if direct access to native elements is not supported
   * (e.g. when the application runs in a web worker).
   *
   * <div class="callout is-critical">
   *   <header>Use with caution</header>
   *   <p>
   *    Use this API as the last resort when direct access to DOM is needed. Use templating and
   *    data-binding provided by Angular instead. Alternatively you take a look at {@link Renderer}
   *    which provides API that can safely be used even when direct access to native elements is not
   *    supported.
   *    当需要直接访问DOM的时候，将使用这个API作为最后的手段。使用Angular提供的模板和数据绑定来代替直接访问DOM。
   *    作为一个替换方案，可以看一下Renderer，它提供了安全的访问native element的API。
   *   </p>
   *   <p>
   *    Relying on direct DOM access creates tight coupling between your application and rendering
   *    layers which will make it impossible to separate the two and deploy your application into a
   *    web worker.
   *    依赖直接访问DOM会导致应用和渲染层的紧耦合，这样会导致无法分离这两个层次，无法将应用部署到web worker里。
   *   </p>
   * </div>
   * @stable
   */
  public nativeElement: any;
  
  /**
   * 构造函数
   * @param nativeElement
   */
  constructor(nativeElement: any) {
    this.nativeElement = nativeElement;
  }
}
