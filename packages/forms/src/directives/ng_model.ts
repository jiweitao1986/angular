/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Directive, EventEmitter, Host, Inject, Input,
  OnChanges, OnDestroy, Optional, Output, Self, SimpleChanges, forwardRef
} from '@angular/core';

import {FormControl, FormHooks} from '../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS} from '../validators';

import {AbstractFormGroupDirective} from './abstract_form_group_directive';
import {ControlContainer} from './control_container';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from './control_value_accessor';
import {NgControl} from './ng_control';
import {NgForm} from './ng_form';
import {NgModelGroup} from './ng_model_group';
import {
  composeAsyncValidators, composeValidators, controlPath,
  isPropertyUpdated, selectValueAccessor, setUpControl
} from './shared';
import {TemplateDrivenErrors} from './template_driven_errors';
import {AsyncValidator, AsyncValidatorFn, Validator, ValidatorFn} from './validators';


export const formControlBinding: any = {
  provide: NgControl,
  useExisting: forwardRef(() => NgModel)
};





/**
 * 当ngModel的输入变化时，ngModel强制进行一次额外的变更检测
 * 
 * `ngModel` forces an additional change detection run when its inputs change:
 * E.g.:
 * ```
 * <div>{{myModel.valid}}</div>
 * <input [(ngModel)]="myValue" #myModel="ngModel">
 * ```
 * 
 * 也就是说，ngModel可以在宿主元素上导出它本身，这样就可以在模板的其他地方使用。
 * 
 * I.e. `ngModel` can export itself on the element and then be used in the template.
 * Normally, this would result in expressions before the `input` that use the exported directive
 * to have and old value as they have been dirty checked before.
 * As this is a very common case for `ngModel`, we added this second change detection run.
 *
 * Notes:
 * - this is just one extra run no matter how many `ngModel` have been changed.
 * - this is a general problem when using `exportAs` for directives!
 */
const resolvedPromise = Promise.resolve(null);





/**
 * 为领域模型创建FormControl实例，并将FormControl绑定到表单元素上。
 * @whatItDoes Creates a {@link FormControl} instance from a domain model and binds it
 * to a form control element.
 *
 * FormControl实例会跟踪 输入控件 的值、用户交互、验证状态，并且保持视图和模型同步。
 * 如果和一个父表单一起使用，如果这个指令在一个父form中使用，会将资金注册进父表单，作为父表单的一个子控件。
 * The {@link FormControl} instance will track the value, user interaction, and
 * validation status of the control and keep the view synced with the model. If used
 * within a parent form, the directive will also register itself with the form as a child
 * control.
 *
 * @howToUse
 * 
 * 这个指令可以单独使用，也可以作为一个大表单的一部分。唯一需要就是用一个ngModel的选择器去激活它。
 * This directive can be used by itself or as part of a larger form. All you need is the
 * `ngModel` selector to activate it.
 *
 * 它接受一个域模型做为输入。如果你通过[]语法使用单向数据绑定，改变组件中域模型的值时界面也会同步更新。
 * 如果你通过[()]语法使用双向数据绑定，当UI层的值发生变化时，会同步回域模型。
 * It accepts a domain model as an optional {@link Input}. If you have a one-way binding
 * to `ngModel` with `[]` syntax, changing the value of the domain model in the component
 * class will set the value in the view. If you have a two-way binding with `[()]` syntax
 * (also known as 'banana-box syntax'), the value in the UI will always be synced back to
 * the domain model in your class as well.
 *
 * 如果你想去检查和NgModel指令关联的FormControl的属性（比如验证状态），
 * 你也能通过ngModel导出这个指令的实例到一个本地模板变量中（例如：`#myVar="ngModel"`）.
 * 你可以通过control属性访问关联的FormControl对象，但是你需要的大多数属性（FormControl上的，比如valid、dirty）
 * 可以通过NgModel指令上的属性影射过去（影射的属性在AbstractControlDirective上定义）
 * If you wish to inspect the properties of the associated {@link FormControl} (like
 * validity state), you can also export the directive into a local template variable using
 * `ngModel` as the key (ex: `#myVar="ngModel"`). You can then access the control using the
 * directive's `control` property, but most properties you'll need (like `valid` and `dirty`)
 * will fall through to the control anyway, so you can access them directly. You can see a
 * full list of properties directly available in {@link AbstractControlDirective}.
 *
 * 下面是一个使用ngModel的独立控件的例子。
 * The following is an example of a simple standalone control using `ngModel`:
 *
 * {@example forms/ts/simpleNgModel/simple_ng_model_example.ts region='Component'}
 *
 * // 当在一个<form>标签中使用ngModel时，你需要给ngModel对应的输入控件提供给一个name属性值，
 * 这样这个control可以使用这个名字，被注册到form上。
 * When using the `ngModel` within `<form>` tags, you'll also need to supply a `name` attribute
 * so that the control can be registered with the parent form under that name.
 *
 * 
 * 值得注意的是：在form
 * 
 * It's worth noting that in the context of a parent form, you often can skip one-way or
 * two-way binding because the parent form will sync the value for you. You can access
 * its properties by exporting it into a local template variable using `ngForm` (ex:
 * `#f="ngForm"`). Then you can pass it where it needs to go on submit.
 *
 * // 
 * If you do need to populate initial values into your form, using a one-way binding for
 * `ngModel` tends to be sufficient as long as you use the exported form's value rather
 * than the domain model's value on submit.
 *
 * Take a look at an example of using `ngModel` within a form:
 *
 * {@example forms/ts/simpleForm/simple_form_example.ts region='Component'}
 *
 * To see `ngModel` examples with different form control types, see:
 *
 * * Radio buttons: {@link RadioControlValueAccessor}
 * * Selects: {@link SelectControlValueAccessor}
 *
 * **npm package**: `@angular/forms`
 *
 * **NgModule**: `FormsModule`
 *
 *  @stable
 */
@Directive({

  // 选择器
  // 带[ngModel]但不带formControlName 和 formControl
  selector: '[ngModel]:not([formControlName]):not([formControl])',
  providers: [formControlBinding],
  exportAs: 'ngModel'
})
export class NgModel extends NgControl implements OnChanges, OnDestroy {
 
  /**
   * FormControl
   */
  public readonly control: FormControl = new FormControl();

  /**
   * _registered
   */
  /** @internal */
  _registered = false;

  /**
   * viewModel
   */
  viewModel: any;

  /**
   * 控件name
   */
  @Input() name: string;

  /**
   * disable
   */
  @Input('disabled') isDisabled: boolean;

  /**
   * model
   * 啥时候给它赋值？？？？
   */
  @Input('ngModel') model: any;

  /**
   * ngModel指令实例的配置对象。你可以配置一下属性：
   * Options object for this `ngModel` instance. You can configure the following properties:
   * 
   * 
   * name属性：输入控件name属性的替换。有时候，特别是自定义的表单组件，name属性可能有其他用途。
   * 在这些情况下，你可以通过这个选项配置ngModel的name
   * **name**: An alternative to setting the name attribute on the form control element.
   * Sometimes, especially with custom form components, the name attribute might be used
   * as an `@Input` property for a different purpose. In cases like these, you can configure
   * the `ngModel` name through this option.
   *
   * ```html
   * <form>
   *   <my-person-control name="Nancy" ngModel [ngModelOptions]="{name: 'user'}">
   *   </my-person-control>
   * </form>
   * <!-- form value: {user: ''} -->
   * ```
   *
   * 
   * standalone属性：默认是false。如果设置为true，NgModel不会讲它自己注册进NgForm，他的行为就好像它不是NgForm的一部分一样。
   * 在某些场景下这非常有用，比如一些输入控件嵌套在form标签中，这些控件仅仅是用来展示，并不包含表单数据。
   * 比如 “同意注册协议”前边的复选框。
   * **standalone**: Defaults to false. If this is set to true, the `ngModel` will not
   * register itself with its parent form, and will act as if it's not in the form. This
   * can be handy if you have form meta-controls, a.k.a. form elements nested in
   * the `<form>` tag that control the display of the form, but don't contain form data.
   *
   * ```html
   * <form>
   *   <input name="login" ngModel placeholder="Login">
   *   <input type="checkbox" ngModel [ngModelOptions]="{standalone: true}"> Show more options?
   * </form>
   * <!-- form value: {login: ''} -->
   * ```
   *
   * 
   * updateOn属性：默认是change。定义form control更新值、执行验证的时机。候选项还有 blur、submit。
   * **updateOn**: Defaults to `'change'`. Defines the event upon which the form control
   * value and validity will update. Also accepts `'blur'` and `'submit'`.
   *
   * ```html
   * <input [(ngModel)]="firstName" [ngModelOptions]="{updateOn: 'blur'}">
   * ```
   *
   * 
   * 
   */
  @Input('ngModelOptions') options: {name?: string, standalone?: boolean, updateOn?: FormHooks};


  /**
   * 
   * update
   */
  @Output('ngModelChange') update = new EventEmitter();

  /**
   * 构造函数
   * @param parent 父容器指令
   * @param validators 同步验证器集合
   * @param asyncValidators 异步验证器集合 
   * @param valueAccessors 值访问器集合
   */
  constructor(
    @Optional() @Host() parent: ControlContainer,
    @Optional() @Self() @Inject(NG_VALIDATORS) validators: Array<Validator|ValidatorFn>,
    @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: Array<AsyncValidator|AsyncValidatorFn>,
    @Optional() @Self() @Inject(NG_VALUE_ACCESSOR)
    valueAccessors: ControlValueAccessor[]
  ) {
    super();
    this._parent = parent;
    this._rawValidators = validators || [];
    this._rawAsyncValidators = asyncValidators || [];

    // 选择valueAccessor，选择的顺序
    this.valueAccessor = selectValueAccessor(this, valueAccessors);
  }

















  /**
   * 重要 ！！！！！！！！！！
   * 
   * 当Input上绑定的值发生变化后，将变化同步到控件上去
   * 
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges) {

    // 检查错误
    this._checkForErrors();


    /**
     * 重要 ！！！！！！！！！！
     * 检查该控件是否被注册过
     */
    if (!this._registered) {

      // 指令的Input属性发生变化后，如果还没有被注册进NgForm，则_setUpControl建立各种关联关系。
      this._setUpControl();
    }





    // 检查isDisabled是否改变
    if ('isDisabled' in changes) {
      this._updateDisabled(changes);
    }

    // 判断model是否变化
    // 如果最新的model和viewMode不一致，则执行以下操作：
    // 更新viewModel
    if (isPropertyUpdated(changes, this.viewModel)) {
      this._updateValue(this.model);
      this.viewModel = this.model;
    }

  }
























  /**
   * 实现OnDestroy接口
   */
  ngOnDestroy(): void {
    this.formDirective && this.formDirective.removeControl(this);
  }

  /**
   * 获取路径
   */
  get path(): string[] {
    return this._parent ? controlPath(this.name, this._parent) : [this.name];
  }

  /**
   * 获取所属表单
   */
  get formDirective(): any { return this._parent ? this._parent.formDirective : null; }

  /**
   * 同步validator
   */
  get validator(): ValidatorFn|null {
    return composeValidators(this._rawValidators);
  }

  /**
   * 异步validator
   */
  get asyncValidator(): AsyncValidatorFn|null {
    return composeAsyncValidators(this._rawAsyncValidators);
  }














  /**
   * 重要 ！！！！！！！！！！
   * 
   * 将界面上的值更新到ViewModel上，并触发update事件
   * update事件谁会监听？？？
   * @param newValue 
   */
  viewToModelUpdate(newValue: any): void {
    this.viewModel = newValue;
    this.update.emit(newValue);
  }

















  /**
   * _setUpControl
   * 
   */
  private _setUpControl(): void {

    // 设置view向FormControl更新值的时机，默认是change
    this._setUpdateStrategy();

    //1、如果是standalone，则由控件自己来初始化；
    //2、如果不是，则添加到表单指令，addControl方法中对该control进行set up操作
    this._isStandalone() ?
      this._setUpStandalone() :
      this.formDirective.addControl(this);


    //标记该控件已被注册
    this._registered = true;

  }

  /**
   * _setUpdateStrategy
   */
  private _setUpdateStrategy(): void {
    if (this.options && this.options.updateOn != null) {
      this.control._updateOn = this.options.updateOn;
    }
  }

  /**
   * 判断这个控件是不是独立的
   */
  private _isStandalone(): boolean {
    return !this._parent || !!(this.options && this.options.standalone);
  }

  /**
   * 设置独立的控件
   */
  private _setUpStandalone(): void {

    setUpControl(this.control, this);
    this.control.updateValueAndValidity({emitEvent: false});
  
  }



  /**
   * 检查父指令和name属性设置是否正确
   */
  private _checkForErrors(): void {
    if (!this._isStandalone()) {
      this._checkParentType();
    }
    this._checkName();
  }

  /**
   * 检查父指令类型
   */
  private _checkParentType(): void {

    if (!(this._parent instanceof NgModelGroup) &&
        this._parent instanceof AbstractFormGroupDirective) {

      // 1、如果父指令不是NgModelGroup，是AbstractFormGroupDirective
      // 则提示NgModel的父指令不能是FormGroupName或FormArrayName
      // AbstractFormGroupDirective是FormGroupName和FormArrayName的基类，
      // 用于Reactive-Form。
      TemplateDrivenErrors.formGroupNameException();
    } else if (
      !(this._parent instanceof NgModelGroup) && !(this._parent instanceof NgForm)) {
        
      // 2、如果父指令不是NgModelGroup也不是NgForm
      TemplateDrivenErrors.modelParentException();
    }
  }

  /**
   * 检查NgModel绑定的控件是否有name属性，如果不是standalone，则必须设置name
   * 
   */
  private _checkName(): void {
    if (this.options && this.options.name) this.name = this.options.name;

    if (!this._isStandalone() && !this.name) {
      TemplateDrivenErrors.missingNameException();
    }
  }



  /**
   * _updateValue
   * 给control赋值
   * @param value 
   */
  private _updateValue(value: any): void {
    resolvedPromise.then(() => {
      this.control.setValue(value, {emitViewToModelChange: false});
    });
  }

  /**
   * _updateDisabled
   * @param changes 
   */
  private _updateDisabled(changes: SimpleChanges) {

    // 查找出changes中isDisabled的值
    const disabledValue = changes['isDisabled'].currentValue;

    const isDisabled =
        disabledValue === '' || (disabledValue && disabledValue !== 'false');

    // 调用control的disable()或者enable()方法，设置状态
    resolvedPromise.then(() => {
      if (isDisabled && !this.control.disabled) {
        this.control.disable();
      } else if (!isDisabled && this.control.disabled) {
        this.control.enable();
      }
    });
  }


}
