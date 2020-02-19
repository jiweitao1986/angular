/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ElementRef} from './element_ref';
import {EmbeddedViewRef} from './view_ref';


/**
 * Represents an Embedded Template that can be used to instantiate Embedded Views.
 * 代表了一个扩展的模板，可以用它来创建 Embeded View
 * 
 * You can access a `TemplateRef`, in two ways. Via a directive placed on a `<ng-template>` element
 * (or directive prefixed with `*`) and have the `TemplateRef` for this Embedded View injected into
 * the constructor of the directive using the `TemplateRef` Token. Alternatively you can query for
 * the `TemplateRef` from a Component or a Directive via {@link Query}.
 * 有两种方式访问TemplateRef
 * 1、通过<ng-template>上的一个指令，TemplateRef可以通过指令的构造函数注入；
 * 2、通过Query
 *
 * To instantiate Embedded Views based on a Template, use {@link ViewContainerRef#
 * createEmbeddedView}, which will create the View and attach it to the View Container.
 * 可以通过ViewContainerRef的createEmbededView方法创建TemplateRef对应的ViewRef，并把它附加到View Container中。
 * @stable
 */
export abstract class TemplateRef<C> {
  /**
   * The location in the View where the Embedded View logically belongs to.
   * 
   * The data-binding and injection contexts of Embedded Views created from this `TemplateRef`
   * inherit from the contexts of this location.
   *
   * Typically new Embedded Views are attached to the View Container of this location, but in
   * advanced use-cases, the View can be attached to a different container while keeping the
   * data-binding and injection context from the original location.
   *
   */
  // TODO(i): rename to anchor or location
  abstract get elementRef(): ElementRef;

  abstract createEmbeddedView(context: C): EmbeddedViewRef<C>;
  
}
