/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, EventEmitter, Inject, Input, OnChanges, Optional, Output, Self, SimpleChanges, forwardRef} from '@angular/core';
import {FormArray, FormControl, FormGroup} from '../../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS, Validators} from '../../validators';
import {ControlContainer} from '../control_container';
import {Form} from '../form_interface';
import {ReactiveErrors} from '../reactive_errors';
import {cleanUpControl, composeAsyncValidators, composeValidators, removeDir, setUpControl, setUpFormContainer, syncPendingControls} from '../shared';

import {FormControlName} from './form_control_name';
import {FormArrayName, FormGroupName} from './form_group_name';

/**
 * formDirectiveProvider
 */
export const formDirectiveProvider: any = {
  provide: ControlContainer,
  useExisting: forwardRef(() => FormGroupDirective)
};

/**
 * 
 * --------------------------------------------------------------------------------
 * FormGroupDirective必须是表单的根指令？？？它和Form什么关系？？？
 * 
 * FormGroupDirective一个表单中只能有一个，它和Ngform指令类似；
 * 1、TemplateForm的时候，表单根指令是一个NgForm；
 * 2、ReactiveForm的时候，表单的根指令是一个FormGroupDirective。
 * 
 * 
 * 注意：
 * 1、FormGroupDirective指令和FormGroupNameDirective并不是对应关系，两者没有太大关系；
 * 2、FormControlNameDirective和FormControlDirectvie则不是这样，他们有类似的
 * 
 * 
 * 
 * --------------------------------------------------------------------------------
 * 
 * 
 * 将一个已经存在的FormGroup绑定到DOM元素上
 * @whatItDoes Binds an existing {@link FormGroup} to a DOM element.
 *
 * @howToUse
 *
 * 这个指令接收一个已经存在的FormGroup实例。
 * 然后根据这个指令内的FormControlName、FormGroupName、FormArrayName这些子指令，
 * 去和这个FormGroup中的FormControl、FormGroup、FormArray做匹配。
 * This directive accepts an existing {@link FormGroup} instance. It will then use this
 * {@link FormGroup} instance to match any child {@link FormControl}, {@link FormGroup},
 * and {@link FormArray} instances to child {@link FormControlName}, {@link FormGroupName},
 * and {@link FormArrayName} directives.
 *
 * 
 * 
 * 
 * **Set value**: You can set the form's initial value when instantiating the
 * {@link FormGroup}, or you can set it programmatically later using the {@link FormGroup}'s
 * {@link AbstractControl#setValue setValue} or {@link AbstractControl#patchValue patchValue}
 * methods.
 *
 * 
 * 
 * 监听value：如果你想监听表单value的变化，你可以订阅FormGroup中的AbstractControl的valueChagnes事件。
 * 你也可以监听statusChanges事件，来获取验证状态的变更。
 * **Listen to value**: If you want to listen to changes in the value of the form, you can subscribe
 * to the {@link FormGroup}'s {@link AbstractControl#valueChanges valueChanges} event.  You can also
 * listen to its {@link AbstractControl#statusChanges statusChanges} event to be notified when the
 * validation status is re-calculated.
 *
 * 
 * 另外你可以通过监听这个指令的ngSubmit，来获取用户提交表单的通知。
 * 当原始的form提交事件触发时，ngSubmit事件被触发。
 * Furthermore, you can listen to the directive's `ngSubmit` event to be notified when the user has
 * triggered a form submission. The `ngSubmit` event will be emitted with the original form
 * submission event.
 *
 * ### Example
 *
 * In this example, we create form controls for first name and last name.
 *
 * {@example forms/ts/simpleFormGroup/simple_form_group_example.ts region='Component'}
 *
 * **npm package**: `@angular/forms`
 *
 * **NgModule**: {@link ReactiveFormsModule}
 *
 *  @stable
 */
@Directive({
  
  //选择器
  selector: '[formGroup]',
  
  // providers
  providers: [formDirectiveProvider],
  
  //宿主
  host: {
    '(submit)': 'onSubmit($event)',
    '(reset)': 'onReset()'
  },

  // 导出名称
  exportAs: 'ngForm'
})
export class FormGroupDirective extends ControlContainer implements Form, OnChanges {

  /**
   * 表单是否已经提交
   */
  public readonly submitted: boolean = false;

  /**
   * 
   */
  private _oldForm: FormGroup;


  /**
   * 子FormControlName集合
   */
  directives: FormControlName[] = [];

  /**
   * 输入：关联的FormGroup
   */
  @Input('formGroup') form: FormGroup = null !;


  /**
   * 输出 ngSubmit
   */
  @Output() ngSubmit = new EventEmitter();

  /**
   * 构造函数
   * @param _validators 
   * @param _asyncValidators 
   */
  constructor(
      @Optional() @Self() @Inject(NG_VALIDATORS) private _validators: any[],
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) private _asyncValidators: any[]
  ) {
    super();
  }

  
  /**
   * 输入变更处理
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    this._checkFormPresent();
    if (changes.hasOwnProperty('form')) {
      this._updateValidators();
      this._updateDomValue();
      this._updateRegistrations();
    }
  }

  /**
   * 它自己就是一个Form实例，它是和根FormGroup搭配？
   */
  get formDirective(): Form { return this; }


  /**
   * 关联的FormGroup
   */
  get control(): FormGroup {
    return this.form;
  }


  /**
   * path
   */
  get path(): string[] {
    return [];
  }


  /**
   * addControl
   * @param dir
   */
  addControl(dir: FormControlName): FormControl {

    // FormControlName对应的FormControl
    const ctrl: any = this.form.get(dir.path);

    //重要！！！ 搭建子FormGroupName和FormControl的各种订阅关系
    setUpControl(ctrl, dir);
    
    
    // 更新值和验证状态
    ctrl.updateValueAndValidity({emitEvent: false});


    // 加入到子指令集合中
    this.directives.push(dir);


    return ctrl;
  }

  /**
   * 根据FormControlName的path
   * @param dir
   */
  getControl(dir: FormControlName): FormControl {
    return <FormControl>this.form.get(dir.path);
  }

  /**
   * 从FormControlDirective集合中移除指定的指令
   * @param dir
   */
  removeControl(dir: FormControlName): void {
    removeDir<FormControlName>(this.directives, dir);
  }






  /**
   * 添加子的FormGroupName指令
   * @param dir
   */
  addFormGroup(dir: FormGroupName): void {
    const ctrl: any = this.form.get(dir.path);

    // 重要
    setUpFormContainer(ctrl, dir);

    ctrl.updateValueAndValidity({emitEvent: false});
  }

  removeFormGroup(dir: FormGroupName): void {}

  getFormGroup(dir: FormGroupName): FormGroup {
    return <FormGroup>this.form.get(dir.path);
  }





  /**
   * 添加子的FormArrayName指令
   * @param dir
   */
  addFormArray(dir: FormArrayName): void {
    const ctrl: any = this.form.get(dir.path);

    // 重要！！！
    setUpFormContainer(ctrl, dir);

    ctrl.updateValueAndValidity({emitEvent: false});
  }

  removeFormArray(dir: FormArrayName): void {}

  getFormArray(dir: FormArrayName): FormArray {
    return <FormArray>this.form.get(dir.path);
  }


  /**
   * 更新某个后代FormControl的值
   * @param dir
   * @param value 
   */
  updateModel(dir: FormControlName, value: any): void {
    const ctrl  = <FormControl>this.form.get(dir.path);
    ctrl.setValue(value);
  }

  /**
   * 响应原生表单提交事件
   * @param  
   */
  onSubmit($event: Event): boolean {

    (this as{submitted: boolean}).submitted = true;
    
    syncPendingControls(this.form, this.directives);
    
    this.ngSubmit.emit($event);
    
    return false;
  }


  /**
   * 响应原生重置表单事件
   */
  onReset(): void {
    this.resetForm();
  }

  /**
   * 重置表单
   * @param value 
   */
  resetForm(value: any = undefined): void {
    this.form.reset(value);
    (this as{submitted: boolean}).submitted = false;
  }

  /**
   * 
   */
  /** @internal */
  _updateDomValue() {
    this.directives.forEach(dir => {
      const newCtrl: any = this.form.get(dir.path);
      if (dir.control !== newCtrl) {
        cleanUpControl(dir.control, dir);
        if (newCtrl) setUpControl(newCtrl, dir);
        (dir as{control: FormControl}).control = newCtrl;
      }
    });

    this.form._updateTreeValidity({emitEvent: false});
  }

  /**
   * 更新注册
   */
  private _updateRegistrations() {
    this.form._registerOnCollectionChange(() => this._updateDomValue());
    if (this._oldForm) this._oldForm._registerOnCollectionChange(() => {});
    this._oldForm = this.form;
  }

  /**
   * 更新表单验证器
   */
  private _updateValidators() {

    //
    const sync = composeValidators(this._validators);
    this.form.validator = Validators.compose([this.form.validator !, sync !]);

    //
    const async = composeAsyncValidators(this._asyncValidators);
    this.form.asyncValidator = Validators.composeAsync([this.form.asyncValidator !, async !]);
  }

  /**
   * 检查表单是否存在
   */
  private _checkFormPresent() {
    if (!this.form) {
      ReactiveErrors.missingFormException();
    }
  }
}
