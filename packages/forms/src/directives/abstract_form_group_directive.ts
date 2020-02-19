/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OnDestroy, OnInit} from '@angular/core';

import {FormGroup} from '../model';

import {ControlContainer} from './control_container';
import {Form} from './form_interface';
import {composeAsyncValidators, composeValidators, controlPath} from './shared';
import {AsyncValidatorFn, ValidatorFn} from './validators';



/**
 * 
 * 这是NgModelGroup和FormGroupName的基类
 * 
 * This is a base class for code shared between {@link NgModelGroup} and {@link FormGroupName}.
 *
 * @stable
 */
export class AbstractFormGroupDirective extends ControlContainer implements OnInit, OnDestroy {

  /**
   * 父ControlContainer
   */
  /** @internal */
  _parent: ControlContainer;

  /**
   * 同步验证器
   */
  /** @internal */
  _validators: any[];

  /**
   * 异步验证器
   */
  /** @internal */
  _asyncValidators: any[];


  /**
   * 指令初始化
   */
  ngOnInit(): void {
    this._checkParentType();
    this.formDirective !.addFormGroup(this);
  }


  /**
   * 执行销毁
   */
  ngOnDestroy(): void {
    if (this.formDirective) {
      this.formDirective.removeFormGroup(this);
    }
  }


  /**
   * Get the {@link FormGroup} backing this binding.
   */
  get control(): FormGroup {
    return this.formDirective !.getFormGroup(this);
  }


  /**
   * Get the path to this control group.
   */
  get path(): string[] {
    return controlPath(this.name, this._parent);
  }


  /**
   * Get the {@link Form} to which this group belongs.
   */
  get formDirective(): Form|null {
    return this._parent ? this._parent.formDirective : null;
  }


  /**
   * 获取归集之后的同步验证器
   */
  get validator(): ValidatorFn|null {
    return composeValidators(this._validators);
  }


  /**
   * 获取归集之后的异步验证器
   */
  get asyncValidator(): AsyncValidatorFn|null {
    return composeAsyncValidators(this._asyncValidators);
  }


  /** @internal */
  _checkParentType(): void {}
}
