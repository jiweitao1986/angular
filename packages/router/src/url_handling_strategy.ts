/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {UrlTree} from './url_tree';



/**
 * @whatItDoes Provides a way to migrate AngularJS applications to Angular.
 *
 * @experimental
 */
export abstract class UrlHandlingStrategy {
  /**
   * Tells the router if this URL should be processed.
   * 告诉routher是否处理当前URL
   * 
   * When it returns true, the router will execute the regular navigation.
   * 当返回true时，router会执行常规的导航。
   * When it returns false, the router will set the router state to an empty state.
   * 当返回false时，router会将router state设置为空状态
   * 
   * As a result, all the active components will be destroyed.
   * 这导致所有激活的组件被销毁
   *
   */
  abstract shouldProcessUrl(url: UrlTree): boolean;

  /**
   * Extracts the part of the URL that should be handled by the router.
   * 提取需要被router处理的部分URL
   * 
   * The rest of the URL will remain untouched.
   * 剩余的URL不会受影响
   */
  abstract extract(url: UrlTree): UrlTree;


  /**
   * Merges the URL fragment with the rest of the URL.
   * 将URL fragment合并进剩余的URL
   */
  abstract merge(newUrlPart: UrlTree, rawUrl: UrlTree): UrlTree;
}



/**
 * 默认Url处理策略
 * @experimental
 */
export class DefaultUrlHandlingStrategy implements UrlHandlingStrategy {
  
  /**
   * 是否处理URL：返回true
   * @param url 
   */
  shouldProcessUrl(url: UrlTree): boolean {
    return true;
  }
  
  /**
   * 提取UrlTree：原封不动返回
   */
  extract(url: UrlTree): UrlTree {
    return url;
  }

  /**
   * 合并UrlTree：直接返回新的树
   * @param newUrlPart
   * @param wholeUrl 
   */
  merge(newUrlPart: UrlTree, wholeUrl: UrlTree): UrlTree {
    return newUrlPart;
  }
}