/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * SetterFn
 */
export type SetterFn = (obj: any, value: any) => void;

/**
 * GetterFn
 */
export type GetterFn = (obj: any) => any;

/**
 * MethodFn
 */
export type MethodFn = (obj: any, args: any[]) => any;
