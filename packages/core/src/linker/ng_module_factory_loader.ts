/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModuleFactory} from './ng_module_factory';

/**
 * Used to load ng module factories.
 * 模块工厂加载器
 * @stable
 */
export abstract class NgModuleFactoryLoader {

  /**
   * 加载模块工厂
   * @param path ？？？
   */
  abstract load(path: string): Promise<NgModuleFactory<any>>;
}

/**
 * 模块工厂Map
 */
let moduleFactories = new Map<string, NgModuleFactory<any>>();

/**
 * Registers a loaded module. Should only be called from generated NgModuleFactory code
 * 注册模块工厂.
 * @experimental
 */
export function registerModuleFactory(id: string, factory: NgModuleFactory<any>) {
  const existing = moduleFactories.get(id);
  if (existing) {
    throw new Error(`Duplicate module registered for ${id
                    } - ${existing.moduleType.name} vs ${factory.moduleType.name}`);
  }
  moduleFactories.set(id, factory);
}

/**
 * 清空所有模块工厂
 */
export function clearModulesForTest() {
  moduleFactories = new Map<string, NgModuleFactory<any>>();
}

/**
 * 获取模块工厂
 * Returns the NgModuleFactory with the given id, if it exists and has been loaded.
 * Factories for modules that do not specify an `id` cannot be retrieved. Throws if the module
 * cannot be found.
 * @experimental
 */
export function getModuleFactory(id: string): NgModuleFactory<any> {
  const factory = moduleFactories.get(id);
  if (!factory)
    throw new Error(`No module with ID ${id} loaded`);
  return factory;
}
