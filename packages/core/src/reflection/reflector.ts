/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Type} from '../type';
import {PlatformReflectionCapabilities} from './platform_reflection_capabilities';
import {GetterFn, MethodFn, SetterFn} from './types';

export {PlatformReflectionCapabilities} from './platform_reflection_capabilities';
export {GetterFn, MethodFn, SetterFn} from './types';

/**
 * Provides access to reflection data about symbols. Used internally by Angular
 * to power dependency injection and compilation.
 */
export class Reflector {

  /**
   * 构造函数
   * @param reflectionCapabilities 
   */
  constructor(
    public reflectionCapabilities: PlatformReflectionCapabilities
  ) {}

  /**
   * updateCapabilities
   * @param caps 
   */
  updateCapabilities(caps: PlatformReflectionCapabilities) {
    this.reflectionCapabilities = caps;
  }

  /**
   * 工厂方法
   * @param type
   */
  factory(type: Type<any>): Function {
    return this.reflectionCapabilities.factory(type);
  }

  /**
   * 参数
   * @param typeOrFunc 
   */
  parameters(typeOrFunc: Type<any>): any[][] {
    return this.reflectionCapabilities.parameters(typeOrFunc);
  }

  /**
   * 
   * @param typeOrFunc
   */
  annotations(typeOrFunc: Type<any>): any[] {
    return this.reflectionCapabilities.annotations(typeOrFunc);
  }

  /**
   * 属性元数据
   * @param typeOrFunc 
   */
  propMetadata(typeOrFunc: Type<any>): {[key: string]: any[]} {
    return this.reflectionCapabilities.propMetadata(typeOrFunc);
  }

  /**
   * 
   * @param type 
   * @param lcProperty 
   */
  hasLifecycleHook(type: any, lcProperty: string): boolean {
    return this.reflectionCapabilities.hasLifecycleHook(type, lcProperty);
  }

  /**
   * getter
   * @param name
   */
  getter(name: string): GetterFn {
    return this.reflectionCapabilities.getter(name);
  }

  /**
   * setter
   * @param name 
   */
  setter(name: string): SetterFn {
    return this.reflectionCapabilities.setter(name);
  }

  /**
   * method
   * @param name 
   */
  method(name: string): MethodFn {
    return this.reflectionCapabilities.method(name);
  }

  /**
   * importUri
   * @param type 
   */
  importUri(type: any): string {
    return this.reflectionCapabilities.importUri(type);
  }

  /**
   * importUri
   * @param type 
   */
  resourceUri(type: any): string {
    return this.reflectionCapabilities.resourceUri(type);
  }

  /**
   * resolveIdentifier
   * @param name 
   * @param moduleUrl 
   * @param members 
   * @param runtime 
   */
  resolveIdentifier(
    name: string,
    moduleUrl: string,
    members: string[],
    runtime: any
  ): any {
    return this.reflectionCapabilities.resolveIdentifier(
      name, moduleUrl, members, runtime);
  }

  /**
   * resolveEnum
   * @param identifier 
   * @param name 
   */
  resolveEnum(identifier: any, name: string): any {
    return this.reflectionCapabilities.resolveEnum(identifier, name);
  }
}
