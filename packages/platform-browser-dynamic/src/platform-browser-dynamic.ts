/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ResourceLoader} from '@angular/compiler';
import {CompilerFactory, PlatformRef, Provider, StaticProvider, createPlatformFactory, platformCore} from '@angular/core';

import {platformCoreDynamic} from './platform_core_dynamic';
import {INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS} from './platform_providers';
import {CachedResourceLoader} from './resource_loader/resource_loader_cache';

export * from './private_export';
export {VERSION} from './version';

/**
 * @experimental
 */
export const RESOURCE_CACHE_PROVIDER: Provider[] =
    [{provide: ResourceLoader, useClass: CachedResourceLoader, deps: []}];

/**
 * --------------------------------------------------------------------------------
 * platformBrowserDynamic是一个工厂方法，执行它返回一个platform
 * 
 * 它有3个参数：
 * 1、platformCoreDynamic
 * 2、
 * 
 * --------------------------------------------------------------------------------
 * @stable
 */
export const platformBrowserDynamic = createPlatformFactory(
    platformCoreDynamic,
    'browserDynamic',
    INTERNAL_BROWSER_DYNAMIC_PLATFORM_PROVIDERS
);
