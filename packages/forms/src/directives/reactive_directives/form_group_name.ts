/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, Host, Inject, Input, OnDestroy, OnInit, Optional, Self, SkipSelf, forwardRef} from '@angular/core';


import {FormArray} from '../../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS} from '../../validators';
import {AbstractFormGroupDirective} from '../abstract_form_group_directive';
import {ControlContainer} from '../control_container';
import {ReactiveErrors} from '../reactive_errors';
import {composeAsyncValidators, composeValidators, controlPath} from '../shared';
import {AsyncValidatorFn, ValidatorFn} from '../validators';
import {FormGroupDirective} from './form_group_directive';











/**
 * --------------------------------------------------------------------------------
 * FormGroupName
 * --------------------------------------------------------------------------------
 */

/**
 * formGroupNameProvider
 */
export const formGroupNameProvider: any = {
  provide: ControlContainer,
  useExisting: forwardRef(() => FormGroupName)
};



/**
 * 绑定一个嵌套的FormGroup到一个DOM元素
 * @whatItDoes Syncs a nested {@link FormGroup} to a DOM element.
 *
 * @howToUse
 *
 * 这个指令必须在FormGroupDirective中使用
 * This directive can only be used with a parent {@link FormGroupDirective} (selector:
 * `[formGroup]`).
 *
 * 
 * It accepts the string name of the nested {@link FormGroup} you want to link, and
 * will look for a {@link FormGroup} registered with that name in the parent
 * {@link FormGroup} instance you passed into {@link FormGroupDirective}.
 *
 * Nested form groups can come in handy when you want to validate a sub-group of a
 * form separately from the rest or when you'd like to group the values of certain
 * controls into their own nested object.
 *
 * 
 * 
 * **Access the group**: You can access the associated {@link FormGroup} using the
 * {@link AbstractControl#get get} method. Ex: `this.form.get('name')`.
 *
 * You can also access individual controls within the group using dot syntax.
 * Ex: `this.form.get('name.first')`
 *
 * 
 * 
 * **Get the value**: the `value` property is always synced and available on the
 * {@link FormGroup}. See a full list of available properties in {@link AbstractControl}.
 *
 * 
 * 
 * 
 * **Set the value**: You can set an initial value for each child control when instantiating
 * the {@link FormGroup}, or you can set it programmatically later using
 * {@link AbstractControl#setValue setValue} or {@link AbstractControl#patchValue patchValue}.
 *
 * 
 * 
 * 
 * 
 * **Listen to value**: If you want to listen to changes in the value of the group, you can
 * subscribe to the {@link AbstractControl#valueChanges valueChanges} event.  You can also listen to
 * {@link AbstractControl#statusChanges statusChanges} to be notified when the validation status is
 * re-calculated.
 *
 * 
 * * 
 * 
 * 
 * ### Example
 *
 * {@example forms/ts/nestedFormGroup/nested_form_group_example.ts region='Component'}
 *
 * * **npm package**: `@angular/forms`
 *
 * * **NgModule**: `ReactiveFormsModule`
 *
 * @stable
 */
@Directive({
  selector: '[formGroupName]',
  providers: [formGroupNameProvider]
})
export class FormGroupName extends AbstractFormGroupDirective implements OnInit, OnDestroy {

  /**
   * 关联FormGroup的name
   */
  @Input('formGroupName') name: string;

  /**
   * 构造函数
   * @param parent 
   * @param validators 
   * @param asyncValidators 
   */
  constructor(
      @Optional() @Host() @SkipSelf() parent: ControlContainer,
      @Optional() @Self() @Inject(NG_VALIDATORS) validators: any[],
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: any[]
  ) {
    super();
    this._parent = parent;
    this._validators = validators;
    this._asyncValidators = asyncValidators;
  }

  /**
   * 检查父容器的类型
   */
  /** @internal */
  _checkParentType(): void {
    if (_hasInvalidParent(this._parent)) {
      ReactiveErrors.groupParentException();
    }
  }
}




















/**
 * --------------------------------------------------------------------------------
 * FormArrayName
 * --------------------------------------------------------------------------------
 */




 /**
 * formArrayNameProvider
 */
export const formArrayNameProvider: any = {
  provide: ControlContainer,
  useExisting: forwardRef(() => FormArrayName)
};



/**
 * 同步一个被嵌套的FormArray 到 DOM元素
 * @whatItDoes Syncs a nested {@link FormArray} to a DOM element.
 *
 * @howToUse
 *
 * 这个指令需要在一个FormGroupDirective中使用
 * This directive is designed to be used with a parent {@link FormGroupDirective} (selector:
 * `[formGroup]`).
 *
 * It accepts the string name of the nested {@link FormArray} you want to link, and
 * will look for a {@link FormArray} registered with that name in the parent
 * {@link FormGroup} instance you passed into {@link FormGroupDirective}.
 *
 * Nested form arrays can come in handy when you have a group of form controls but
 * you're not sure how many there will be. Form arrays allow you to create new
 * form controls dynamically.
 *
 * 
 * 
 * **Access the array**: You can access the associated {@link FormArray} using the
 * {@link AbstractControl#get get} method on the parent {@link FormGroup}.
 * Ex: `this.form.get('cities')`.
 *
 * 
 * 
 * 
 * **Get the value**: the `value` property is always synced and available on the
 * {@link FormArray}. See a full list of available properties in {@link AbstractControl}.
 *
 * 
 * 
 * 
 * **Set the value**: You can set an initial value for each child control when instantiating
 * the {@link FormArray}, or you can set the value programmatically later using the
 * {@link FormArray}'s {@link AbstractControl#setValue setValue} or
 * {@link AbstractControl#patchValue patchValue} methods.
 *
 * 
 * 
 * 
 * **Listen to value**: If you want to listen to changes in the value of the array, you can
 * subscribe to the {@link FormArray}'s {@link AbstractControl#valueChanges valueChanges} event.
 * You can also listen to its {@link AbstractControl#statusChanges statusChanges} event to be
 * notified when the validation status is re-calculated.
 *
 * 
 * 
 * 
 * **Add new controls**: You can add new controls to the {@link FormArray} dynamically by calling
 * its {@link FormArray#push push} method.
 * Ex: `this.form.get('cities').push(new FormControl());`
 *
 * 
 * 
 * 
 * ### Example
 *
 * {@example forms/ts/nestedFormArray/nested_form_array_example.ts region='Component'}
 *
 * * **npm package**: `@angular/forms`
 *
 * * **NgModule**: `ReactiveFormsModule`
 *
 * @stable
 */
@Directive({
  selector: '[formArrayName]',
  providers: [formArrayNameProvider]
})
export class FormArrayName extends ControlContainer implements OnInit, OnDestroy {


  /**
   * 父指令：通过构造函数注入
   */
  /** @internal */
  _parent: ControlContainer;


  /**
   * 静态验证器集合：通过构造函数注入
   */
  /** @internal */
  _validators: any[];


  /**
   * 动态验证器集合：通过构造函数注入
   */
  /** @internal */
  _asyncValidators: any[];


  /**
   * name
   */
  @Input('formArrayName') name: string;


  /**
   * 构造函数
   * @param parent 父指令
   * @param validators 同步验证器集合
   * @param asyncValidators 异步验证器集合
   */
  constructor(
      @Optional() @Host() @SkipSelf() parent: ControlContainer,
      @Optional() @Self() @Inject(NG_VALIDATORS) validators: any[],
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: any[]
  ) {

    super();
    this._parent = parent;
    this._validators = validators;
    this._asyncValidators = asyncValidators;
  }

  /**
   * 指令初始化时添加到父指令中
   */
  ngOnInit(): void {

    // 判断父指令：必须是FormGroupDirective、FormGroupName、FormArrayName之一
    this._checkParentType();

    //将当前的FormArrayDirective指令添加到父指令中
    this.formDirective !.addFormArray(this);
  }

  /**
   * 指令销毁时从父指令中移除
   */
  ngOnDestroy(): void {
    if (this.formDirective) {
      this.formDirective.removeFormArray(this);
    }
  }




  /**
   * 与这个指令关联的FormArray
   */
  get control(): FormArray { return this.formDirective !.getFormArray(this); }


  /**
   * 父指令，FormGroupDirective
   */
  get formDirective(): FormGroupDirective|null {
    return this._parent ? <FormGroupDirective>this._parent.formDirective : null;
  }

  /**
   * 获取path路径
   */
  get path(): string[] {
    return controlPath(this.name, this._parent);
  }

  /**
   * 归集同步验证器
   */
  get validator(): ValidatorFn|null {
    return composeValidators(this._validators);
  }

  /**
   * 归集异步验证器
   */
  get asyncValidator(): AsyncValidatorFn|null {
    return composeAsyncValidators(this._asyncValidators);
  }



  /**
   * 检查父指令类型
   * 必须是FormGroupDirective、FormGroupName、FormArrayName之一，否则抛出异常
   */
  private _checkParentType(): void {
    if (_hasInvalidParent(this._parent)) {
      ReactiveErrors.arrayParentException();
    }
  }

}

/**
 * 检查如容器类型：父指令必须是以下三种之一，否则不合法。
 * @param parent 
 */
function _hasInvalidParent(parent: ControlContainer): boolean {
  return !(parent instanceof FormGroupName) &&
         !(parent instanceof FormGroupDirective) &&
         !(parent instanceof FormArrayName);
}
