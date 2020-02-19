/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {DebugContext} from './view';

export const ERROR_TYPE = 'ngType';
export const ERROR_DEBUG_CONTEXT = 'ngDebugContext';
export const ERROR_ORIGINAL_ERROR = 'ngOriginalError';
export const ERROR_LOGGER = 'ngErrorLogger';

/**
 * 获取错误类型
 * @param error 
 */
export function getType(error: Error): Function {
  return (error as any)[ERROR_TYPE];
}

/**
 * 
 * @param error 获取调试上下文
 */
export function getDebugContext(error: Error): DebugContext {
  return (error as any)[ERROR_DEBUG_CONTEXT];
}

/**
 * 获取原始错误
 * @param error
 */
export function getOriginalError(error: Error): Error {
  return (error as any)[ERROR_ORIGINAL_ERROR];
}

/**
 * 获取错误记录器
 * @param error
 */
export function getErrorLogger(error: Error): (console: Console, ...values: any[]) => void {
  return (error as any)[ERROR_LOGGER] || defaultErrorLogger;
}

/**
 * 获取默认的错误记录器（默认在控制台输出）
 * @param console
 * @param values 
 */
function defaultErrorLogger(console: Console, ...values: any[]) {
  (<any>console.error)(...values);
}