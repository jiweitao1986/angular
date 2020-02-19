/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di/injector';
import {Type} from '../type';
import {stringify} from '../util';

import {ComponentFactory, ComponentRef} from './component_factory';
import {NgModuleRef} from './ng_module_factory';

export function noComponentFactoryError(component: Function) {
  const error = Error(
      `No component factory found for ${stringify(component)}. Did you add it to @NgModule.entryComponents?`);
  (error as any)[ERROR_COMPONENT] = component;
  return error;
}

const ERROR_COMPONENT = 'ngComponent';

export function getComponent(error: Error): Type<any> {
  return (error as any)[ERROR_COMPONENT];
}


/**
 * _NullComponentFactoryResolver
 */
class _NullComponentFactoryResolver implements ComponentFactoryResolver {
  resolveComponentFactory<T>(component: {new (...args: any[]): T}): ComponentFactory<T> {
    throw noComponentFactoryError(component);
  }
}

/**
 * @stable
 */
export abstract class ComponentFactoryResolver {

  static NULL: ComponentFactoryResolver = new _NullComponentFactoryResolver();

  abstract resolveComponentFactory<T>(component: Type<T>): ComponentFactory<T>;

}

/**
 * 
 */
export class CodegenComponentFactoryResolver implements ComponentFactoryResolver {

  /**
   * 组件工厂Map
   * {
   *  compoentType: ComponentFactory
   * }
   */
  private _factories = new Map<any, ComponentFactory<any>>();

  /**
   * 构造函数
   * @param factories 工厂数组
   * @param _parent 父Resolver
   * @param _ngModule 模块Ref
   */
  constructor(
      factories: ComponentFactory<any>[],
      private _parent: ComponentFactoryResolver,
      private _ngModule: NgModuleRef<any>
  ) {
    for (let i = 0; i < factories.length; i++) {
      const factory = factories[i];
      this._factories.set(factory.componentType, factory);
    }
  }

  /**
   * 根据组件类型获取组件工厂
   * @param component 
   */
  resolveComponentFactory<T>(component: {new (...args: any[]): T}): ComponentFactory<T> {

    // 首先从当前Resolver中查找工厂
    let factory = this._factories.get(component);

    // 找不到工厂时，查找父Resolver上查找
    if (!factory && this._parent) {
      factory = this._parent.resolveComponentFactory(component);
    }

    // 找不到抛出异常
    if (!factory) {
      throw noComponentFactoryError(component);
    }

    // 找到，则将工厂和ModuleRef绑定，并返回
    return new ComponentFactoryBoundToModule(factory, this._ngModule);
  }
}

/**
 * 绑定到某个模块的组件工厂
 */
export class ComponentFactoryBoundToModule<C> extends ComponentFactory<C> {

  /**
   * 构造函数
   * @param factory 组件工厂
   * @param ngModule 要绑定的模块Ref
   */
  constructor(
    private factory: ComponentFactory<C>,
    private ngModule: NgModuleRef<any>
  ) {
    super();
  }

  /**
   * 组件选择器
   */
  get selector() {
    return this.factory.selector;
  }

  /**
   * 组件类型
   */
  get componentType() {
    return this.factory.componentType;
  }

  /**
   * ngContentSelectors ???
   */
  get ngContentSelectors() {
    return this.factory.ngContentSelectors;
  }

  /**
   * 组件的输入
   */
  get inputs() {
    return this.factory.inputs;
  }

  /**
   * 组件的输出
   */
  get outputs() {
    return this.factory.outputs;
  }

  /**
   * 创建组件实例（ComponentRef）
   * @param injector 注入器
   * @param projectableNodes 
   * @param rootSelectorOrNode 
   * @param ngModule 如果设置该参数，则以与参数指定的NgModuleRef绑定，否则绑定构造函数中传入的。
   */
  create(
      injector: Injector,
      projectableNodes?: any[][],
      rootSelectorOrNode?: string|any,
      ngModule?: NgModuleRef<any>
  ): ComponentRef<C> {
    return this.factory.create(
        injector, projectableNodes, rootSelectorOrNode, ngModule || this.ngModule);
  }
}
