/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {APP_BASE_HREF, HashLocationStrategy, LOCATION_INITIALIZED, Location, LocationStrategy, PathLocationStrategy, PlatformLocation} from '@angular/common';
import {ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, ComponentRef, Inject, Injectable, InjectionToken, Injector, ModuleWithProviders, NgModule, NgModuleFactoryLoader, NgProbeToken, Optional, Provider, SkipSelf, SystemJsNgModuleLoader} from '@angular/core';
import {ɵgetDOM as getDOM} from '@angular/platform-browser';
import {Subject} from 'rxjs/Subject';
import {of } from 'rxjs/observable/of';

import {Route, Routes} from './config';
import {RouterLink, RouterLinkWithHref} from './directives/router_link';
import {RouterLinkActive} from './directives/router_link_active';
import {RouterOutlet} from './directives/router_outlet';
import {RouteReuseStrategy} from './route_reuse_strategy';
import {ErrorHandler, Router} from './router';
import {ROUTES} from './router_config_loader';
import {ChildrenOutletContexts} from './router_outlet_context';
import {NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader} from './router_preloader';
import {ActivatedRoute} from './router_state';
import {UrlHandlingStrategy} from './url_handling_strategy';
import {DefaultUrlSerializer, UrlSerializer} from './url_tree';
import {flatten} from './utils/collection';


/**
 * 路由相关指令数组
 * @whatItDoes Contains a list of directives
 * @stable
 */
const ROUTER_DIRECTIVES = [
  RouterOutlet,
  RouterLink,
  RouterLinkWithHref,
  RouterLinkActive
];

/**
 * @whatItDoes Is used in DI to configure the router.
 * @stable
 */
export const ROUTER_CONFIGURATION =
  new InjectionToken<ExtraOptions>('ROUTER_CONFIGURATION');

/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD =
  new InjectionToken<void>('ROUTER_FORROOT_GUARD');


/**
 * ROUTER_PROVIDERS
 */
export const ROUTER_PROVIDERS: Provider[] = [
  
  // Location
  Location,
  
  // UrlSerializer
  {
    provide: UrlSerializer,
    useClass: DefaultUrlSerializer
  },

  // Router
  {
    provide: Router,
    useFactory: setupRouter,
    deps: [
      ApplicationRef, UrlSerializer, ChildrenOutletContexts,
      Location, Injector, NgModuleFactoryLoader,
      Compiler, ROUTES, ROUTER_CONFIGURATION,
      [UrlHandlingStrategy, new Optional()],
      [RouteReuseStrategy, new Optional()]
    ]
  },

  // 
  ChildrenOutletContexts,

  // 
  {
    provide: ActivatedRoute,
    useFactory: rootRoute,
    deps: [Router]
  },

  // 模块工厂加载器
  {
    provide: NgModuleFactoryLoader,
    useClass: SystemJsNgModuleLoader
  },

  // 预加载器
  RouterPreloader,

  // 预加载策略：不加载
  NoPreloading,
  
  // 预加载策略：预加载所有模块
  PreloadAllModules,
  
  // RouterConfiguration
  {
    provide: ROUTER_CONFIGURATION,
    useValue: {enableTracing: false}
  },
];



export function routerNgProbeToken() {
  return new NgProbeToken('Router', Router);
}

/**
 * 添加路由指令和providers
 * @whatItDoes Adds router directives and providers.
 *
 * @howToUse
 * RouterModule可以被导入多次
 * RouterModule can be imported multiple times: once per lazily-loaded bundle.
 * 
 * 由于路由处理一个全局共享的资源-location，不能有多个激活的路由服务。
 * Since the router deals with a global shared resource--location, we cannot have
 * more than one router service active.
 * 这就是为什么只有两种方式去创建这个模块
 * That is why there are two ways to create the module: `RouterModule.forRoot` and
 * `RouterModule.forChild`.
 *
 * forRoot创建一个模块，这个模块包含所有的指令、路由配置、路由服务本身
 * * `forRoot` creates a module that contains all the directives, the given routes, and the router
 *   service itself.
 * forChild创建一个模块，这个模块包含所有指令、给定的路由配置，但不包含路由服务
 * * `forChild` creates a module that contains all the directives and the given routes, but does not
 *   include the router service.
 *
 * When registered at the root, the module should be used as follows
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forRoot(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * For submodules and lazy loaded submodules the module should be used as follows:
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @description
 *
 * // 管理状态迁移是构建应用过程中最困难的一部分。特别对于web应用，需要确认状态被影射到URL上。
 * 另外，我们经常想去分割应用到多个块，并按需加载他们。
 * 透明执行这些处理不是简单的事情。
 * Managing state transitions is one of the hardest parts of building applications. This is
 * especially true on the web, where you also need to ensure that the state is reflected in the URL.
 * In addition, we often want to split applications into multiple bundles and load them on demand.
 * Doing this transparently is not trivial.
 *
 * // Anguar的router替我们处理了这些问题。通过使用router，你可以声明式的指定应用状态，管理状态迁移，
 * 同时处理好URL、按需加载boundles。
 * boudle如何翻译比较合适？？？
 * The Angular router solves these problems. Using the router, you can declaratively specify
 * application states, manage state transitions while taking care of the URL, and load bundles on
 * demand.
 *
 * [Read this developer guide](https://angular.io/docs/ts/latest/guide/router.html) to get an
 * overview of how the router should be used.
 *
 * @stable
 */
@NgModule({
  declarations: ROUTER_DIRECTIVES,
  exports: ROUTER_DIRECTIVES
})
export class RouterModule {
  // Note: We are injecting the Router so it gets created eagerly...
  constructor(
    @Optional() @Inject(ROUTER_FORROOT_GUARD) guard: any,
    @Optional() router: Router
  ) {}

  /**
   * 创建一个包含所有router providers的模块。它也可以建立一个应用监听器去执行初始的导航。
   * Creates a module with all the router providers and directives. It also optionally sets up an
   * application listener to perform an initial navigation.
   *
   * 选项：
   * Options (see {@link ExtraOptions}):
   * 
   * router将记录所有的内部事件到控制台
   * * `enableTracing` makes the router log all its internal events to the console.
   *
   * useHash：启用location strategy，以便使用location strategy代替history API
   * * `useHash` enables the location strategy that uses the URL fragment instead of the history
   * API.
   * 
   * 默认导航
   * * `initialNavigation` disables the initial navigation.
   * 
   * 错误处理
   * * `errorHandler` provides a custom error handler.
   * 
   * // 预加载策略
   * * `preloadingStrategy` configures a preloading strategy (see {@link PreloadAllModules}).
   * 
   * // 配置如何处理导航到和当前URL一样的URL
   * * `onSameUrlNavigation` configures how the router handles navigation to the current URL. See
   * {@link ExtraOptions} for more details.
   */
  static forRoot(
    routes: Routes, config?: ExtraOptions
  ): ModuleWithProviders {

    return {

      // 模型
      ngModule: RouterModule,

      // Providers
      providers: [

        // Router_Providers
        ROUTER_PROVIDERS,

        //
        provideRoutes(routes),

        // ROUTER_FORROOT_GUARD
        {
          provide: ROUTER_FORROOT_GUARD,
          useFactory: provideForRootGuard,
          deps: [
            [Router, new Optional(), new SkipSelf()]
          ]
        },

        {
          provide: ROUTER_CONFIGURATION,
          useValue: config ? config : {}
        },

        //location策略
        {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [
            PlatformLocation,
            [new Inject(APP_BASE_HREF), new Optional()],
            ROUTER_CONFIGURATION
          ]
        },

        // 预加载策略
        {
          provide: PreloadingStrategy,
          useExisting: config && config.preloadingStrategy
                        ? config.preloadingStrategy : NoPreloading
        },

        // NgProbeToken
        {
          provide: NgProbeToken,
          multi: true,
          useFactory: routerNgProbeToken
        },

        //
        provideRouterInitializer(),

      ],
    };
  }

  /**
   * Creates a module with all the router directives and a provider registering routes.
   */
  static forChild(routes: Routes): ModuleWithProviders {
    return {
      ngModule: RouterModule,
      providers: [
        provideRoutes(routes)
      ]};
  }
}










/**
 * 提供location策略
 * @param platformLocationStrategy
 * @param baseHref 
 * @param options 
 */
export function provideLocationStrategy(
    platformLocationStrategy: PlatformLocation,
    baseHref: string,
    options: ExtraOptions = {}
) {
  return options.useHash ?
          new HashLocationStrategy(platformLocationStrategy, baseHref) :
          new PathLocationStrategy(platformLocationStrategy, baseHref);
}



export function provideForRootGuard(router: Router): any {
  if (router) {
    throw new Error(
        `RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.`);
  }
  return 'guarded';
}



/**
 * 注册路由
 * @whatItDoes Registers routes.
 *
 * @howToUse
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @stable
 */
export function provideRoutes(routes: Routes): any {
  return [
    {provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes},
    {provide: ROUTES, multi: true, useValue: routes},
  ];
}










/**
 * 用于配置导航初始化的时机的选项
 * @whatItDoes Represents an option to configure when the initial navigation is performed.
 *
 * @description
 * 启用：在跟组件创建之前进行导航初始化。启动会被阻塞直到路由完成
 * * 'enabled' - the initial navigation starts before the root component is created.
 * The bootstrap is blocked until the initial navigation is complete.
 * 
 * 导航初始化不会被执行，location监听器在跟组件创建之前被搭建起来
 * * 'disabled' - the initial navigation is not performed. The location listener is set up before
 * the root component gets created.
 * 
 * * 'legacy_enabled'- the initial navigation starts after the root component has been created.
 * The bootstrap is not blocked until the initial navigation is complete. @deprecated
 * 
 * 
 * * 'legacy_disabled'- the initial navigation is not performed. The location listener is set up
 * after @deprecated
 * 
 * 
 * the root component gets created.
 * * `true` - same as 'legacy_enabled'. @deprecated since v4
 * * `false` - same as 'legacy_disabled'. @deprecated since v4
 *
 * 应该使用enabled，除非有某个原因要在路由开始初始化导航时做更多的控制，
 * 比如需要根据某些复杂的初始化逻辑去初始化导航。在这种场景下，才启用disabled
 * The 'enabled' option should be used for applications unless there is a reason to have
 * more control over when the router starts its initial navigation due to some complex
 * initialization logic. In this case, 'disabled' should be used.
 *
 * 在新创建的应用中不应该使用legacy_enabled、legacy_disabled。
 * The 'legacy_enabled' and 'legacy_disabled' should not be used for new applications.
 *
 * @experimental
 */
export type InitialNavigation =
    true | false | 'enabled' | 'disabled' | 'legacy_enabled' | 'legacy_disabled';












/**
 * @whatItDoes Represents options to configure the router.
 *
 * @stable
 */
export interface ExtraOptions {
  /**
   * Makes the router log all its internal events to the console.
   */
  enableTracing?: boolean;

  /**
   * Enables the location strategy that uses the URL fragment instead of the history API.
   */
  useHash?: boolean;

  /**
   * Disables the initial navigation.
   */
  initialNavigation?: InitialNavigation;

  /**
   * A custom error handler.
   */
  errorHandler?: ErrorHandler;

  /**
   * Configures a preloading strategy. See {@link PreloadAllModules}.
   */
  preloadingStrategy?: any;

  /**
   * Define what the router should do if it receives a navigation request to the current URL.
   * By default, the router will ignore this navigation. However, this prevents features such
   * as a "refresh" button. Use this option to configure the behavior when navigating to the
   * current URL. Default is 'ignore'.
   */
  onSameUrlNavigation?: 'reload'|'ignore';
}










/**
 * 搭建路由
 * @param ref Application引用
 * @param urlSerializer url序列化器
 * @param contexts ChildrenOutletContexts
 * @param location 
 * @param injector 
 * @param loader 
 * @param compiler 
 * @param config 
 * @param opts 
 * @param urlHandlingStrategy 
 * @param routeReuseStrategy 
 */
export function setupRouter(
    ref: ApplicationRef,
    urlSerializer: UrlSerializer,
    contexts: ChildrenOutletContexts,
    location: Location,
    injector: Injector,
    loader: NgModuleFactoryLoader,
    compiler: Compiler,
    config: Route[][],
    opts: ExtraOptions = {},
    urlHandlingStrategy?: UrlHandlingStrategy,
    routeReuseStrategy?: RouteReuseStrategy
) {


  // 创建Router实例
  const router = new Router(
      null, urlSerializer, contexts,
      location, injector, loader,
      compiler, flatten(config)
  );

  // url处理策略（提供一种迁移AngularJS application到Angular的方式）
  if (urlHandlingStrategy) {
    router.urlHandlingStrategy = urlHandlingStrategy;
  }

  // 提供一种定制方式，来重用激活过的路由
  if (routeReuseStrategy) {
    router.routeReuseStrategy = routeReuseStrategy;
  }

  // 错误处理配置
  if (opts.errorHandler) {
    router.errorHandler = opts.errorHandler;
  }

  // 当enableTracing开启时，router.events触发时，在控制台进行记录
  if (opts.enableTracing) {
    const dom = getDOM();
    router.events.subscribe(e => {
      dom.logGroup(`Router Event: ${(<any>e.constructor).name}`);
      dom.log(e.toString());
      dom.log(e);
      dom.logGroupEnd();
    });
  }

  // 相同url的跳转配置
  if (opts.onSameUrlNavigation) {
    router.onSameUrlNavigation = opts.onSameUrlNavigation;
  }

  return router;

}



export function rootRoute(router: Router): ActivatedRoute {
  return router.routerState.root;
}









// --------------------------------------------------------------------------------
// RouterInitializer
// --------------------------------------------------------------------------------



/**
 * To initialize the router properly we need to do in two steps:
 *
 * We need to start the navigation in a APP_INITIALIZER to block the bootstrap if
 * a resolver or a guards executes asynchronously. Second, we need to actually run
 * activation in a BOOTSTRAP_LISTENER. We utilize the afterPreactivation
 * hook provided by the router to do that.
 *
 * The router navigation starts, reaches the point when preactivation is done, and then
 * pauses. It waits for the hook to be resolved. We then resolve it only in a bootstrap listener.
 */
@Injectable()
export class RouterInitializer {

  /**
   * initNavigation
   */
  private initNavigation: boolean = false;
  
  /**
   * resultOfPreactivationDone
   */
  private resultOfPreactivationDone = new Subject<void>();

  /**
   * 构造函数
   * @param injector
   */
  constructor(private injector: Injector) {}

  /**
   * appInitializer
   */
  appInitializer(): Promise<any> {
    const p: Promise<any> = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
    return p.then(() => {

      let resolve: Function = null !;
      const res = new Promise(r => resolve = r);
      const router = this.injector.get(Router);
      const opts = this.injector.get(ROUTER_CONFIGURATION);

      if (this.isLegacyDisabled(opts) || this.isLegacyEnabled(opts)) {
        resolve(true);

      } else if (opts.initialNavigation === 'disabled') {
        router.setUpLocationChangeListener();
        resolve(true);

      } else if (opts.initialNavigation === 'enabled') {

        router.hooks.afterPreactivation = () => {

          // only the initial navigation should be delayed
          if (!this.initNavigation) {
            this.initNavigation = true;
            resolve(true);
            return this.resultOfPreactivationDone;

            // subsequent navigations should not be delayed
          } else {
            return of (null) as any;
          }
        };
        router.initialNavigation();

      } else {
        throw new Error(`Invalid initialNavigation options: '${opts.initialNavigation}'`);
      }

      return res;
    });
  }


  /**
   * bootstrapListener
   * @param bootstrappedComponentRef 
   */
  bootstrapListener(bootstrappedComponentRef: ComponentRef<any>): void {

    // 获取相关对象
    const opts = this.injector.get(ROUTER_CONFIGURATION);
    const preloader = this.injector.get(RouterPreloader);
    const router = this.injector.get(Router);
    const ref = this.injector.get(ApplicationRef);

    //
    if (bootstrappedComponentRef !== ref.components[0]) {
      return;
    }

    //
    if (this.isLegacyEnabled(opts)) {

      // 
      router.initialNavigation();
    } else if (this.isLegacyDisabled(opts)) {

      //
      router.setUpLocationChangeListener();
    }

    //
    preloader.setUpPreloading();

    //
    router.resetRootComponentType(ref.componentTypes[0]);

    //
    this.resultOfPreactivationDone.next(null !);
    this.resultOfPreactivationDone.complete();
  }


  /**
   * isLegacyEnabled
   * @param opts 
   */
  private isLegacyEnabled(opts: ExtraOptions): boolean {

    return opts.initialNavigation === 'legacy_enabled' ||
            opts.initialNavigation === true ||
            opts.initialNavigation === undefined;
  }


  /**
   * isLegacyDisabled
   * @param opts 
   */
  private isLegacyDisabled(opts: ExtraOptions): boolean {
    return opts.initialNavigation === 'legacy_disabled' ||
            opts.initialNavigation === false;
  }
}



/**
 * getAppInitializer
 * @param r 
 */
export function getAppInitializer(r: RouterInitializer) {
  return r.appInitializer.bind(r);
}


/**
 * getBootstrapListener
 * @param r 
 */
export function getBootstrapListener(r: RouterInitializer) {
  return r.bootstrapListener.bind(r);
}

/**
 * A token for the router initializer that will be called after the app is bootstrapped.
 *
 * @experimental
 */
export const ROUTER_INITIALIZER =
    new InjectionToken<(compRef: ComponentRef<any>) => void>('Router Initializer');



/**
 * provideRouterInitializer
 */
export function provideRouterInitializer() {
  return [

    // RouterInitializer
    RouterInitializer,

    // APP_INITIALIZER
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: getAppInitializer,
      deps: [RouterInitializer]
    },

    // ROUTER_INITIALIZER
    {
      provide: ROUTER_INITIALIZER,
      useFactory: getBootstrapListener,
      deps: [RouterInitializer]
    },

    // APP_BOOTSTRAP_LISTENER
    {
      provide: APP_BOOTSTRAP_LISTENER,
      multi: true,
      useExisting: ROUTER_INITIALIZER},
  ];
}
