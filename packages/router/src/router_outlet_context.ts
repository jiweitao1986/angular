/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentFactoryResolver, ComponentRef} from '@angular/core';

import {RouterOutlet} from './directives/router_outlet';
import {ActivatedRoute} from './router_state';


/**
 * Store contextual information about a {@link RouterOutlet}
 * 存储RouterOutlet的上下文信息
 * 
 * @stable
 */
export class OutletContext {

  /**
   * outlet指令
   */
  outlet: RouterOutlet|null = null;

  /**
   * ActivatedRoute
   */
  route: ActivatedRoute|null = null;

  /**
   * 组件工厂处理器
   */
  resolver: ComponentFactoryResolver|null = null;

  /**
   * 子OutletContext集合
   */
  children = new ChildrenOutletContexts();

  /**
   * attachRef
   */
  attachRef: ComponentRef<any>|null = null;
}

/**
 * Store contextual information about the children (= nested) {@link RouterOutlet}
 *
 * @stable
 */
export class ChildrenOutletContexts {

  // contexts for child outlets, by name.
  private contexts = new Map<string, OutletContext>();

  /**
   * Called when a `RouterOutlet` directive is instantiated
   * RouterOutlet实例化时被调用
   */
  onChildOutletCreated(childName: string, outlet: RouterOutlet): void {
    const context = this.getOrCreateContext(childName);
    context.outlet = outlet;
    this.contexts.set(childName, context);
  }

  /**
   * Called when a `RouterOutlet` directive is destroyed.
   * 当一个RouterOutlet被销毁时调用。
   * 
   * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
   * re-created later.
   * 我们需要保持context的信息，只是把outlet设置为null。因为theoutlet可能是在一个NgIf中被销毁，可能会被重新创建。
   */
  onChildOutletDestroyed(childName: string): void {
    const context = this.getContext(childName);
    if (context) {
      context.outlet = null;
    }
  }

  /**
   * Called when the corresponding route is deactivated during navigation.
   * 当对应的route在导航的过程中失效时，调用该方法
   * 
   * Because the component get destroyed, all children outlet are destroyed.
   * 因为组件被销毁，所有的子outlet也被销毁了
   */
  onOutletDeactivated(): Map<string, OutletContext> {
    const contexts = this.contexts;
    this.contexts = new Map();
    return contexts;
  }


  /**
   * onOutletReAttached
   * @param contexts 
   */
  onOutletReAttached(contexts: Map<string, OutletContext>) {
    this.contexts = contexts;
  }

  /**
   * 根据childName获取或者创建（不存在时）OutletContext
   * @param childName 
   */
  getOrCreateContext(childName: string): OutletContext {
    let context = this.getContext(childName);

    if (!context) {
      context = new OutletContext();
      this.contexts.set(childName, context);
    }

    return context;
  }

  /**
   * 获取子OutletContext
   * @param childName 
   */
  getContext(childName: string): OutletContext|null {
    return this.contexts.get(childName) || null;
  }
}
