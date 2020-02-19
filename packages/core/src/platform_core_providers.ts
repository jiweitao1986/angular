/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {PlatformRef, createPlatformFactory} from './application_ref';
import {PLATFORM_ID} from './application_tokens';
import {Console} from './console';
import {Injector, StaticProvider} from './di';
import {TestabilityRegistry} from './testability/testability';

/**
 * platformCore的依赖注入配置
 */
const _CORE_PLATFORM_PROVIDERS: StaticProvider[] = [

  // PLATFORM_ID
  // Set a default platform name for platforms that don't set it explicitly.
  {provide: PLATFORM_ID, useValue: 'unknown'},

  // PlatformRef
  {provide: PlatformRef, deps: [Injector]},

  // TestabilityRegistry
  {provide: TestabilityRegistry, deps: []},

  // Console
  {provide: Console, deps: []},
];

/**
 * This platform has to be included in any other platform
 *
 * @experimental
 */
export const platformCore = createPlatformFactory(
  null,
  'core',
  _CORE_PLATFORM_PROVIDERS
);
