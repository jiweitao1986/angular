/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ApplicationRef} from '../application_ref';
import {ChangeDetectorRef} from '../change_detection/change_detection';
import {Injector} from '../di/injector';
import {ComponentFactory, ComponentRef} from '../linker/component_factory';
import {ComponentFactoryBoundToModule, ComponentFactoryResolver} from '../linker/component_factory_resolver';
import {ElementRef} from '../linker/element_ref';
import {InternalNgModuleRef, NgModuleRef} from '../linker/ng_module_factory';
import {TemplateRef} from '../linker/template_ref';
import {ViewContainerRef} from '../linker/view_container_ref';
import {EmbeddedViewRef, InternalViewRef, ViewRef} from '../linker/view_ref';
import {Renderer as RendererV1, Renderer2} from '../render/api';
import {Type} from '../type';
import {stringify} from '../util';
import {VERSION} from '../version';

import {callNgModuleLifecycle, initNgModule, resolveNgModuleDep} from './ng_module';
import {DepFlags, ElementData, NgModuleData, NgModuleDefinition, NodeDef, NodeFlags, Services, TemplateData, ViewContainerData, ViewData, ViewDefinitionFactory, ViewState, asElementData, asProviderData, asTextData} from './types';
import {markParentViewsForCheck, resolveDefinition, rootRenderNodes, splitNamespace, tokenKey, viewParentEl} from './util';
import {attachEmbeddedView, detachEmbeddedView, moveEmbeddedView, renderDetachView} from './view_attach';

const EMPTY_CONTEXT = new Object();

// Attention: this function is called as top level function.
// Putting any logic in here will destroy closure tree shaking!
export function createComponentFactory(
    selector: string, componentType: Type<any>, viewDefFactory: ViewDefinitionFactory,
    inputs: {[propName: string]: string} | null, outputs: {[propName: string]: string},
    ngContentSelectors: string[]): ComponentFactory<any> {
  return new ComponentFactory_(
      selector, componentType, viewDefFactory, inputs, outputs, ngContentSelectors);
}

export function getComponentViewDefinitionFactory(componentFactory: ComponentFactory<any>):
    ViewDefinitionFactory {
  return (componentFactory as ComponentFactory_).viewDefFactory;
}


/**
 * Component工厂实现类
 */
class ComponentFactory_ extends ComponentFactory<any> {
  /**
   * @internal
   */
  viewDefFactory: ViewDefinitionFactory;

  constructor(
      public selector: string,
      public componentType: Type<any>,
      viewDefFactory: ViewDefinitionFactory,
      private _inputs: {[propName: string]: string}|null,
      private _outputs: {[propName: string]: string},
      public ngContentSelectors: string[]
  ) {
    
    // 注意：这个构造函数作为顶层函数被调用
    // 放在这里的任何逻辑会破坏tree shaking
    // Attention: this ctor is called as top level function.
    // Putting any logic in here will destroy closure tree shaking!
    super();
    this.viewDefFactory = viewDefFactory;
  }

  get inputs() {
    const inputsArr: {propName: string, templateName: string}[] = [];
    const inputs = this._inputs !;
    for (let propName in inputs) {
      const templateName = inputs[propName];
      inputsArr.push({propName, templateName});
    }
    return inputsArr;
  }

  get outputs() {
    const outputsArr: {propName: string, templateName: string}[] = [];
    for (let propName in this._outputs) {
      const templateName = this._outputs[propName];
      outputsArr.push({propName, templateName});
    }
    return outputsArr;
  }

  /**
   * Creates a new component.
   * @param injector
   * @param projectableNodes
   * @param rootSelectorOrNode
   * @param ngModule
   */
  create(
      injector: Injector,
      projectableNodes?: any[][],
      rootSelectorOrNode?: string|any,
      ngModule?: NgModuleRef<any>
  ): ComponentRef<any> {
    
    // 组件必须从属于某一个模块
    if (!ngModule) {
      throw new Error('ngModule should be provided');
    }
    
    // 创建viewDefinition
    const viewDef = resolveDefinition(this.viewDefFactory);
    
    
    const componentNodeIndex = viewDef.nodes[0].element !.componentProvider !.nodeIndex;
    
    // 创建ViewData
    const view = Services.createRootView(
      injector,
      projectableNodes || [],
      rootSelectorOrNode,
      viewDef,
      ngModule,
      EMPTY_CONTEXT
    );

    //
    const component = asProviderData(view, componentNodeIndex).instance;

    //
    if (rootSelectorOrNode) {
      view.renderer.setAttribute(
        asElementData(view, 0).renderElement,
        'ng-version',
        VERSION.full
      );
    }

    // 创建ComponentRef
    return new ComponentRef_(view, new ViewRef_(view), component);
  }
}


/**
 * The implementation class of ComponentRef
 */
class ComponentRef_ extends ComponentRef<any> {
  
  /**
   * hostView
   */
  public readonly hostView: ViewRef;
  
  /**
   * instance
   */
  public readonly instance: any;

  /**
   * changeDetectorRef
   */
  public readonly changeDetectorRef: ChangeDetectorRef;
  
  /**
   * _elDef
   */
  private _elDef: NodeDef;
  
  /**
   * 构造函数
   * @param _view 
   * @param _viewRef 
   * @param _component 
   */
  constructor(private _view: ViewData, private _viewRef: ViewRef, private _component: any) {
    super();
    this._elDef = this._view.def.nodes[0];
    this.hostView = _viewRef;
    this.changeDetectorRef = _viewRef;
    this.instance = _component;
  }
  
  /**
   * location
   */
  get location(): ElementRef {
    return new ElementRef(asElementData(this._view, this._elDef.nodeIndex).renderElement);
  }
  
  /**
   * injector
   */
  get injector(): Injector { return new Injector_(this._view, this._elDef); }
  
  /**
   * componentType
   */
  get componentType(): Type<any> { return <any>this._component.constructor; }

  /**
   * destroy
   */
  destroy(): void {
    this._viewRef.destroy();
  }
  
  /**
   * onDestroy
   * @param callback 
   */
  onDestroy(callback: Function): void {
    this._viewRef.onDestroy(callback);
  }
}





export function createViewContainerData(
    view: ViewData, elDef: NodeDef, elData: ElementData): ViewContainerData {
  return new ViewContainerRef_(view, elDef, elData);
}



/**
 * ViewContainerRef_
 */
class ViewContainerRef_ implements ViewContainerData {
  /**
   * @internal
   */
  _embeddedViews: ViewData[] = [];

  /**
   * 
   * @param _view 
   * @param _elDef 
   * @param _data 
   */
  constructor(private _view: ViewData, private _elDef: NodeDef, private _data: ElementData) {}

  /**
   * ElementRef
   */
  get element(): ElementRef { return new ElementRef(this._data.renderElement); }

  /**
   * injector
   */
  get injector(): Injector { return new Injector_(this._view, this._elDef); }

  /**
   * parentInjector
   */
  get parentInjector(): Injector {
    let view = this._view;
    let elDef = this._elDef.parent;
    while (!elDef && view) {
      elDef = viewParentEl(view);
      view = view.parent !;
    }

    return view ? new Injector_(view, elDef) : new Injector_(this._view, null);
  }

  /**
   * clear
   */
  clear(): void {
    const len = this._embeddedViews.length;
    for (let i = len - 1; i >= 0; i--) {
      const view = detachEmbeddedView(this._data, i) !;
      Services.destroyView(view);
    }
  }

  /**
   * get
   * @param index 
   */
  get(index: number): ViewRef|null {
    const view = this._embeddedViews[index];
    if (view) {
      const ref = new ViewRef_(view);
      ref.attachToViewContainerRef(this);
      return ref;
    }
    return null;
  }

  /**
   * length
   */
  get length(): number {
    return this._embeddedViews.length;
  }

  /**
   * createEmbededView
   * @param templateRef 
   * @param context 
   * @param index 
   */
  createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, index?: number):
      EmbeddedViewRef<C> {
    const viewRef = templateRef.createEmbeddedView(context || <any>{});
    this.insert(viewRef, index);
    return viewRef;
  }

  /**
   * createComponent
   * @param componentFactory 
   * @param index 
   * @param injector 
   * @param projectableNodes 
   * @param ngModuleRef 
   */
  createComponent<C>(
      componentFactory: ComponentFactory<C>, index?: number, injector?: Injector,
      projectableNodes?: any[][], ngModuleRef?: NgModuleRef<any>): ComponentRef<C> {
    const contextInjector = injector || this.parentInjector;
    if (!ngModuleRef && !(componentFactory instanceof ComponentFactoryBoundToModule)) {
      ngModuleRef = contextInjector.get(NgModuleRef);
    }
    const componentRef =
        componentFactory.create(contextInjector, projectableNodes, undefined, ngModuleRef);
    this.insert(componentRef.hostView, index);
    return componentRef;
  }

  /**
   * insert
   * @param viewRef 
   * @param index 
   */
  insert(viewRef: ViewRef, index?: number): ViewRef {
    if (viewRef.destroyed) {
      throw new Error('Cannot insert a destroyed View in a ViewContainer!');
    }
    const viewRef_ = <ViewRef_>viewRef;
    const viewData = viewRef_._view;
    attachEmbeddedView(this._view, this._data, index, viewData);
    viewRef_.attachToViewContainerRef(this);
    return viewRef;
  }

  /**
   * move
   * @param viewRef 
   * @param currentIndex 
   */
  move(viewRef: ViewRef_, currentIndex: number): ViewRef {
    if (viewRef.destroyed) {
      throw new Error('Cannot move a destroyed View in a ViewContainer!');
    }
    const previousIndex = this._embeddedViews.indexOf(viewRef._view);
    moveEmbeddedView(this._data, previousIndex, currentIndex);
    return viewRef;
  }

  /**
   * indexOf
   * @param viewRef 
   */
  indexOf(viewRef: ViewRef): number {
    return this._embeddedViews.indexOf((<ViewRef_>viewRef)._view);
  }

  /**
   * remove
   * @param index 
   */
  remove(index?: number): void {
    const viewData = detachEmbeddedView(this._data, index);
    if (viewData) {
      Services.destroyView(viewData);
    }
  }

  /**
   * detach
   * @param index 
   */
  detach(index?: number): ViewRef|null {
    const view = detachEmbeddedView(this._data, index);
    return view ? new ViewRef_(view) : null;
  }
}



export function createChangeDetectorRef(view: ViewData): ChangeDetectorRef {
  return new ViewRef_(view);
}



/**
 * The implementation class of ViewRef
 */
export class ViewRef_ implements EmbeddedViewRef<any>, InternalViewRef {


  /**
   * @internal
   * ViewData
   *
   */
  _view: ViewData;

  /**
   * _viewContainerRef
   */
  private _viewContainerRef: ViewContainerRef|null;

  /**
   * _appRef
   */
  private _appRef: ApplicationRef|null;

  /**
   * 构造函数
   * @param _view 
   */
  constructor(_view: ViewData) {
    this._view = _view;
    this._viewContainerRef = null;
    this._appRef = null;
  }

  /**
   * rootNodes
   * rootNodes是个啥？？？
   */
  get rootNodes(): any[] {
    return rootRenderNodes(this._view);
  }

  /**
   * context
   */
  get context() {
    return this._view.context;
  }

  /**
   * destroyed
   */
  get destroyed(): boolean {
    return (this._view.state & ViewState.Destroyed) !== 0;
  }

  /**
   * markForCheck
   */
  markForCheck(): void {
    markParentViewsForCheck(this._view);
  }
  
  /**
   * detach
   */
  detach(): void {
    this._view.state &= ~ViewState.Attached;
  }

  /**
   * detectChanges
   */
  detectChanges(): void {
    const fs = this._view.root.rendererFactory;
    if (fs.begin) {
      fs.begin();
    }
    
    //
    Services.checkAndUpdateView(this._view);
    if (fs.end) {
      fs.end();
    }
  }
  
  /**
   * checkNoChanges
   */
  checkNoChanges(): void {
    Services.checkNoChangesView(this._view);
  }

  /**
   * reattach
   */
  reattach(): void {
    this._view.state |= ViewState.Attached;
  }


  /**
   * onDestroy
   * @param callback 
   */
  onDestroy(callback: Function) {
    if (!this._view.disposables) {
      this._view.disposables = [];
    }
    this._view.disposables.push(<any>callback);
  }

  /**
   * destroy
   * ViewRef被destroy时，要从所属的AppRef或ViewContainerRef中销毁视图
   */
  destroy() {
    if (this._appRef) {
      this._appRef.detachView(this);
    } else if (this._viewContainerRef) {
      this._viewContainerRef.detach(this._viewContainerRef.indexOf(this));
    }
    Services.destroyView(this._view);
  }

  /**
   * detachFromAppRef
   */
  detachFromAppRef() {
    this._appRef = null;
    renderDetachView(this._view);
    Services.dirtyParentQueries(this._view);
  }

  /**
   * attachToAppRef
   * @param appRef 
   */
  attachToAppRef(appRef: ApplicationRef) {
    
    // 如果已经和一个viewContainerRef关联，则不能直接和appRef关联
    if (this._viewContainerRef) {
      throw new Error('This view is already attached to a ViewContainer!');
    }
    this._appRef = appRef;
  }

  /**
   * attachToViewContainerRef
   * @param vcRef 
   */
  attachToViewContainerRef(vcRef: ViewContainerRef) {

    // 如果已经和一个ApplicationRef关联，则不能再和ViewContainerRef关联
    // The ViewRef can only be attached to either an ApplicationRef or an ViewContainerRef.
    if (this._appRef) {
      throw new Error('This view is already attached directly to the ApplicationRef!');
    }
    this._viewContainerRef = vcRef;
  }
}






export function createTemplateData(view: ViewData, def: NodeDef): TemplateData {
  return new TemplateRef_(view, def);
}




class TemplateRef_ extends TemplateRef<any> implements TemplateData {
  /**
   * @internal
   */
  _projectedViews: ViewData[];

  /**
   * 构造函数
   * @param _parentView 
   * @param _def 
   */
  constructor(private _parentView: ViewData, private _def: NodeDef) { super(); }

  /**
   * 创建EmbededView
   * @param context 
   */
  createEmbeddedView(context: any): EmbeddedViewRef<any> {
    return new ViewRef_(Services.createEmbeddedView(
        this._parentView, this._def, this._def.element !.template !, context));
  }

  /**
   * 获取ElementRef
   */
  get elementRef(): ElementRef {
    
    // 先从parentView上获取ElementData（ElementData是NodeData的实现类）
    // 然后创建一个ElementRef
    return new ElementRef(asElementData(this._parentView, this._def.nodeIndex).renderElement);
  }
}





export function createInjector(view: ViewData, elDef: NodeDef): Injector {
  return new Injector_(view, elDef);
}

class Injector_ implements Injector {
  constructor(private view: ViewData, private elDef: NodeDef|null) {}
  get(token: any, notFoundValue: any = Injector.THROW_IF_NOT_FOUND): any {
    const allowPrivateServices =
        this.elDef ? (this.elDef.flags & NodeFlags.ComponentView) !== 0 : false;
    return Services.resolveDep(
        this.view, this.elDef, allowPrivateServices,
        {flags: DepFlags.None, token, tokenKey: tokenKey(token)}, notFoundValue);
  }
}

export function nodeValue(view: ViewData, index: number): any {
  const def = view.def.nodes[index];
  if (def.flags & NodeFlags.TypeElement) {
    const elData = asElementData(view, def.nodeIndex);
    return def.element !.template ? elData.template : elData.renderElement;
  } else if (def.flags & NodeFlags.TypeText) {
    return asTextData(view, def.nodeIndex).renderText;
  } else if (def.flags & (NodeFlags.CatProvider | NodeFlags.TypePipe)) {
    return asProviderData(view, def.nodeIndex).instance;
  }
  throw new Error(`Illegal state: read nodeValue for node index ${index}`);
}

export function createRendererV1(view: ViewData): RendererV1 {
  return new RendererAdapter(view.renderer);
}

class RendererAdapter implements RendererV1 {
  constructor(private delegate: Renderer2) {}
  selectRootElement(selectorOrNode: string|Element): Element {
    return this.delegate.selectRootElement(selectorOrNode);
  }

  createElement(parent: Element|DocumentFragment, namespaceAndName: string): Element {
    const [ns, name] = splitNamespace(namespaceAndName);
    const el = this.delegate.createElement(name, ns);
    if (parent) {
      this.delegate.appendChild(parent, el);
    }
    return el;
  }

  createViewRoot(hostElement: Element): Element|DocumentFragment { return hostElement; }

  createTemplateAnchor(parentElement: Element|DocumentFragment): Comment {
    const comment = this.delegate.createComment('');
    if (parentElement) {
      this.delegate.appendChild(parentElement, comment);
    }
    return comment;
  }

  createText(parentElement: Element|DocumentFragment, value: string): any {
    const node = this.delegate.createText(value);
    if (parentElement) {
      this.delegate.appendChild(parentElement, node);
    }
    return node;
  }

  projectNodes(parentElement: Element|DocumentFragment, nodes: Node[]) {
    for (let i = 0; i < nodes.length; i++) {
      this.delegate.appendChild(parentElement, nodes[i]);
    }
  }

  attachViewAfter(node: Node, viewRootNodes: Node[]) {
    const parentElement = this.delegate.parentNode(node);
    const nextSibling = this.delegate.nextSibling(node);
    for (let i = 0; i < viewRootNodes.length; i++) {
      this.delegate.insertBefore(parentElement, viewRootNodes[i], nextSibling);
    }
  }

  detachView(viewRootNodes: (Element|Text|Comment)[]) {
    for (let i = 0; i < viewRootNodes.length; i++) {
      const node = viewRootNodes[i];
      const parentElement = this.delegate.parentNode(node);
      this.delegate.removeChild(parentElement, node);
    }
  }

  destroyView(hostElement: Element|DocumentFragment, viewAllNodes: Node[]) {
    for (let i = 0; i < viewAllNodes.length; i++) {
      this.delegate.destroyNode !(viewAllNodes[i]);
    }
  }

  listen(renderElement: any, name: string, callback: Function): Function {
    return this.delegate.listen(renderElement, name, <any>callback);
  }

  listenGlobal(target: string, name: string, callback: Function): Function {
    return this.delegate.listen(target, name, <any>callback);
  }

  setElementProperty(
      renderElement: Element|DocumentFragment, propertyName: string, propertyValue: any): void {
    this.delegate.setProperty(renderElement, propertyName, propertyValue);
  }

  setElementAttribute(renderElement: Element, namespaceAndName: string, attributeValue: string):
      void {
    const [ns, name] = splitNamespace(namespaceAndName);
    if (attributeValue != null) {
      this.delegate.setAttribute(renderElement, name, attributeValue, ns);
    } else {
      this.delegate.removeAttribute(renderElement, name, ns);
    }
  }

  setBindingDebugInfo(renderElement: Element, propertyName: string, propertyValue: string): void {}

  setElementClass(renderElement: Element, className: string, isAdd: boolean): void {
    if (isAdd) {
      this.delegate.addClass(renderElement, className);
    } else {
      this.delegate.removeClass(renderElement, className);
    }
  }

  setElementStyle(renderElement: HTMLElement, styleName: string, styleValue: string): void {
    if (styleValue != null) {
      this.delegate.setStyle(renderElement, styleName, styleValue);
    } else {
      this.delegate.removeStyle(renderElement, styleName);
    }
  }

  invokeElementMethod(renderElement: Element, methodName: string, args: any[]): void {
    (renderElement as any)[methodName].apply(renderElement, args);
  }

  setText(renderNode: Text, text: string): void { this.delegate.setValue(renderNode, text); }

  animate(): any { throw new Error('Renderer.animate is no longer supported!'); }
}


export function createNgModuleRef(
    moduleType: Type<any>, parent: Injector, bootstrapComponents: Type<any>[],
    def: NgModuleDefinition): NgModuleRef<any> {
  return new NgModuleRef_(moduleType, parent, bootstrapComponents, def);
}



/**
 * NgModuleRef
 */
class NgModuleRef_ implements NgModuleData, InternalNgModuleRef<any> {

  /**
   * _destroyListeners
   */
  private _destroyListeners: (() => void)[] = [];
  
  /**
   * destroyed
   * 是否被注销
   */
  private _destroyed: boolean = false;


  /**
   * @internal
   * _providers
   */
  _providers: any[];

  /**
   * 构造函数
   * @param _moduleType 
   * @param _parent 
   * @param _bootstrapComponents 
   * @param _def 
   */
  constructor(
      private _moduleType: Type<any>, public _parent: Injector,
      public _bootstrapComponents: Type<any>[], public _def: NgModuleDefinition) {
    initNgModule(this);
  }

  /**
   * 获取
   * @param token 
   * @param notFoundValue 
   */
  get(token: any, notFoundValue: any = Injector.THROW_IF_NOT_FOUND): any {
    return resolveNgModuleDep(
        this, {token: token, tokenKey: tokenKey(token), flags: DepFlags.None}, notFoundValue);
  }

  /**
   * 获取Module实例
   */
  get instance() { return this.get(this._moduleType); }

  /**
   * 组件工厂处理器
   */
  get componentFactoryResolver() {
    return this.get(ComponentFactoryResolver);
  }

  /**
   * 注入器
   */
  get injector(): Injector { return this; }

  /**
   * 执行模块销毁
   */
  destroy(): void {
    if (this._destroyed) {
      throw new Error(
          `The ng module ${stringify(this.instance.constructor)} has already been destroyed.`);
    }
    this._destroyed = true;

    //
    callNgModuleLifecycle(this, NodeFlags.OnDestroy);

    // 遍历所有监听器，依次执行
    this._destroyListeners.forEach((listener) => listener());
  }

  /**
   * 注册模块销毁监听函数
   * @param callback 
   */
  onDestroy(callback: () => void): void {
    this._destroyListeners.push(callback);
  }
}
