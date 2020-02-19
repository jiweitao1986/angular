/**
*@license
*Copyright Google Inc. All Rights Reserved.
*
*Use of this source code is governed by an MIT-style license that can be
*found in the LICENSE file at https://angular.io/license
*/

import {Compiler, Injectable, Injector, NgModuleFactoryLoader, NgModuleRef, OnDestroy} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {from} from 'rxjs/observable/from';
import {of } from 'rxjs/observable/of';
import {_catch} from 'rxjs/operator/catch';
import {concatMap} from 'rxjs/operator/concatMap';
import {filter} from 'rxjs/operator/filter';
import {mergeAll} from 'rxjs/operator/mergeAll';
import {mergeMap} from 'rxjs/operator/mergeMap';
import {LoadedRouterConfig, Route, Routes} from './config';
import {Event, NavigationEnd, RouteConfigLoadEnd, RouteConfigLoadStart} from './events';
import {Router} from './router';
import {RouterConfigLoader} from './router_config_loader';

/**
 * @whatItDoes Provides a preloading strategy.
 *
 * @experimental
 */
export abstract class PreloadingStrategy {
  abstract preload(
    route: Route,
    fn: () => Observable<any>
  ): Observable<any>;
}

/**
 * @whatItDoes Provides a preloading strategy that preloads all modules as quickly as possible.
 * 提供一个预加载策略，这个策略尽可能快的预加载所有模块。
 * @howToUse
 *
 * ```
 * RouteModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * @experimental
 */
export class PreloadAllModules implements PreloadingStrategy {
  preload(
    route: Route,
    fn: () => Observable<any>
  ): Observable<any> {
    return _catch.call(fn(), () => of (null));
  }
}

/**
 * @whatItDoes Provides a preloading strategy that does not preload any modules.
 * 提供一个预加载策略，这个策略不加载任何模块
 * @description
 *
 * This strategy is enabled by default.
 * 这个策略默认被启用
 *
 * @experimental
 */
export class NoPreloading implements PreloadingStrategy {
  preload(
    route: Route,
    fn: () => Observable<any>
  ): Observable<any> { return of (null); }
}

/**
 * 预加载器主动加载所有路由配置，以便能加速导航到异步模块的速度。
 * The preloader optimistically loads all router configurations to
 * make navigations into lazily-loaded sections of the application faster.
 *
 * 预加载器在后台运行，当路由启动，瑜伽在其开始监听所有的导航事件。所有类似的事件之后，
 * 预加载会检查是否有需要懒加载的配置。
 * The preloader runs in the background. When the router bootstraps, the preloader
 * starts listening to all navigation events. After every such event, the preloader
 * will check if any configurations can be loaded lazily.
 *
 * // 如果一个路由被canLoad守卫保护，预加载器不会加载它。
 * If a route is protected by `canLoad` guards, the preloaded will not load it.
 *
 * @stable
 */
@Injectable()
export class RouterPreloader implements OnDestroy {
  
  /**
   * 预加载器
   */
  private loader: RouterConfigLoader;

  /**
   * 订阅
   */
  private subscription: Subscription;


  /**
   * 构造函数
   * @param router 
   * @param moduleLoader 
   * @param compiler 
   * @param injector 
   * @param preloadingStrategy 
   */
  constructor(
      private router: Router,
      moduleLoader: NgModuleFactoryLoader,
      compiler: Compiler,
      private injector: Injector,
      private preloadingStrategy: PreloadingStrategy
  ) {

    const onStartLoad = (r: Route) => router.triggerEvent(new RouteConfigLoadStart(r));
    const onEndLoad = (r: Route) => router.triggerEvent(new RouteConfigLoadEnd(r));

    this.loader = new RouterConfigLoader(moduleLoader, compiler, onStartLoad, onEndLoad);
  }

  /**
   * 
   */
  setUpPreloading(): void {
    const navigations$ = filter.call(
      this.router.events,
      (e: Event) => e instanceof NavigationEnd
    );
    this.subscription = concatMap.call(
      navigations$,
      () => this.preload()
    ).subscribe(() => {});
  }

  /**
   * 预加载
   */
  preload(): Observable<any> {
    const ngModule = this.injector.get(NgModuleRef);
    return this.processRoutes(ngModule, this.router.config);
  }

  // TODO(jasonaden): This class relies on code external to the class to call setUpPreloading. If
  // this hasn't been done, ngOnDestroy will fail as this.subscription will be undefined. This
  // should be refactored.
  ngOnDestroy(): void { this.subscription.unsubscribe(); }


  /**
   * 处理路由
   * @param ngModule 
   * @param routes 
   */
  private processRoutes(
    ngModule: NgModuleRef<any>, routes: Routes
  ): Observable<void> {

    const res: Observable<any>[] = [];

    for (const route of routes) {

      // we already have the config loaded, just recurse
      if (route.loadChildren && !route.canLoad && route._loadedConfig) {
        const childConfig = route._loadedConfig;
        res.push(this.processRoutes(childConfig.module, childConfig.routes));

        // no config loaded, fetch the config
      } else if (route.loadChildren && !route.canLoad) {
        res.push(this.preloadConfig(ngModule, route));

        // recurse into children
      } else if (route.children) {
        res.push(this.processRoutes(ngModule, route.children));
      }
    }

    return mergeAll.call(from(res));
  }

  /**
   * preloadConfig
   * @param ngModule 
   * @param route 
   */
  private preloadConfig(
    ngModule: NgModuleRef<any>, route: Route
  ): Observable<void> {
    return this.preloadingStrategy.preload(route, () => {
      const loaded$ = this.loader.load(ngModule.injector, route);
      return mergeMap.call(loaded$, (config: LoadedRouterConfig) => {
        route._loadedConfig = config;
        return this.processRoutes(config.module, config.routes);
      });
    });
  }
}
