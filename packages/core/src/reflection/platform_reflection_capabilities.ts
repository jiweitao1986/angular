/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Type} from '../type';
import {GetterFn, MethodFn, SetterFn} from './types';


/**
 * PlatformReflectionCapabilities
 */
export interface PlatformReflectionCapabilities {

  /**
   * 
   */
  isReflectionEnabled(): boolean;

  /**
   * PlatformReflectionCapabilities
   */
  factory(type: Type<any>): Function;

  /**
   * hasLifecycleHook
   */
  hasLifecycleHook(type: any, lcProperty: string): boolean;

  /**
   * Return a list of annotations/types for constructor parameters
   */
  parameters(type: Type<any>): any[][];

  /**
   * Return a list of annotations declared on the class
   */
  annotations(type: Type<any>): any[];

  /**
   * Return a object literal which describes the annotations on Class fields/properties.
   */
  propMetadata(typeOrFunc: Type<any>): {[key: string]: any[]};

  /**
   * getter
   */
  getter(name: string): GetterFn;

  /**
   * setter
   */
  setter(name: string): SetterFn;

  /**
   * method
   */
  method(name: string): MethodFn;

  /**
   * importUri
   */
  importUri(type: Type<any>): string;

  /**
   * resourceUri
   */
  resourceUri(type: Type<any>): string;

  /**
   * resolveIdentifier
   */
  resolveIdentifier(
    name: string, moduleUrl: string,
    members: string[], runtime: any
  ): any;

  /**
   * resolveEnum
   */
  resolveEnum(enumIdentifier: any, name: string): any;
}
