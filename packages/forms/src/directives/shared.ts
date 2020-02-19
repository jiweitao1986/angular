/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ɵlooseIdentical as looseIdentical} from '@angular/core';
import {FormArray, FormControl, FormGroup} from '../model';
import {Validators} from '../validators';
import {AbstractControlDirective} from './abstract_control_directive';
import {AbstractFormGroupDirective} from './abstract_form_group_directive';
import {CheckboxControlValueAccessor} from './checkbox_value_accessor';
import {ControlContainer} from './control_container';
import {ControlValueAccessor} from './control_value_accessor';
import {DefaultValueAccessor} from './default_value_accessor';
import {NgControl} from './ng_control';
import {normalizeAsyncValidator, normalizeValidator} from './normalize_validator';
import {NumberValueAccessor} from './number_value_accessor';
import {RadioControlValueAccessor} from './radio_control_value_accessor';
import {RangeValueAccessor} from './range_value_accessor';
import {FormArrayName} from './reactive_directives/form_group_name';
import {SelectControlValueAccessor} from './select_control_value_accessor';
import {SelectMultipleControlValueAccessor} from './select_multiple_control_value_accessor';
import {AsyncValidator, AsyncValidatorFn, Validator, ValidatorFn} from './validators';





export function controlPath(name: string, parent: ControlContainer): string[] {
  return [...parent.path !, name];
}


















/**
 * --------------------------------------------------------------------------------
 * 建立FormControl、NgControl、ValueAccessor之间的关联相关方法
 * --------------------------------------------------------------------------------
 */


/**
 * 重要！！！！！
 * 
 * 建立FormControl、NgControl、ValueAccessor之间的关联
 *
 * @param control
 * @param dir 
 */
export function setUpControl(control: FormControl, dir: NgControl): void {

  // 判断FormControl是否为null
  if (!control) _throwError(dir, 'Cannot find control with');

  // 判断NgControl上的valueAccessor是否存在
  if (!dir.valueAccessor) _throwError(dir, 'No value accessor for form control with');


  // 在template form中，会在模板上通过指令给控件附加验证器
  // 这里是归集模板上添加的验证器，并赋给FormControl的validator、asyncValidator
  control.validator = Validators.compose([control.validator !, dir.validator]);
  control.asyncValidator = Validators.composeAsync([control.asyncValidator !, dir.asyncValidator]);

  //写入初始值
  dir.valueAccessor !.writeValue(control.value);

  //view -> model
  setUpViewChangePipeline(control, dir);

  //model -> view
  setUpModelChangePipeline(control, dir);

  //
  setUpBlurPipeline(control, dir);

  // 禁用状态相关
  if (dir.valueAccessor !.setDisabledState) {
    control.registerOnDisabledChange(
        (isDisabled: boolean) => { dir.valueAccessor !.setDisabledState !(isDisabled); });
  }

  // 表单验证相关
  // re-run validation when validator binding changes, e.g. minlength=3 -> minlength=4
  dir._rawValidators.forEach((validator: Validator | ValidatorFn) => {
    if ((<Validator>validator).registerOnValidatorChange)
      (<Validator>validator).registerOnValidatorChange !(() => control.updateValueAndValidity());
  });

  dir._rawAsyncValidators.forEach((validator: AsyncValidator | AsyncValidatorFn) => {
    if ((<Validator>validator).registerOnValidatorChange)
      (<Validator>validator).registerOnValidatorChange !(() => control.updateValueAndValidity());
  });
}




/**
 * 清理Control相关的订阅
 * @param control 
 * @param dir 
 */
export function cleanUpControl(control: FormControl, dir: NgControl) {
  dir.valueAccessor !.registerOnChange(() => _noControlError(dir));
  dir.valueAccessor !.registerOnTouched(() => _noControlError(dir));

  dir._rawValidators.forEach((validator: any) => {
    if (validator.registerOnValidatorChange) {
      validator.registerOnValidatorChange(null);
    }
  });

  dir._rawAsyncValidators.forEach((validator: any) => {
    if (validator.registerOnValidatorChange) {
      validator.registerOnValidatorChange(null);
    }
  });

  if (control) control._clearChangeFns();
}

/**
 * 当DOM Element的值发生变化后，会执行valueAccessor的registerOnChange注册的方法
 * 在这个方法中做以下处理：
 * 1、修改control的_pendingValue（值）、_pendingDirty(状态)；
 * 2、调用FormControlDirective或者FormControlName的viewToModelUpdate方法，将值写到它们对应的数据源上；
 * 3、调用FormControl的setValue方法，将值写到FormControl上，
 *    注意要传递一个emitModelToViewChange=false，这样FormContorl值变化的时候不再执行_onChange
 *     防止再次将值往 DOM Element和指令对应的数据源上回写值。
 * @param control
 * @param dir 
 */
function setUpViewChangePipeline(control: FormControl, dir: NgControl): void {

  // 注册valueAccessor的change事件处理方法
  dir.valueAccessor !.registerOnChange((newValue: any) => {

    //设置control的_pendingValue、_pendingDirty
    control._pendingValue = newValue;
    control._pendingDirty = true;

    // 如果更新时机是updateOn，则对control进行更新
    if (control.updateOn === 'change')
      updateControl(control, dir);

  });
}


/**
 * 当DOM Element的blur事件出发后，会调用valueAccessor的registerOnTouched上注册的方法，
 * 在这个方法中做以下操作：
 * @param control
 * @param dir 
 */
function setUpBlurPipeline(control: FormControl, dir: NgControl): void {

  dir.valueAccessor !.registerOnTouched(() => {

    control._pendingTouched = true;

    // 如果更新值的时机是blur，则更新control的值
    if (control.updateOn === 'blur')
      updateControl(control, dir);

    // 如果更新时机不是submit，将control设置为Touched
    if (control.updateOn !== 'submit')
      control.markAsTouched();
  });

}


/**
 * 更新控件
 * 1、通过指令回写数据源；
 * 2、将FormControl改为Dirty状态；
 * 3、通过FormControl的setValue，修改FormControl的值。
 * @param control FormContorl
 * @param dir     NgControl指令（有3实现：FormControlName、FormControlDirective、NgModel）
 */ 
function updateControl(control: FormControl, dir: NgControl): void {

  // 通过NgControl的viewToModelUpdate(),将值回写到对应的Model上
  dir.viewToModelUpdate(control._pendingValue);
  
  //设置FormControl的Dirty
  if (control._pendingDirty) control.markAsDirty();
  
  // 设置FormControl的value
  control.setValue(control._pendingValue, {emitModelToViewChange: false});
}


/**
 * 监听FormControl实例的值变化事件，值变化后做如下处理：
 * 1、通过valueAccessor将新值写到DOM element上；
 * 2、调用FormControlDirective指令的viewToModelUpdate方法，将值写到FormControlDirective绑定的数据源上
 * @param control 
 * @param dir 
 */
function setUpModelChangePipeline(control: FormControl, dir: NgControl): void {
  
  control.registerOnChange((newValue: any, emitModelEvent: boolean) => {

    // 将值通过valueAccessor写入到DOM控件上
    // control -> view
    dir.valueAccessor !.writeValue(newValue);

    // 将值写入到ngModel的Model上
    // control -> ngModel
    if (emitModelEvent) dir.viewToModelUpdate(newValue);
  });

}


/**
 * setUpFormContainer
 * @param control 
 * @param dir 
 */
export function setUpFormContainer(
    control: FormGroup | FormArray,
    dir: AbstractFormGroupDirective | FormArrayName
) {
  if (control == null) _throwError(dir, 'Cannot find control with');

  // 处理compose、composeAsync
  control.validator = Validators.compose([control.validator, dir.validator]);
  control.asyncValidator = Validators.composeAsync([control.asyncValidator, dir.asyncValidator]);
}





















/**
 * 抛出找不到FormControl的异常信息
 * @param dir
 */
function _noControlError(dir: NgControl) {
  return _throwError(dir, 'There is no FormControl instance attached to form control element with');
}

/**
 * 抛出异常信息
 * @param dir directive
 * @param message 异常消息
 */
function _throwError(dir: AbstractControlDirective, message: string): void {
  let messageEnd: string;
  if (dir.path !.length > 1) {
    messageEnd = `path: '${dir.path!.join(' -> ')}'`;
  } else if (dir.path ![0]) {
    messageEnd = `name: '${dir.path}'`;
  } else {
    messageEnd = 'unspecified name attribute';
  }
  throw new Error(`${message} ${messageEnd}`);
}



export function composeValidators(validators: Array<Validator|Function>): ValidatorFn|null {
  return validators != null ? Validators.compose(validators.map(normalizeValidator)) : null;
}

export function composeAsyncValidators(validators: Array<Validator|Function>): AsyncValidatorFn|
    null {
  return validators != null ? Validators.composeAsync(validators.map(normalizeAsyncValidator)) :
                              null;
}


/**
 * 判断model是否被更新过
 * @param changes
 * @param viewModel 
 */
export function isPropertyUpdated(changes: {[key: string]: any}, viewModel: any): boolean {

  // 判断是否包含model变更，没有说明值没有变化
  if (!changes.hasOwnProperty('model'))  return false;

  const change = changes['model'];

  // 检查是否是第一次变化，如果是返回true
  if (change.isFirstChange()) return true;
  
  //判断是否相等，looseIdentical用来让 NaN ==== NaN的判断成立
  return !looseIdentical(viewModel, change.currentValue);

}




/**
 * 内置Accessor判断
 */
const BUILTIN_ACCESSORS = [
  CheckboxControlValueAccessor,
  RangeValueAccessor,
  NumberValueAccessor,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  RadioControlValueAccessor,
];

export function isBuiltInAccessor(valueAccessor: ControlValueAccessor): boolean {
  return BUILTIN_ACCESSORS.some(a => valueAccessor.constructor === a);
}



export function syncPendingControls(form: FormGroup, directives: NgControl[]): void {
  form._syncPendingControls();
  directives.forEach(dir => {
    const control = dir.control as FormControl;
    if (control.updateOn === 'submit') {
      dir.viewToModelUpdate(control._pendingValue);
    }
  });
}

/**
 * 选择值访问器
 * @param dir
 * @param valueAccessors 
 */
// TODO: vsavkin remove it once https://github.com/angular/angular/issues/3011 is implemented
export function selectValueAccessor(
    dir: NgControl,
    valueAccessors: ControlValueAccessor[]
): ControlValueAccessor|null {

  if (!valueAccessors) return null;

  let defaultAccessor: ControlValueAccessor|undefined = undefined;

  let builtinAccessor: ControlValueAccessor|undefined = undefined;
  
  let customAccessor: ControlValueAccessor|undefined = undefined;
  
  valueAccessors.forEach((v: ControlValueAccessor) => {
  
    if (v.constructor === DefaultValueAccessor) {
      defaultAccessor = v;

    } else if (isBuiltInAccessor(v)) {
      if (builtinAccessor)
        _throwError(dir, 'More than one built-in value accessor matches form control with');
      builtinAccessor = v;

    } else {
      if (customAccessor)
        _throwError(dir, 'More than one custom value accessor matches form control with');
      customAccessor = v;
    }
  });

  // return的优先级  custom > builtin > default
  if (customAccessor) return customAccessor;
  if (builtinAccessor) return builtinAccessor;
  if (defaultAccessor) return defaultAccessor;

  _throwError(dir, 'No valid value accessor for form control with');
  return null;
}

export function removeDir<T>(list: T[], el: T): void {
  const index = list.indexOf(el);
  if (index > -1) list.splice(index, 1);
}