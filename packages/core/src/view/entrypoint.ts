/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di/injector';
import {ComponentFactory} from '../linker/component_factory';
import {NgModuleFactory, NgModuleRef} from '../linker/ng_module_factory';
import {Type} from '../type';

import {initServicesIfNeeded} from './services';
import {NgModuleDefinitionFactory, ProviderOverride, Services, ViewDefinition} from './types';
import {resolveDefinition} from './util';

export function overrideProvider(override: ProviderOverride) {
  initServicesIfNeeded();
  return Services.overrideProvider(override);
}

export function overrideComponentView(comp: Type<any>, componentFactory: ComponentFactory<any>) {
  initServicesIfNeeded();
  return Services.overrideComponentView(comp, componentFactory);
}

export function clearOverrides() {
  initServicesIfNeeded();
  return Services.clearOverrides();
}

// Attention: this function is called as top level function.
// Putting any logic in here will destroy closure tree shaking!
/**
 * 创建模块工厂（即NgModuleFactory的工厂）
 * @param ngModuleType
 * 模块类，即用NgModule注解标记的类
 * @param bootstrapComponents 
 * 模块要启动的组件，只在入口组件需要定义，如果是异步路由加过来的模块也需要定义
 * @param defFactory
 * 1、NgModuleDefinitionFactory的实现类
 * 2、在xxx.module.ngfactory.js中会生成该参数，该参数是一个function，该函数返回一个NgModuleDefinitionFactory
 * @summary
 * 如果启用aot编译，在生成的xxx.module.ngfactory.js中会使用该方法创建NgModuleFactory
 */
export function createNgModuleFactory(
    ngModuleType: Type<any>,
    bootstrapComponents: Type<any>[],
    defFactory: NgModuleDefinitionFactory
): NgModuleFactory<any> {
  return new NgModuleFactory_(ngModuleType, bootstrapComponents, defFactory);
}


/**
 * NgModuleFactory实现类
 * @summary
 * 每个NgModuleRef实例都对应一个NgModuleFactory实例
 * 
 * 模式设计：策略工厂
 */
class NgModuleFactory_ extends NgModuleFactory<any> {
  
  /**
   * 构造函数
   * @param moduleType 模块类型，例如AppModule
   * @param _bootstrapComponents 启动模块，例如AppComponent
   * @param _ngModuleDefFactory
   * ModuleDefinitionFactory，是在xxx.module.ngfactory.js中定义。
   */
  constructor(
      public readonly moduleType: Type<any>,
      private _bootstrapComponents: Type<any>[],
      private _ngModuleDefFactory: NgModuleDefinitionFactory) {
    // Attention: this ctor is called as top level function.
    // Putting any logic in here will destroy closure tree shaking!
    super();
  }

  /**
   * 创建NgModuleRef
   * @param parentInjector 父Injector
   */
  create(parentInjector: Injector|null): NgModuleRef<any> {
    initServicesIfNeeded();
    
    // 创建NgModuleDefinition实例
    const def = resolveDefinition(this._ngModuleDefFactory);

    // 创建
    return Services.createNgModuleRef(
        this.moduleType,
        parentInjector || Injector.NULL,
        this._bootstrapComponents,
        def
    );
  }
}
