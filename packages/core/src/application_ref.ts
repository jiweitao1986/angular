/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Subscription} from 'rxjs/Subscription';
import {merge} from 'rxjs/observable/merge';
import {share} from 'rxjs/operator/share';

import {ErrorHandler} from '../src/error_handler';
import {scheduleMicroTask, stringify} from '../src/util';
import {isPromise} from '../src/util/lang';

import {ApplicationInitStatus} from './application_init';
import {APP_BOOTSTRAP_LISTENER, PLATFORM_INITIALIZER} from './application_tokens';
import {Console} from './console';
import {Injectable, InjectionToken, Injector, StaticProvider} from './di';
import {CompilerFactory, CompilerOptions} from './linker/compiler';
import {ComponentFactory, ComponentRef} from './linker/component_factory';
import {ComponentFactoryBoundToModule, ComponentFactoryResolver} from './linker/component_factory_resolver';
import {InternalNgModuleRef, NgModuleFactory, NgModuleRef} from './linker/ng_module_factory';
import {InternalViewRef, ViewRef} from './linker/view_ref';
import {WtfScopeFn, wtfCreateScope, wtfLeave} from './profile/profile';
import {Testability, TestabilityRegistry} from './testability/testability';
import {Type} from './type';
import {NgZone, NoopNgZone} from './zone/ng_zone';

// 是否是开发模式
let _devMode: boolean = true;

//是否禁用模式锁定
let _runModeLocked: boolean = false;

// 平台Ref
let _platform: PlatformRef;

//是否允许多平台标志
export const ALLOW_MULTIPLE_PLATFORMS = new InjectionToken<boolean>('AllowMultipleToken');

/**
 * 禁用angular的开发模式
 * Disable Angular's development mode, which turns off assertions and other
 * checks within the framework.
 *
 * One important assertion this disables verifies that a change detection pass
 * does not result in additional changes to any bindings (also known as
 * unidirectional data flow).
 *
 * @stable
 */
export function enableProdMode(): void {

  //如果不允许修改模式，则抛出错误
  if (_runModeLocked) {
    throw new Error('Cannot enable prod mode after platform setup.');
  }

  //设置
  _devMode = false;
}

/**
 * --------------------------------------------------------------------------------
 * 返回angular是否是开发模式，一旦调用，则是否开发模式将被锁定，不再允许修改
 * --------------------------------------------------------------------------------
 * 
 * Returns whether Angular is in development mode. After called once,
 * the value is locked and won't change any more.
 *
 * By default, this is true, unless a user calls `enableProdMode` before calling this.
 *
 * @experimental APIs related to application bootstrap are currently under review.
 */
export function isDevMode(): boolean {
  _runModeLocked = true;
  return _devMode;
}

/**
 * --------------------------------------------------------------------------------
 * NgProbe
 * --------------------------------------------------------------------------------
 * 
 * A token for third-party components that can register themselves with NgProbe.
 *
 * @experimental
 */
export class NgProbeToken {
  constructor(public name: string, public token: any) {}
}

/**
 * --------------------------------------------------------------------------------
 * 创建platformRef
 * @param injector 注射器
 * @return PlatformRef
 * --------------------------------------------------------------------------------
 *
 * Creates a platform.
 * Platforms have to be eagerly created via this function.
 *
 * @experimental APIs related to application bootstrap are currently under review.
 */
export function createPlatform(injector: Injector): PlatformRef {

  // 如果_platform已经存在，没有被销毁，并且不允许多平台，则不允许再创建，抛出错误
  if (_platform && !_platform.destroyed &&
      !_platform.injector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {
    throw new Error(
        'There can be only one platform. Destroy the previous one to create a new one.');
  }

  // 从注入器注入
  _platform = injector.get(PlatformRef);

  const inits = injector.get(PLATFORM_INITIALIZER, null);
  
  if (inits) inits.forEach((init: any) => init());

  return _platform;
}

/**
 * --------------------------------------------------------------------------------
 * 创建PlatformFactory
 * 该方法返回一个工厂函数，工厂函数接受StaticProvider[]，返回一个PlatformRef
 * 为什么要提供一个工厂的工厂？？？
 * 因为，要统一配置返回给开发者的PlatformRefFactory，为它预制providers
 * 或者通过parentPlatformFactory控制创建工厂的逻辑
 * @param parentPlatformFactory 父工厂
 * @param name 名称
 * @param providers 注入配置
 * --------------------------------------------------------------------------------
 * 
 * Creates a factory for a platform
 * 
 * @experimental APIs related to application bootstrap are currently under review.
 */
export function createPlatformFactory(
  parentPlatformFactory: ((extraProviders?: StaticProvider[]) => PlatformRef) | null,
  name: string,
  providers: StaticProvider[] = []
): (extraProviders?: StaticProvider[]) => PlatformRef {

  //marker
  const marker = new InjectionToken(`Platform: ${name}`);
  return (extraProviders: StaticProvider[] = []) => {

    // 先查找是否已经存在已经构建好的PlatFormRef实例
    let platform = getPlatform();
    
    // 如果没有或者允许有多个PlatformRef，则进行创建
    if (!platform || platform.injector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {

      if (parentPlatformFactory) {
        parentPlatformFactory(
            providers.concat(extraProviders).concat({provide: marker, useValue: true})
        );
      } else {
        createPlatform(Injector.create(
            providers.concat(extraProviders).concat({provide: marker, useValue: true})));
      }

    }
    return assertPlatform(marker);
  };
}


/**
 * --------------------------------------------------------------------------------
 * 检查平台是否包含了某个必要的token
 * --------------------------------------------------------------------------------
 * 
 * Checks that there currently is a platform which contains the given token as a provider.
 * 检查当前是否存在一个platform，并且这个platform包含了requiredToken（含有Platform name的Token），
 * 这个检查是来判断之前创建出来的platform和已经存在的是否一致，如果不一致，需要先销毁掉原来的，再创建
 * 
 * @experimental APIs related to application bootstrap are currently under review.
 */
export function assertPlatform(requiredToken: any): PlatformRef {

  // 先获取已有的PlatformRef
  const platform = getPlatform();

  if (!platform) {
    throw new Error('No platform exists!');
  }

  if (!platform.injector.get(requiredToken, null)) {
    throw new Error(
        'A platform with a different configuration has been created. Please destroy it first.');
  }

  return platform;
}

/**
 * --------------------------------------------------------------------------------
 *  销毁platform
 * --------------------------------------------------------------------------------
 * 
 * Destroy the existing platform.
 *
 * @experimental APIs related to application bootstrap are currently under review.
 */
export function destroyPlatform(): void {
  if (_platform && !_platform.destroyed) {
    _platform.destroy();
  }
}

/**
 * --------------------------------------------------------------------------------
 * 获取当前platform
 * --------------------------------------------------------------------------------
 * 
 * Returns the current platform.
 *
 * @experimental APIs related to application bootstrap are currently under review.
 */
export function getPlatform(): PlatformRef|null {
  return _platform && !_platform.destroyed ? _platform : null;
}

/**
 * Provides additional options to the bootstraping process.
 *
 * @stable
 */
export interface BootstrapOptions {
  /**
   * Optionally specify which `NgZone` should be used.
   *
   * - Provide your own `NgZone` instance.
   * - `zone.js` - Use default `NgZone` which requires `Zone.js`.
   * - `noop` - Use `NoopNgZone` which does nothing.
   */
  ngZone?: NgZone|'zone.js'|'noop';
}













/**
 * --------------------------------------------------------------------------------
 * platform是angular的入口，每个页面有一个应用。
 * 通过platform factory创建platform时，
 * --------------------------------------------------------------------------------
 * 
 * The Angular platform is the entry point for Angular on a web page. Each page
 * has exactly one platform, and services (such as reflection) which are common
 * to every Angular application running on the page are bound in its scope.
 * platform 是一个Web页面上Angular的入口。每个page只有一个platform，
 * 每个运行在页面上的Angular应用所需的公共服务绑定在这个范围内。
 *
 * A page's platform is initialized implicitly when a platform is created via a platform factory
 * (e.g. {@link platformBrowser}), or explicitly by calling the {@link createPlatform} function.
 * 当一个platform通过一个platform factory创建时，这个platform被隐式的初始化，
 * 或者通过调用createPlatform显式的进行初始化。
 * 
 * @stable
 */
@Injectable()
export class PlatformRef {

  /**
   * platform内的模块集合
   */
  private _modules: NgModuleRef<any>[] = [];

  /**
   * 注册的销毁回调函数
   */
  private _destroyListeners: Function[] = [];

  /**
   * 是否被销毁
   */
  private _destroyed: boolean = false;

  /**
   * 构造函数
   */
  constructor(private _injector: Injector) {}

  
  /**
   * Creates an instance of an `@NgModule` for the given platform
   * for offline compilation.
   *
   * ## Simple Example
   *
   * ```typescript
   * my_module.ts:
   *
   * @NgModule({
   *   imports: [BrowserModule]
   * })
   * class MyModule {}
   *
   * main.ts:
   * import {MyModuleNgFactory} from './my_module.ngfactory';
   * import {platformBrowser} from '@angular/platform-browser';
   *
   * let moduleRef = platformBrowser().bootstrapModuleFactory(MyModuleNgFactory);
   * ```
   *
   * @experimental APIs related to application bootstrap are currently under review.
   */
  bootstrapModuleFactory<M>(
    moduleFactory: NgModuleFactory<M>,
    options?: BootstrapOptions
  ): Promise<NgModuleRef<M>> {
    
        // Note: We need to create the NgZone _before_ we instantiate the module,
    // as instantiating the module creates some providers eagerly.
    // So we create a mini parent injector that just contains the new NgZone and
    // pass that as parent to the NgModuleFactory.
    const ngZoneOption = options ? options.ngZone : undefined;
    const ngZone = getNgZone(ngZoneOption);

    // Attention: Don't use ApplicationRef.run here,
    // as we want to be sure that all possible constructor calls are inside `ngZone.run`!
    return ngZone.run(() => {

      // 创建moduleRef
      // 注意：创建模块时需要为模块构造一个injector，即ngZoneInjector
      // 这个injector是根据PlatformRef的injector + NgZone的provider构造出来的。
      // TODO：继续往上追溯PlatformRef的injector的构造过程？？？？？？
      const ngZoneInjector = Injector.create([{provide: NgZone, useValue: ngZone}], this.injector);
      const moduleRef = <InternalNgModuleRef<M>>moduleFactory.create(ngZoneInjector);

      // ExeceptionHandler
      const exceptionHandler: ErrorHandler = moduleRef.injector.get(ErrorHandler, null);
      if (!exceptionHandler) {
        throw new Error('No ErrorHandler. Is platform module (BrowserModule) included?');
      }

      // 注册ModuleRef回调函数，当ModuleRef的onDestroy执行的时候， 从PlatformRef的_modules中移除注册
      moduleRef.onDestroy(() => remove(this._modules, moduleRef));
      
      // 当ngZone检测到错误的时候，使用ErrorHandler处理错误。
      ngZone !.runOutsideAngular(
        () => ngZone !.onError.subscribe({
          next: (error: any) => {
            exceptionHandler.handleError(error);
          }
        })
      );

      return _callAndReportToErrorHandler(exceptionHandler, ngZone !, () => {
        
        // 运行ModuleRef注入器中注入的的ApplicationInitStatus
        const initStatus: ApplicationInitStatus = moduleRef.injector.get(ApplicationInitStatus);
        initStatus.runInitializers();
        
        // 当ApplicationsStatus完成之后，执行模块的启动（_moduleDoBootstrap）
        return initStatus.donePromise.then(() => {

          // !!!!!!
          this._moduleDoBootstrap(moduleRef);

          return moduleRef;
        });
      });

    });
  }

  /**
   * Creates an instance of an `@NgModule` for a given platform using the given runtime compiler.
   *  使用给定的compiler为一个给定的platform创建创建一个NgModule实例。
   * 
   * @param moduleType 模块类型
   * @param compilerOptions 编译配置
   * 
   * 1、该方法会先获取CompilerFactory，从而创建出一个Compiler实例；
   * 2、然后使用compiler编译模块获取模块工厂，然后走bootstrapModuleFactory的流程
   * 3、与bootstrapModuleFactory的区别就是多了编译模块获取对应的ModuleFactory的工厂。
   * 
   * ## Simple Example
   *
   * ```typescript
   * @NgModule({
   *   imports: [BrowserModule]
   * })
   * class MyModule {}
   *
   * let moduleRef = platformBrowser().bootstrapModule(MyModule);
   * ```
   * @stable
   */
  bootstrapModule<M>(
      moduleType: Type<M>,
      compilerOptions: (CompilerOptions&BootstrapOptions)| Array<CompilerOptions&BootstrapOptions> = []
  ): Promise<NgModuleRef<M>> {
  
    // compilerFactory
    const compilerFactory: CompilerFactory = this.injector.get(CompilerFactory);
  
    // options
    const options = optionsReducer({}, compilerOptions);
  

    // compiler
    const compiler = compilerFactory.createCompiler([options]);

    //
    return compiler.compileModuleAsync(moduleType)
        .then((moduleFactory) => this.bootstrapModuleFactory(moduleFactory, options));
  }


  /**
   * 模块启动
   * 注意：在这里开始和ApplicationRef建立关联了
   * @param moduleRef 
   */
  private _moduleDoBootstrap(moduleRef: InternalNgModuleRef<any>): void {

    // 从模块的injector中获取ApplicationRef的实例
    const appRef = moduleRef.injector.get(ApplicationRef) as ApplicationRef;

    if (moduleRef._bootstrapComponents.length > 0) {

      // 如果_bootstrapComponents有值，则遍历它里面的Component或者ComponentFactory，调用
    // @TODO：_bootstrapComponents是如何赋值的？？？待追溯
      moduleRef._bootstrapComponents.forEach(f => appRef.bootstrap(f));
    } else if (moduleRef.instance.ngDoBootstrap) {

      // 如果模块类上定义了自己的启动方法（即ngDoBootstrap方法）
      // 则传递ApplicationRef给它，让开发者自己处理启动过程
      //
      // ！！！扩展点！！！
      //
      moduleRef.instance.ngDoBootstrap(appRef);

    } else {

      // 其他情况报错
      throw new Error(
          `The module ${stringify(moduleRef.instance.constructor)} was bootstrapped, but it does not declare "@NgModule.bootstrap" components nor a "ngDoBootstrap" method. ` +
          `Please define one of these.`);
    }

    // 将moduleRef缓存起来
    this._modules.push(moduleRef);
  }

  /**
   * Register a listener to be called when the platform is disposed.
   */
  onDestroy(callback: () => void): void { this._destroyListeners.push(callback); }

  /**
   * Retrieve the platform {@link Injector}, which is the parent injector for
   * every Angular application on the page and provides singleton providers.
   */
  get injector(): Injector {
    return this._injector;
  }


  /**
   * --------------------------------------------------------------------------------
   * 销毁platform
   * --------------------------------------------------------------------------------
   * Destroy the Angular platform and all Angular applications on the page.
   */
  destroy() {

    // 如果已经被销毁，则抛错误
    if (this._destroyed) {
      throw new Error('The platform has already been destroyed!');
    }

    // 销毁所有模块
    this._modules.slice().forEach(module => module.destroy());
    
    // 销毁listeners
    this._destroyListeners.forEach(listener => listener());

    //
    this._destroyed = true;
  }

  /**
   * --------------------------------------------------------------------------------
   * 该platform是否被销毁
   * --------------------------------------------------------------------------------
   */
  get destroyed() { return this._destroyed; }
}

















function getNgZone(ngZoneOption?: NgZone | 'zone.js' | 'noop'): NgZone {
  let ngZone: NgZone;

  if (ngZoneOption === 'noop') {
    ngZone = new NoopNgZone();
  } else {
    ngZone = (ngZoneOption === 'zone.js' ? undefined : ngZoneOption) ||
        new NgZone({enableLongStackTrace: isDevMode()});
  }
  return ngZone;
}

function _callAndReportToErrorHandler(
    errorHandler: ErrorHandler, ngZone: NgZone, callback: () => any): any {
  try {
    const result = callback();
    if (isPromise(result)) {
      return result.catch((e: any) => {
        ngZone.runOutsideAngular(() => errorHandler.handleError(e));
        // rethrow as the exception handler might not do it
        throw e;
      });
    }

    return result;
  } catch (e) {
    ngZone.runOutsideAngular(() => errorHandler.handleError(e));
    // rethrow as the exception handler might not do it
    throw e;
  }
}

function optionsReducer<T extends Object>(dst: any, objs: T | T[]): T {
  if (Array.isArray(objs)) {
    dst = objs.reduce(optionsReducer, dst);
  } else {
    dst = {...dst, ...(objs as any)};
  }
  return dst;
}






/**
 * --------------------------------------------------------------------------------
 * application引用
 * 
 * --------------------------------------------------------------------------------
 * A reference to an Angular application running on a page.
 *
 * @stable
 */
@Injectable()
export class ApplicationRef {
  /** @internal */
  static _tickScope: WtfScopeFn = wtfCreateScope('ApplicationRef#tick()');
  
  /**
   * 监听启动的listeners
   */
  private _bootstrapListeners: ((compRef: ComponentRef<any>) => void)[] = [];
  
  /**
   * 视图集合
   */
  private _views: InternalViewRef[] = [];
  
  /**
   * 是否正在运行的标记
   */
  private _runningTick: boolean = false;
  
  /**
   * 强制没有新的变更
   */
  private _enforceNoNewChanges: boolean = false;
  
  /**
   * 是否稳定
   */
  private _stable = true;

  /**
   * Get a list of component types registered to this application.
   * This list is populated even before the component is created.
   * 获取注册应用中的组件类型列表，这个列表在组件创建之前就已经产生。
   */
  public readonly componentTypes: Type<any>[] = [];

  /**
   * Get a list of components registered to this application.
   * 获取应用中注册的组件列表
   */
  public readonly components: ComponentRef<any>[] = [];

  /**
   * Returns an Observable that indicates when the application is stable or unstable.
   * 返回一个Observable对象，指明应用是否处于稳定状态
   */
  public readonly isStable: Observable<boolean>;

  /** @internal */
  constructor(
      private _zone: NgZone,
      private _console: Console,
      private _injector: Injector,
      private _exceptionHandler: ErrorHandler,
      private _componentFactoryResolver: ComponentFactoryResolver,
      private _initStatus: ApplicationInitStatus
  ) {
    this._enforceNoNewChanges = isDevMode();

    // 所有的异步任务结束的时候？？？
    this._zone.onMicrotaskEmpty.subscribe({
      next: () => {
        this._zone.run(() => { this.tick(); });
      }
    });

    // isCurrentlyStable
    const isCurrentlyStable = new Observable<boolean>((observer: Observer<boolean>) => {
      this._stable = this._zone.isStable && !this._zone.hasPendingMacrotasks &&
          !this._zone.hasPendingMicrotasks;
      this._zone.runOutsideAngular(() => {
        observer.next(this._stable);
        observer.complete();
      });
    });

    // isStable
    const isStable = new Observable<boolean>((observer: Observer<boolean>) => {
      // Create the subscription to onStable outside the Angular Zone so that
      // the callback is run outside the Angular Zone.
      let stableSub: Subscription;

      this._zone.runOutsideAngular(() => {
        stableSub = this._zone.onStable.subscribe(() => {
          NgZone.assertNotInAngularZone();

          // Check whether there are no pending macro/micro tasks in the next tick
          // to allow for NgZone to update the state.
          scheduleMicroTask(() => {
            if (!this._stable && !this._zone.hasPendingMacrotasks &&
                !this._zone.hasPendingMicrotasks) {
              this._stable = true;
              observer.next(true);
            }
          });
        });
      });

      const unstableSub: Subscription = this._zone.onUnstable.subscribe(() => {
        NgZone.assertInAngularZone();
        if (this._stable) {
          this._stable = false;
          this._zone.runOutsideAngular(() => { observer.next(false); });
        }
      });

      return () => {
        stableSub.unsubscribe();
        unstableSub.unsubscribe();
      };
    });

    (this as{isStable: Observable<boolean>}).isStable =
        merge(isCurrentlyStable, share.call(isStable));
  }

  /**
   * Bootstrap a new component at the root level of the application.
   * 在应用的最顶层启动一个新的组件

   * ### Bootstrap process
   *
   * When bootstrapping a new root component into an application, Angular mounts the
   * specified application component onto DOM elements identified by the [componentType]'s
   * selector and kicks off automatic change detection to finish initializing the component.
   *
   * Optionally, a component can be mounted onto a DOM element that does not match the
   * [componentType]'s selector.
   * 
   * ### Example
   * {@example core/ts/platform/platform.ts region='longform'}
   */
  bootstrap<C>(componentOrFactory: ComponentFactory<C>|Type<C>, rootSelectorOrNode?: string|any):
      ComponentRef<C> {

    if (!this._initStatus.done) {
      throw new Error(
          'Cannot bootstrap as there are still asynchronous initializers running. Bootstrap components in the `ngDoBootstrap` method of the root module.');
    }

    // 获取组件工厂
    let componentFactory: ComponentFactory<C>;
    if (componentOrFactory instanceof ComponentFactory) {
      componentFactory = componentOrFactory;
    } else {
      componentFactory =
          this._componentFactoryResolver.resolveComponentFactory(componentOrFactory) !;
    }
    this.componentTypes.push(componentFactory.componentType);

    // 创建组件
      // Create a factory associated with the current module if it's not bound to some other
    const ngModule = componentFactory instanceof ComponentFactoryBoundToModule ?
        null :
        this._injector.get(NgModuleRef);
    const selectorOrNode = rootSelectorOrNode || componentFactory.selector;
    const compRef = componentFactory.create(Injector.NULL, [], selectorOrNode, ngModule);
    compRef.onDestroy(() => { this._unloadComponent(compRef); });

    const testability = compRef.injector.get(Testability, null);
    if (testability) {
      compRef.injector.get(TestabilityRegistry)
          .registerApplication(compRef.location.nativeElement, testability);
    }

    this._loadComponent(compRef);
    if (isDevMode()) {
      this._console.log(
          `Angular is running in the development mode. Call enableProdMode() to enable the production mode.`);
    }
    return compRef;
  }

  /**
   * Invoke this method to explicitly process change detection and its side-effects.
   * 调用这个方法去显示的处理变更检测和附加效果
   * 
   * In development mode, `tick()` also performs a second change detection cycle to ensure that no
   * further changes are detected. If additional changes are picked up during this second cycle,
   * bindings in the app have side-effects that cannot be resolved in a single change detection
   * pass.
   * 在开发模式下，tick()还执行第2次变更检查来确保没有更多的变更。在第二次变更检查中，
   * 如果有变更，则说明应用中的绑定有副作用，以至于无法在一次变更检测中完全处理。
   * 
   * In this case, Angular throws an error, since an Angular application can only have one change
   * detection pass during which all change detection must complete.
   * 在这种情况下angular会抛出一个错误，因为angualr应用只有一次变更检测，在这次变更检测中所有的变更检查都必须完成。
   */
  tick(): void {
    if (this._runningTick) {
      throw new Error('ApplicationRef.tick is called recursively');
    }

    const scope = ApplicationRef._tickScope();
    try {
      this._runningTick = true;
      this._views.forEach((view) => view.detectChanges());
      if (this._enforceNoNewChanges) {
        this._views.forEach((view) => view.checkNoChanges());
      }
    } catch (e) {
      // Attention: Don't rethrow as it could cancel subscriptions to Observables!
      this._zone.runOutsideAngular(() => this._exceptionHandler.handleError(e));
    } finally {
      this._runningTick = false;
      wtfLeave(scope);
    }
  }

  /**
   * Attaches a view so that it will be dirty checked.
   * The view will be automatically detached when it is destroyed.
   * This will throw if the view is already attached to a ViewContainer.
   * 
   * 附加一个View，以便对这个View进行脏检查
   * 这个viwe会在ApplicationRef销毁时，自动销毁。
   * 如果这个View已经被附加到ViewContainer上了，会抛出一个异常
   */
  attachView(viewRef: ViewRef): void {
    const view = (viewRef as InternalViewRef);
    this._views.push(view);
    view.attachToAppRef(this);
  }

  /**
   * Detaches a view from dirty checking again.
   * 从ApplicationRef实例上分离一个View，分离后这个View不再参与脏值检查
   */
  detachView(viewRef: ViewRef): void {
    const view = (viewRef as InternalViewRef);
    remove(this._views, view);
    view.detachFromAppRef();
  }

  /**
   * 加载组件
   * @param componentRef
   */
  private _loadComponent(componentRef: ComponentRef<any>): void {
    this.attachView(componentRef.hostView);
    this.tick();
    this.components.push(componentRef);

    // 扩展点！！！
    // APP_BOOTSTRAP_LISTENER

    // Get the listeners lazily to prevent DI cycles.
    const listeners =
        this._injector.get(APP_BOOTSTRAP_LISTENER, []).concat(this._bootstrapListeners);
    listeners.forEach((listener) => listener(componentRef));
  }

  /**
   * 卸载Component
   */
  private _unloadComponent(componentRef: ComponentRef<any>): void {
    this.detachView(componentRef.hostView);
    remove(this.components, componentRef);
  }

  /**
   * 销毁_views内的所有view
   */
  /** @internal */
  ngOnDestroy() {
    // TODO(alxhub): Dispose of the NgZone.
    this._views.slice().forEach((view) => view.destroy());
  }

  /**
   * Returns the number of attached views.
   * view的数量
   */
  get viewCount() {
    return this._views.length;
  }
}


/**
 * 从数组中移除一项
 */
function remove<T>(list: T[], el: T): void {
  const index = list.indexOf(el);
  if (index > -1) {
    list.splice(index, 1);
  }
}
