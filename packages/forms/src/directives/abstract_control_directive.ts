/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Observable} from 'rxjs/Observable';
import {AbstractControl} from '../model';
import {ValidationErrors} from './validators';

/**
 * control directive的基类
 * 只在forms module内部使用
 * 
 * 该类是对AbstractControl的一个包装，方便直接通过control directive访问control的属性和方法。
 * 
 * Base class for control directives.
 *
 * Only used internally in the forms module.
 *
 * @stable
 */
export abstract class AbstractControlDirective {



  /**
   * 
   * The {@link FormControl}, {@link FormGroup}, or {@link FormArray}
   * that backs this directive. Most properties fall through to that
   * instance.
   */
  abstract get control(): AbstractControl|null;






  /** The value of the control. */
  get value(): any { return this.control ? this.control.value : null; }

  /**
   * A control is `valid` when its `status === VALID`.
   *
   * In order to have this status, the control must have passed all its
   * validation checks.
   */
  get valid(): boolean|null { return this.control ? this.control.valid : null; }

  /**
   * A control is `invalid` when its `status === INVALID`.
   *
   * In order to have this status, the control must have failed
   * at least one of its validation checks.
   */
  get invalid(): boolean|null { return this.control ? this.control.invalid : null; }

  /**
   * A control is `pending` when its `status === PENDING`.
   *
   * In order to have this status, the control must be in the
   * middle of conducting a validation check.
   */
  get pending(): boolean|null { return this.control ? this.control.pending : null; }

  /**
   * 当一个control的status===DISABLED时，这个control是disabled的。
   * 
   * A control is `disabled` when its `status === DISABLED`.
   *
   * Disabled controls are exempt from validation checks and
   * are not included in the aggregate value of their ancestor
   * controls.
   */
  get disabled(): boolean|null { return this.control ? this.control.disabled : null; }

  /**
   * A control is `enabled` as long as its `status !== DISABLED`.
   *
   * In other words, it has a status of `VALID`, `INVALID`, or
   * `PENDING`.
   */
  get enabled(): boolean|null { return this.control ? this.control.enabled : null; }

  /**
   * Returns any errors generated by failing validation. If there
   * are no errors, it will return null.
   */
  get errors(): ValidationErrors|null { return this.control ? this.control.errors : null; }

  /**
   * 如果一个控件是pristine状态，说明增控件的值在UI层没有被用户修改过。
   * 注意：通过编程的方式改变control的value，不会改变pristine的值。
   * 
   * A control is `pristine` if the user has not yet changed
   * the value in the UI.
   *
   * Note that programmatic changes to a control's value will
   * *not* mark it dirty.
   */
  get pristine(): boolean|null { return this.control ? this.control.pristine : null; }

  /**
   * 如果一个控件是dirty状态，说明用户在UI层修改过这个控件的值
   * 注意：通过编程的方式不会改变控件的value，不会改变dirty状态。
   * A control is `dirty` if the user has changed the value
   * in the UI.
   *
   * Note that programmatic changes to a control's value will
   * *not* mark it dirty.
   */
  get dirty(): boolean|null { return this.control ? this.control.dirty : null; }

  /**
   * 如果一个控件被标记为touched状态，说明这个控件的blur事件，触发过
   * 
   * A control is marked `touched` once the user has triggered
   * a `blur` event on it.
   */
  get touched(): boolean|null { return this.control ? this.control.touched : null; }

  
  get status(): string|null { return this.control ? this.control.status : null; }

  /**
   * A control is `untouched` if the user has not yet triggered
   * a `blur` event on it.
   */
  get untouched(): boolean|null { return this.control ? this.control.untouched : null; }

  /**
   * Emits an event every time the validation status of the control
   * is re-calculated.
   */
  get statusChanges(): Observable<any>|null {
    return this.control ? this.control.statusChanges : null;
  }

  /**
   * Emits an event every time the value of the control changes, in
   * the UI or programmatically.
   */
  get valueChanges(): Observable<any>|null {
    return this.control ? this.control.valueChanges : null;
  }

  /**
   * 返回一个表示从顶层form到当前control的路径数组，数组的每一个值是对应控件的name。
   * Returns an array that represents the path from the top-level form
   * to this control. Each index is the string name of the control on
   * that level.
   */
  get path(): string[]|null { return null; }

  /**
   * 重置一个控件
   * 1、标记为pristine；
   * 2、标记为untouched；
   * 3、设置value为null。
   * Resets the form control. This means by default:
   *
   * * it is marked as `pristine`
   * * it is marked as `untouched`
   * * value is set to null
   *
   * For more information, see {@link AbstractControl}.
   */
  reset(value: any = undefined): void {
    if (this.control) this.control.reset(value);
  }

  /**
   * Returns true if the control with the given path has the error specified. Otherwise
   * returns false.
   *
   * If no path is given, it checks for the error on the present control.
   */
  hasError(errorCode: string, path?: string[]): boolean {
    return this.control ? this.control.hasError(errorCode, path) : false;
  }

  /**
   * Returns error data if the control with the given path has the error specified. Otherwise
   * returns null or undefined.
   *
   * If no path is given, it checks for the error on the present control.
   */
  getError(errorCode: string, path?: string[]): any {
    return this.control ? this.control.getError(errorCode, path) : null;
  }
}
