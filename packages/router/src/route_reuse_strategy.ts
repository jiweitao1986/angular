/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentRef} from '@angular/core';

import {OutletContext} from './router_outlet_context';
import {ActivatedRoute, ActivatedRouteSnapshot} from './router_state';
import {TreeNode} from './utils/tree';










/**
 * @whatItDoes Represents the detached route tree.
 *
 * This is an opaque value the router will give to a custom route reuse strategy
 * to store and retrieve later on.
 *
 * @experimental
 */
export type DetachedRouteHandle = {};










/**
 * @internal
 * 
 * 
 */
export type DetachedRouteHandleInternal = {

  contexts: Map<string, OutletContext>,
  
  componentRef: ComponentRef<any>,
  
  route: TreeNode<ActivatedRoute>,
};











/**
 * 
 * 提供一种自定义已经激活的路由如何重用的方式
 * @whatItDoes Provides a way to customize when activated routes get reused.
 *
 * @experimental
 */
export abstract class RouteReuseStrategy {

  /**
   * 决定是否应该分离一个路由及其子路由树以便被重用。
   * Determines if this route (and its subtree) should be detached to be reused later
   */
  abstract shouldDetach(route: ActivatedRouteSnapshot): boolean;

  /**
   * Stores the detached route.
   * 存储被分离的路由
   * Storing a `null` value should erase the previously stored value.
   * 存储一个null用来清楚之前的存储
   */
  abstract store(
    route: ActivatedRouteSnapshot,
    handle: DetachedRouteHandle|null
  ): void;

  /**
   * Determines if this route (and its subtree) should be reattached
   * 决定route是否应该被重新附加
   */
  abstract shouldAttach(route: ActivatedRouteSnapshot): boolean;

  /**
   * Retrieves the previously stored route
   * 获取之前被存储的路由
   */
  abstract retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle|null;

  /**
   * Determines if a route should be reused
   * 决定一个route是否被重用
   */
  abstract shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot
  ): boolean;
}










/**
 * Does not detach any subtrees. Reuses routes as long as their route config is the same.
 */
export class DefaultRouteReuseStrategy implements RouteReuseStrategy {

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  store(
    route: ActivatedRouteSnapshot,
    detachedTree: DetachedRouteHandle
  ): void {
  }

  shouldAttach(
    route: ActivatedRouteSnapshot
  ): boolean {
    return false;
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle|null {
    return null;
  }

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
