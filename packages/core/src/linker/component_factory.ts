/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectorRef} from '../change_detection/change_detection';
import {Injector} from '../di/injector';
import {Type} from '../type';

import {ElementRef} from './element_ref';
import {NgModuleRef} from './ng_module_factory';
import {ViewRef} from './view_ref';

/**
 * Represents an instance of a Component created via a {@link ComponentFactory}.
 * 表示通过ComponentFactory创建的组件实例
 * 
 * `ComponentRef` provides access to the Component Instance as well other objects related to this
 * Component Instance and allows you to destroy the Component Instance via the {@link #destroy}
 * method.
 * ComponentREf提供了访问组件实例及其他和这个组件实例相关的对象的方式，允许你通过destroy方法销毁这个组件。
 * 
 * @stable
 */
export abstract class ComponentRef<C> {

  /**
   * Location of the Host Element of this Component Instance.
   * 组件所在的宿主元素对应的ElementRef
   */
  abstract get location(): ElementRef;

  /**
   * The injector on which the component instance exists.
   * 组件的injector
   */
  abstract get injector(): Injector;

  /**
   * The instance of the Component.
   * 组件实例，注意不是CompontRef
   */
  abstract get instance(): C;

  /**
   * The {@link ViewRef} of the Host View of this Component instance.
   * 组件对应的ViewRef
   */
  abstract get hostView(): ViewRef;

  /**
   * The {@link ChangeDetectorRef} of the Component instance.
   * 变更检测Ref
   */
  abstract get changeDetectorRef(): ChangeDetectorRef;

  /**
   * The component type.
   * 组件类型
   */
  abstract get componentType(): Type<any>;

  /**
   * Destroys the component instance and all of the data structures associated with it.
   * 销毁组件实例及和它相关的所有数据结构
   */
  abstract destroy(): void;

  /**
   * Allows to register a callback that will be called when the component is destroyed.
   * 通过该方法可以注册组件销毁时的回调函数
   */
  abstract onDestroy(callback: Function): void;
}


/**
 * 组件工厂抽象基类
 * @stable
 */
export abstract class ComponentFactory<C> {

  /**
   * 组件的选择器
   */
  abstract get selector(): string;

  /**
   * 组件类型
   */
  abstract get componentType(): Type<any>;

  /**
   * 组件内所有<ng-content>元素的选择器
   * selector for all <ng-content> elements in the component.
   */
  abstract get ngContentSelectors(): string[];

  /**
   * 组件的输入属性
   * 格式如下：
   * [
   *  { propName, templateName },
   *  ...
   * ]
   * the inputs of the component.
   */
  abstract get inputs(): {propName: string, templateName: string}[];

  /**
   * 组件的输出属性
   * the outputs of the component.
   */
  abstract get outputs(): {propName: string, templateName: string}[];

  /**
   * 创建新组件
   * Creates a new component.
   */
  abstract create(
      injector: Injector,
      projectableNodes?: any[][],
      rootSelectorOrNode?: string|any,
      ngModule?: NgModuleRef<any>
  ): ComponentRef<C>;
}
