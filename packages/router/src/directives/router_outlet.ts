/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Attribute, ChangeDetectorRef, ComponentFactoryResolver, ComponentRef, Directive, EventEmitter, Injector, OnDestroy, OnInit, Output, ViewContainerRef} from '@angular/core';

import {ChildrenOutletContexts} from '../router_outlet_context';
import {ActivatedRoute} from '../router_state';
import {PRIMARY_OUTLET} from '../shared';

/**
 * @whatItDoes Acts as a placeholder that Angular dynamically fills based on the current router
 * state.
 * router-outer是一个占位符，angular基于当前的 router state 动态填充它。
 * @howToUse
 *
 * ```
 * <router-outlet></router-outlet>
 * <router-outlet name='left'></router-outlet>
 * <router-outlet name='right'></router-outlet>
 * ```
 *
 * A router outlet will emit an activate event any time a new component is being instantiated,
 * and a deactivate event when it is being destroyed.
 * 当一个新的组件被初始化时，router outlet会发出一个activate事件；
 * 当组件被销毁时，会发出一个deactivate事件
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'></router-outlet>
 * ```
 * @ngModule RouterModule
 *
 * @stable
 */
@Directive({
  selector: 'router-outlet',
  exportAs: 'outlet'
})
export class RouterOutlet implements OnDestroy, OnInit {

  /**
   * 已经激活的组件的Ref
   */
  private activated: ComponentRef<any>|null = null;

  /**
   * 激活的路由
   */
  private _activatedRoute: ActivatedRoute|null = null;


  /**
   * 名称
   */
  private name: string;

  /**
   * activate事件
   */
  @Output('activate') activateEvents = new EventEmitter<any>();

  /**
   * deactivate事件
   */
  @Output('deactivate') deactivateEvents = new EventEmitter<any>();

  /**
   * 构造函数
   * @param parentContexts 
   * @param location 
   * @param resolver 
   * @param name 
   * @param changeDetector 
   */
  constructor(
      private parentContexts: ChildrenOutletContexts, private location: ViewContainerRef,
      private resolver: ComponentFactoryResolver, @Attribute('name') name: string,
      private changeDetector: ChangeDetectorRef) {
    this.name = name || PRIMARY_OUTLET;
    parentContexts.onChildOutletCreated(this.name, this);
  }

  /**
   * 指令销毁处理
   */
  ngOnDestroy(): void {
    this.parentContexts.onChildOutletDestroyed(this.name);
  }

  ngOnInit(): void {
    if (!this.activated) {
      // If the outlet was not instantiated at the time the route got activated we need to populate
      // the outlet when it is initialized (ie inside a NgIf)
      const context = this.parentContexts.getContext(this.name);
      if (context && context.route) {
        if (context.attachRef) {
          // `attachRef` is populated when there is an existing component to mount
          this.attach(context.attachRef, context.route);
        } else {
          // otherwise the component defined in the configuration is created
          this.activateWith(context.route, context.resolver || null);
        }
      }
    }
  }

  get isActivated(): boolean {
    return !!this.activated;
  }

  get component(): Object {
    if (!this.activated)
      throw new Error('Outlet is not activated');
    return this.activated.instance;
  }

  /**
   * 获取ActivatedRoute
   */
  get activatedRoute(): ActivatedRoute {
    if (!this.activated) throw new Error('Outlet is not activated');
    return this._activatedRoute as ActivatedRoute;
  }

  /**
   * 获取ActivateRoute的snapshot上的data属性
   */
  get activatedRouteData() {
    if (this._activatedRoute) {
      return this._activatedRoute.snapshot.data;
    }
    return {};
  }

  /**
   * Called when the `RouteReuseStrategy` instructs to detach the subtree
   * 将当前outlet对应的ViewContainerRef内的HostView移除
   */
  detach(): ComponentRef<any> {
    if (!this.activated) throw new Error('Outlet is not activated');
    this.location.detach();
    const cmp = this.activated;
    this.activated = null;
    this._activatedRoute = null;
    return cmp;
  }

  /**
   * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
   * RouteReuseStrategy重新将一个subtree渲染到outlet对应的ViewContainer里时使用该方法
   */
  attach(ref: ComponentRef<any>, activatedRoute: ActivatedRoute) {
    this.activated = ref;
    this._activatedRoute = activatedRoute;
    this.location.insert(ref.hostView);
  }

  /**
   * 销毁内部组件
   */
  deactivate(): void {
    if (this.activated) {
      const c = this.component;
      this.activated.destroy();
      this.activated = null;
      this._activatedRoute = null;
      this.deactivateEvents.emit(c);
    }
  }

  /**
   * 
   * @param activatedRoute 
   * @param resolver 
   */
  activateWith(activatedRoute: ActivatedRoute, resolver: ComponentFactoryResolver|null) {
    if (this.isActivated) {
      throw new Error('Cannot activate an already activated outlet');
    }

    // 通过ActivateRoute拿到Component
    // 使用ComponentFactoryResolver创建对应的ComponentFactory
    this._activatedRoute = activatedRoute;
    const snapshot = activatedRoute._futureSnapshot;
    const component = <any>snapshot.routeConfig !.component;
    resolver = resolver || this.resolver;
    const factory = resolver.resolveComponentFactory(component);

    // 使用ViewContainerRef创建组件，并将组件附加组件的HostView
    const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
    const injector = new OutletInjector(activatedRoute, childContexts, this.location.injector);
    this.activated = this.location.createComponent(factory, this.location.length, injector);

    // 触发变更检测，发送事件
    // Calling `markForCheck` to make sure we will run the change detection when the
    // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
    this.changeDetector.markForCheck();
    this.activateEvents.emit(this.activated.instance);
  }
}


/**
 * Outlet注入器
 */
class OutletInjector implements Injector {
  constructor(
      private route: ActivatedRoute,
      private childContexts: ChildrenOutletContexts,
      private parent: Injector
  ) {}

  get(token: any, notFoundValue?: any): any {
    if (token === ActivatedRoute) {
      return this.route;
    }

    if (token === ChildrenOutletContexts) {
      return this.childContexts;
    }

    return this.parent.get(token, notFoundValue);
  }
}
