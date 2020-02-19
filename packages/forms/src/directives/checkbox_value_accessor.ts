/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, ElementRef, Renderer2, forwardRef} from '@angular/core';

import {ControlValueAccessor, NG_VALUE_ACCESSOR} from './control_value_accessor';

export const CHECKBOX_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => CheckboxControlValueAccessor),
  multi: true,
};

/**
 * The accessor for writing a value and listening to changes on a checkbox input element.
 *
 *  ### Example
 *  ```
 *  <input type="checkbox" name="rememberLogin" ngModel>
 *  ```
 *
 *  @stable
 */
@Directive({

  //input[type=checkbox][formControlName],
  //input[type=checkbox][formControl],
  //input[type=checkbox][ngModel]
  selector:
      'input[type=checkbox][formControlName],input[type=checkbox][formControl],input[type=checkbox][ngModel]',
  host: {
    '(change)': 'onChange($event.target.checked)',
    '(blur)': 'onTouched()'
  },
  providers: [CHECKBOX_VALUE_ACCESSOR]
})
export class CheckboxControlValueAccessor implements ControlValueAccessor {

  onChange = (_: any) => {};

  onTouched = () => {};

  constructor(private _renderer: Renderer2, private _elementRef: ElementRef) {}

  /**
   * 写入值
   * @param value
   */
  writeValue(value: any): void {
    this._renderer.setProperty(this._elementRef.nativeElement, 'checked', value);
  }
  
  /**
   * 注册OnChange
   * @param fn 
   */
  registerOnChange(fn: (_: any) => {}): void { this.onChange = fn; }

  /**
   * 注册OnTouched事件回调
   * @param fn 
   */
  registerOnTouched(fn: () => {}): void { this.onTouched = fn; }

  /**
   * 设置禁用状态
   * @param isDisabled
   */
  setDisabledState(isDisabled: boolean): void {
    this._renderer.setProperty(this._elementRef.nativeElement, 'disabled', isDisabled);
  }
}
