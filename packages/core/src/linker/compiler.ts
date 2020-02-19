/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injectable, InjectionToken, StaticProvider} from '../di';
import {MissingTranslationStrategy} from '../i18n/tokens';
import {ViewEncapsulation} from '../metadata';
import {Type} from '../type';

import {ComponentFactory} from './component_factory';
import {NgModuleFactory} from './ng_module_factory';


/**
 * Combination of NgModuleFactory and ComponentFactorys.
 *
 * @experimental
 */
export class ModuleWithComponentFactories<T> {
  constructor(
      public ngModuleFactory: NgModuleFactory<T>,
      public componentFactories: ComponentFactory<any>[]
  ) {}
}


function _throwError() {
  throw new Error(`Runtime compiler is not loaded`);
}


/**
 * Low-level service for running the angular compiler during runtime
 * to create {@link ComponentFactory}s, which
 * can later be used to create and render a Component instance.
 *
 * Each `@NgModule` provides an own `Compiler` to its injector,
 * that will use the directives/pipes of the ng module for compilation
 * of components.
 * @stable
 */
@Injectable()
export class Compiler {
  /**
   * Compiles the given NgModule and all of its components. All templates of the components listed
   * in `entryComponents` have to be inlined.
   * 同步编译给定的NgModule和它的所有组件。entryComponents中组件的模板需要变成内联的。
   */
  compileModuleSync<T>(moduleType: Type<T>): NgModuleFactory<T> {
    throw _throwError();
  }

  /**
   * Compiles the given NgModule and all of its components
   * 异步编译给定的模块和它的所有组件
   */
  compileModuleAsync<T>(moduleType: Type<T>): Promise<NgModuleFactory<T>> {
    throw _throwError();
  }

  /**
   * Same as {@link #compileModuleSync} but also creates ComponentFactories for all components.
   * 同compileModuleSync，除此之外为模块内的所有组件创建 组件工厂
   */
  compileModuleAndAllComponentsSync<T>(moduleType: Type<T>): ModuleWithComponentFactories<T> {
    throw _throwError();
  }

  /**
   * Same as {@link #compileModuleAsync} but also creates ComponentFactories for all components.
   * 同compileModuleAsync，除此之外为模块内的所有组件创建 组件工厂
   */
  compileModuleAndAllComponentsAsync<T>(moduleType: Type<T>):
      Promise<ModuleWithComponentFactories<T>> {
    throw _throwError();
  }

  /**
   * Clears all caches.
   */
  clearCache(): void {}

  /**
   * Clears the cache for the given component/ngModule.
   */
  clearCacheFor(type: Type<any>) {}
}


/**
 * Options for creating a compiler
 * compiler创建配置选项
 *
 * @experimental
 */
export type CompilerOptions = {

  /**
   * 是否是JIT方式
   */
  useJit?: boolean,

  /**
   * 默认封装？？？
   */
  defaultEncapsulation?: ViewEncapsulation,

  /**
   * providers
   */
  providers?: StaticProvider[],

  /**
   * missingTranslation？？？
   */
  missingTranslation?: MissingTranslationStrategy,

  /**
   * 是否支持<template>标签，4.X之后，已经被<ng-template>代替
   */
  // Whether to support the `<template>` tag and the `template` attribute to define angular
  // templates. They have been deprecated in 4.x, `<ng-template>` should be used instead.
  enableLegacyTemplate?: boolean,

  /**
   * 是否保留空白符
   */
  preserveWhitespaces?: boolean,
};


/**
 * Token to provide CompilerOptions in the platform injector.
 *
 * @experimental
 */
export const COMPILER_OPTIONS = new InjectionToken<CompilerOptions[]>('compilerOptions');


/**
 * A factory for creating a Compiler
 * 编译器工厂抽象基类
 * @experimental
 */
export abstract class CompilerFactory {
  abstract createCompiler(options?: CompilerOptions[]): Compiler;
}
