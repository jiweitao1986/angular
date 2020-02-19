/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {AbstractControlDirective} from './abstract_control_directive';
import {ControlContainer} from './control_container';
import {ControlValueAccessor} from './control_value_accessor';
import {AsyncValidator, AsyncValidatorFn, Validator, ValidatorFn} from './validators';

function unimplemented(): any {
  throw new Error('unimplemented');
}

/**
 * control directive的基类
 * 它绑定一个FormControl到一个DOM元素。
 * 
 * A base class that all control directive extend.
 * It binds a {@link FormControl} object to a DOM element.
 *
 * Used internally by Angular forms.
 *
 * @stable
 */
export abstract class NgControl extends AbstractControlDirective {

  /**
   * 父控件
   */
  /** @internal */
  _parent: ControlContainer|null = null;

  /**
   * 名称
   */
  name: string|null = null;

  /**
   * 值访问器
   */
  valueAccessor: ControlValueAccessor|null = null;

  /**
   * 同步验证器集合
   */
  /** @internal */
  _rawValidators: Array<Validator|ValidatorFn> = [];

  /**
   * 异步验证器集合
   */
  /** @internal */
  _rawAsyncValidators: Array<AsyncValidator|AsyncValidatorFn> = [];

  /**
   * 表单验证器
   */
  get validator(): ValidatorFn|null { return <ValidatorFn>unimplemented(); }

  /**
   * 异步表单验证器
   */
  get asyncValidator(): AsyncValidatorFn|null { return <AsyncValidatorFn>unimplemented(); }

  /**
   * 从视图回写到Model上
   * @param newValue 
   */
  abstract viewToModelUpdate(newValue: any): void;
}
