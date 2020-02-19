/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {stringify} from '../util';
import {resolveForwardRef} from './forward_ref';


/**
 * A unique object used for retrieving items from the {@link ReflectiveInjector}.
 *
 * Keys have:
 * - a system-wide unique `id`.
 * - a `token`.
 *
 * `Key` is used internally by {@link ReflectiveInjector} because its system-wide unique `id` allows
 * the
 * injector to store created objects in a more efficient way.
 *
 * `Key` should not be created directly. {@link ReflectiveInjector} creates keys automatically when
 * resolving
 * providers.
 * @deprecated No replacement
 */
export class ReflectiveKey {

  /**
   * 显示名
   */
  public readonly displayName: string;

  /**
   * 根据token和id构造一个ReflectiveKey
   */
  constructor(public token: Object, public id: number) {
    if (!token) {
      throw new Error('Token must be defined!');
    }
    this.displayName = stringify(this.token);
  }

  /**
   * 通过一个token获取一个ReflectiveKey
   * Retrieves a `Key` for a token.
   */
  static get(token: Object): ReflectiveKey {
    return _globalKeyRegistry.get(resolveForwardRef(token));
  }

  /**
   * 获取所有注册的key数量
   * @returns the number of keys registered in the system.
   */
  static get numberOfKeys(): number {
    return _globalKeyRegistry.numberOfKeys;
  }
}











/**
 * KeyRegistry
 * @internal
 */
export class KeyRegistry {

  /**
   * 所有的keys
   */
  private _allKeys = new Map<Object, ReflectiveKey>();

  /**
   * 通过token获取ReflectiveKey
   * @param token 
   */
  get(token: Object): ReflectiveKey {

    // 如果传入的就是一个ReflectKey，直接返回
    if (token instanceof ReflectiveKey) return token;

    // 如果传入的是一个token，并且已经注册，则从allKeys中检索，并返回
    if (this._allKeys.has(token)) {
      return this._allKeys.get(token) !;
    }

    // 如果没有，则创建并返回。
    const newKey = new ReflectiveKey(token, ReflectiveKey.numberOfKeys);
    this._allKeys.set(token, newKey);

    return newKey;
  }

  /**
   * 返回
   */
  get numberOfKeys(): number {
    return this._allKeys.size;
  }
}

const _globalKeyRegistry = new KeyRegistry();
