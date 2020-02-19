/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di/injector';
import {Type} from '../type';

import {ComponentFactoryResolver} from './component_factory_resolver';


/**
 * Represents an instance of an NgModule created via a {@link NgModuleFactory}.
 * 代表了NgModuleFactory创建出来的一个NgModule实例
 * 
 * `NgModuleRef` provides access to the NgModule Instance as well other objects related to this
 * NgModule Instance.
 * 
 * NgModuleRef提供了NgModule实例和与它相关的其他对象的访问方式
 * @stable
 */
export abstract class NgModuleRef<T> {
  /**
   * The injector that contains all of the providers of the NgModule.
   * 包含了NgModule上声明的所有providers的注入器
   */
  abstract get injector(): Injector;

  /**
   * The ComponentFactoryResolver to get hold of the ComponentFactories
   * declared in the `entryComponents` property of the module.
   * 
   * ComponentFactoryResolve持有了模块entryComponents属性中所有组件的组件工厂
   */
  abstract get componentFactoryResolver(): ComponentFactoryResolver;

  /**
   * The NgModule instance.
   * NgModule实例，即XXXModule类的实例
   */
  abstract get instance(): T;

  /**
   * Destroys the module instance and all of the data structures associated with it.
   * 销毁模块和它上面的数据结构
   */
  abstract destroy(): void;

  /**
   * Allows to register a callback that will be called when the module is destroyed.
   * 注册Module销毁时的回调函数
   */
  abstract onDestroy(callback: () => void): void;
}

/**
 * 内部模块实例
 */
export interface InternalNgModuleRef<T> extends NgModuleRef<T> {
  // Note: we are using the prefix _ as NgModuleData is an NgModuleRef and therefore directly
  // exposed to the user.
  _bootstrapComponents: Type<any>[];
}

/**
 * 模块工厂
 * @experimental
 */
export abstract class NgModuleFactory<T> {

  /**
   * 模块类型
   */
  abstract get moduleType(): Type<T>;

  /**
   * 创建模块
   * @param parentInjector 
   */
  abstract create(parentInjector: Injector|null): NgModuleRef<T>;
}
