/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {COMPILER_OPTIONS, CompilerFactory, PlatformRef, StaticProvider, createPlatformFactory, platformCore} from '@angular/core';
import {JitCompilerFactory} from './compiler_factory';

/**
 * A platform that included corePlatform and the compiler.
 * 一个包含corePlatform和compiler的platform工厂
 * @experimental
 */
export const platformCoreDynamic = createPlatformFactory(

  // 父工厂
  platformCore,

  // 名称
  'coreDynamic',

  // 注入配置！！！
  // 注意：JitCompilerFactory是这个时候传递进去的
  [
    { provide: COMPILER_OPTIONS, useValue: {}, multi: true },
    { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
  ]
);
