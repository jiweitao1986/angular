/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, EventEmitter, Host, Inject, Input, OnChanges, OnDestroy, Optional, Output, Self, SimpleChanges, SkipSelf, forwardRef} from '@angular/core';

import {FormControl} from '../../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS} from '../../validators';
import {AbstractFormGroupDirective} from '../abstract_form_group_directive';
import {ControlContainer} from '../control_container';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '../control_value_accessor';
import {NgControl} from '../ng_control';
import {ReactiveErrors} from '../reactive_errors';
import {composeAsyncValidators, composeValidators, controlPath, isPropertyUpdated, selectValueAccessor} from '../shared';
import {AsyncValidator, AsyncValidatorFn, Validator, ValidatorFn} from '../validators';

import {FormGroupDirective} from './form_group_directive';
import {FormArrayName, FormGroupName} from './form_group_name';


/**
 * 注入项
 */
export const controlNameBinding: any = {
  provide: NgControl,
  useExisting: forwardRef(() => FormControlName)
};

/**
 * @whatItDoes  Syncs a {@link FormControl} in an existing {@link FormGroup} to a form control
 * element by name.
 * 同步FormGroup里的一个FormControl和它对应的DOM元素。
 * 
 * In other words, this directive ensures that any values written to the {@link FormControl}
 * instance programmatically will be written to the DOM element (model -> view). Conversely,
 * any values written to the DOM element through user input will be reflected in the
 * {@link FormControl} instance (view -> model).
 * 
 * 换句话说，这个指令确保任何写入FormControl实例上的值会被写到对应的DOM元素上（model-view）。
 * 相反地，任何通过用户输入写入到DOM element上的值会被同步到FormControl实例上（view->model）。
 * 
 * @howToUse
 *
 * This directive is designed to be used with a parent {@link FormGroupDirective} (selector:
 * `[formGroup]`).
 * 这个指令被设计为在一个父的[formGroup]指令下使用。
 * 
 * It accepts the string name of the {@link FormControl} instance you want to
 * link, and will look for a {@link FormControl} registered with that name in the
 * closest {@link FormGroup} or {@link FormArray} above it.
 * 它接收你想链接的FormControl实例的字符串名称
 * 并且到最靠近的FormGroup、FormArray注册的FormControl上查找对应的FormControl。
 * 
 *
 * **Access the control**: You can access the {@link FormControl} associated with
 * this directive by using the {@link AbstractControl#get get} method.
 * Ex: `this.form.get('first');`
 *
 * **Get value**: the `value` property is always synced and available on the {@link FormControl}.
 * See a full list of available properties in {@link AbstractControl}.
 *
 *  **Set value**: You can set an initial value for the control when instantiating the
 *  {@link FormControl}, or you can set it programmatically later using
 *  {@link AbstractControl#setValue setValue} or {@link AbstractControl#patchValue patchValue}.
 *
 * **Listen to value**: If you want to listen to changes in the value of the control, you can
 * subscribe to the {@link AbstractControl#valueChanges valueChanges} event.  You can also listen to
 * {@link AbstractControl#statusChanges statusChanges} to be notified when the validation status is
 * re-calculated.
 * 如果你想监听控件值的变化，你可以订阅valueChanges事件。你可也可以通过监听statusChanges事件来或者验证状态变化的通知。
 *
 * ### Example
 *
 * In this example, we create form controls for first name and last name.
 *
 * {@example forms/ts/simpleFormGroup/simple_form_group_example.ts region='Component'}
 *
 * To see `formControlName` examples with different form control types, see:
 *
 * * Radio buttons: {@link RadioControlValueAccessor}
 * * Selects: {@link SelectControlValueAccessor}
 *
 * **npm package**: `@angular/forms`
 *
 * **NgModule**: {@link ReactiveFormsModule}
 *
 *  @stable
 */
@Directive({
  selector: '[formControlName]',
  providers: [controlNameBinding]
})
export class FormControlName extends NgControl implements OnChanges, OnDestroy {

  /**
   * _added
   */
  private _added = false;
  
  /**
   * viewModel
   */
  /** @internal */
  viewModel: any;
  
  /**
   * control
   */
  readonly control: FormControl;

  /**
   * FormControl名称，通过这个名称去关联对应的FormControl
   */
  @Input('formControlName') name: string;

  // TODO(kara):  Replace ngModel with reactive API
  @Input('ngModel') model: any;


  @Output('ngModelChange') update = new EventEmitter();



  @Input('disabled')
  set isDisabled(isDisabled: boolean) {
    ReactiveErrors.disabledAttrWarning();
  }

  /**
   * 构造函数
   * @param parent 
   * @param validators 
   * @param asyncValidators 
   * @param valueAccessors 
   */
  constructor(
      @Optional() @Host() @SkipSelf() parent: ControlContainer,
      @Optional() @Self() @Inject(NG_VALIDATORS) validators: Array<Validator|ValidatorFn>,
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) asyncValidators:  Array<AsyncValidator|AsyncValidatorFn>,
      @Optional() @Self() @Inject(NG_VALUE_ACCESSOR) valueAccessors: ControlValueAccessor[]) {
    super();
    this._parent = parent;
    this._rawValidators = validators || [];
    this._rawAsyncValidators = asyncValidators || [];
    this.valueAccessor = selectValueAccessor(this, valueAccessors);
  }


  /**
   * ngOnChanges
   * @param changes 
   */
  ngOnChanges(changes: SimpleChanges) {

    // 如果当前NgControl没有添加到父指令中，先添加
    if (!this._added) this._setUpControl();

    //如果changes中包含了model的变化，并且和当前的viewModel值不一样
    if (isPropertyUpdated(changes, this.viewModel)) {
      this.viewModel = this.model;
      this.formDirective.updateModel(this, this.model);
    }
  }

  /**
   * 从父指令中移除
   */
  ngOnDestroy(): void {
    if (this.formDirective) {
      this.formDirective.removeControl(this);
    }
  }

  /**
   * View层的值变化的时候，将新值写入到viewModel，并抛出update事件
   * @param newValue 
   */
  viewToModelUpdate(newValue: any): void {
    this.viewModel = newValue;
    this.update.emit(newValue);
  }


  get path(): string[] { return controlPath(this.name, this._parent !); }


  /**
   * 获取formDirective，只支持2级？？？？
   */
  get formDirective(): any {
    return this._parent ? this._parent.formDirective : null;
  }


  /**
   * 归集同步验证器
   */
  get validator(): ValidatorFn|null {
    return composeValidators(this._rawValidators);
  }


  /**
   * 归集异步验证器
   */
  get asyncValidator(): AsyncValidatorFn {
    return composeAsyncValidators(this._rawAsyncValidators) !;
  }



  /**
   * 检查父类型
   */
  private _checkParentType(): void {
    
    if (!(this._parent instanceof FormGroupName) &&
        this._parent instanceof AbstractFormGroupDirective) {

      // 如果父指令不是FormGroupName，但是AbstractFormGroupDirective的子类报错。
      // AbstractFormGroupDirective目前有两个子类：FormGroupName、NgModelGroup。
      // 不是FormGroupName，那就是NgModelGroup了，NgModelGroup是用于Templae-Driven Form的。
      ReactiveErrors.ngModelGroupException();
    } else if (
        !(this._parent instanceof FormGroupName) && !(this._parent instanceof FormGroupDirective) &&
        !(this._parent instanceof FormArrayName)) {

      // 如果父指令不是以上三者，则报错。FormContorlName必须有一个对应FormGroup的父指令
      ReactiveErrors.controlParentException();
    }
  }



  /**
   * 将这个指令注册进父指令中
   */
  private _setUpControl() {

    this._checkParentType();

    (this as{control: FormControl}).control =
      this.formDirective.addControl(this);

    if (this.control.disabled && this.valueAccessor !.setDisabledState) {
      this.valueAccessor !.setDisabledState !(true);
    }

    this._added = true;
  }
}
