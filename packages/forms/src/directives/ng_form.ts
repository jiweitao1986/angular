/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AfterViewInit, Directive, EventEmitter, Inject, Input, Optional, Self, forwardRef} from '@angular/core';

import {AbstractControl, FormControl, FormGroup, FormHooks} from '../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS} from '../validators';

import {ControlContainer} from './control_container';
import {Form} from './form_interface';
import {NgControl} from './ng_control';
import {NgModel} from './ng_model';
import {NgModelGroup} from './ng_model_group';
import {composeAsyncValidators, composeValidators, removeDir, setUpControl, setUpFormContainer, syncPendingControls} from './shared';

export const formDirectiveProvider: any = {
  provide: ControlContainer,
  useExisting: forwardRef(() => NgForm)
};

const resolvedPromise = Promise.resolve(null);

/**
 * 创建一个顶层的FormGroup实例，并将它绑定到form标签上，以便用来跟踪聚合的表单的值和验证状态
 * @whatItDoes Creates a top-level {@link FormGroup} instance and binds it to a form
 * to track aggregate form value and validation status.
 *
 * @howToUse
 *
 * 只要导入了FormsModule模块，这个指令就默认在所有的<form>标签上激活了。你不需要去添加特别的选择器。
 * As soon as you import the `FormsModule`, this directive becomes active by default on
 * all `<form>` tags.  You don't need to add a special selector.
 *
 * 你可以使用ngForm来导出这个指令的实例到到一个末班变量中（例如: `#myForm="ngForm"`）。
 * 这是可选但有用的。
 * 隐藏在底层的FormGroup实例的很多属性被赋值到了这个指令的属性中，所以可以一个NgForm的引用可以帮助你访问
 * 这些聚合的值和验证状态，以及一些用户交互的属性，比如dirty、touched。
 * You can export the directive into a local template variable using `ngForm` as the key
 * (ex: `#myForm="ngForm"`). This is optional, but useful.  Many properties from the underlying
 * {@link FormGroup} instance are duplicated on the directive itself, so a reference to it
 * will give you access to the aggregate value and validity status of the form, as well as
 * user interaction properties like `dirty` and `touched`.
 * 
 * 通过给输入控件添加NgModel指令和一个name属性，可以将它注册到NgForm中。
 * 如果你愿意创建一个sub-gorups到form中，可以使用NgModelGroup指令。
 * To register child controls with the form, you'll want to use {@link NgModel} with a
 * `name` attribute.  You can also use {@link NgModelGroup} if you'd like to create
 * sub-groups within the form.
 *
 * 你可以监听指令的ngSubmit事件，当用户触发<form>提交时，ngSubmit事件会被触发
 * ngSubmit事件会和form原始的提交事件一起触发。
 * You can listen to the directive's `ngSubmit` event to be notified when the user has
 * triggered a form submission. The `ngSubmit` event will be emitted with the original form
 * submission event.
 *
 * // 在模板驱动的表单中，所有的<form>标签将被自动识别为NgForm。
 * 如果你想导入FormsModule但想在某些表单中跳过这种用法
 * 例如，你想使用原生HTML5的验证，你可以添加ngNoForm，这样就不会为form标签不会创建NgForm指令。
 * 在动态表单中，必须添加ngNoForm，NgForm的选择器不会选中带FormGroup指令的<Form>标签。
 * In template driven forms, all `<form>` tags are automatically tagged as `NgForm`.
 * If you want to import the `FormsModule` but skip its usage in some forms,
 * for example, to use native HTML5 validation, you can add `ngNoForm` and the `<form>`
 * tags won't create an `NgForm` directive. In reactive forms, using `ngNoForm` is
 * unnecessary because the `<form>` tags are inert. In that case, you would
 * refrain from using the `formGroup` directive.
 *
 * {@example forms/ts/simpleForm/simple_form_example.ts region='Component'}
 *
 * * **npm package**: `@angular/forms`
 *
 * * **NgModule**: `FormsModule`
 *
 *  @stable
 */
@Directive({

  //选择器
  // form:not([ngNoForm]):not([formGroup]),
  // ngForm,
  // [ngForm]
  selector: 'form:not([ngNoForm]):not([formGroup]),ngForm,[ngForm]',

  // providers
  providers: [formDirectiveProvider],

  //host：处理submit和reset事件
  host: {
    '(submit)': 'onSubmit($event)',
    '(reset)': 'onReset()'
  },

  //outputs
  outputs: ['ngSubmit'],

  //exprtAs：在模板中可以通过ngForm引用
  exportAs: 'ngForm'
})
export class NgForm extends ControlContainer implements Form, AfterViewInit {

  public readonly submitted: boolean = false;

  private _directives: NgModel[] = [];

  form: FormGroup;

  ngSubmit = new EventEmitter();

  /**
   * Options for the `NgForm` instance. Accepts the following properties:
   *
   * **updateOn**: Serves as the default `updateOn` value for all child `NgModels` below it
   * (unless a child has explicitly set its own value for this in `ngModelOptions`).
   * Potential values: `'change'` | `'blur'` | `'submit'`
   *
   * ```html
   * <form [ngFormOptions]="{updateOn: 'blur'}">
   *    <input name="one" ngModel>  <!-- this ngModel will update on blur -->
   * </form>
   * ```
   *
   */
  @Input('ngFormOptions') options: {updateOn?: FormHooks};

  constructor(
      @Optional() @Self() @Inject(NG_VALIDATORS) validators: any[],
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: any[]
  ) {

    super();
    this.form =
        new FormGroup({}, composeValidators(validators), composeAsyncValidators(asyncValidators));
  }

  ngAfterViewInit() { this._setUpdateStrategy(); }

  get formDirective(): Form { return this; }

  get control(): FormGroup { return this.form; }

  get path(): string[] { return []; }

  get controls(): {[key: string]: AbstractControl} { return this.form.controls; }



  /**
   * 重要 ！！！！！！！！！！
   * @param dir
   */
  addControl(dir: NgModel): void {

    // 通过一个立即实行的Promise，将要进行的处理放到本轮事件循环的末尾
    resolvedPromise.then(() => {
      
      const container = this._findContainer(dir.path);
      
      (dir as{control: FormControl}).control = <FormControl>container.registerControl(dir.name, dir.control);

      // 重要 ！！！！！！！！！！
      setUpControl(dir.control, dir);

      // 更新值和验证
      dir.control.updateValueAndValidity({emitEvent: false});

      // 将指令添加进指令集合
      this._directives.push(dir);
    });
  }

  getControl(dir: NgModel): FormControl { return <FormControl>this.form.get(dir.path); }

  removeControl(dir: NgModel): void {
    resolvedPromise.then(() => {
      const container = this._findContainer(dir.path);
      if (container) {
        container.removeControl(dir.name);
      }
      removeDir<NgModel>(this._directives, dir);
    });
  }

  addFormGroup(dir: NgModelGroup): void {
    resolvedPromise.then(() => {
      const container = this._findContainer(dir.path);
      const group = new FormGroup({});
      setUpFormContainer(group, dir);
      container.registerControl(dir.name, group);
      group.updateValueAndValidity({emitEvent: false});
    });
  }

  removeFormGroup(dir: NgModelGroup): void {
    resolvedPromise.then(() => {
      const container = this._findContainer(dir.path);
      if (container) {
        container.removeControl(dir.name);
      }
    });
  }

  getFormGroup(dir: NgModelGroup): FormGroup { return <FormGroup>this.form.get(dir.path); }

  updateModel(dir: NgControl, value: any): void {
    resolvedPromise.then(() => {
      const ctrl = <FormControl>this.form.get(dir.path !);
      ctrl.setValue(value);
    });
  }

  setValue(value: {[key: string]: any}): void { this.control.setValue(value); }

  /**
   * 处理表单提交
   * @param 
   */
  onSubmit($event: Event): boolean {

    //设置为已提交状态
    (this as{submitted: boolean}).submitted = true;

    // 同步
    syncPendingControls(this.form, this._directives);
    
    this.ngSubmit.emit($event);
    
    return false;
  }

  onReset(): void { this.resetForm(); }

  resetForm(value: any = undefined): void {

    // 重置关联的
    this.form.reset(value);

    //
    (this as{submitted: boolean}).submitted = false;
  }

  private _setUpdateStrategy() {
    if (this.options && this.options.updateOn != null) {
      this.form._updateOn = this.options.updateOn;
    }
  }

  /** @internal */
  _findContainer(path: string[]): FormGroup {
    path.pop();
    return path.length ? <FormGroup>this.form.get(path) : this.form;
  }
}
