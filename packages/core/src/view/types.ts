/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector} from '../di';
import {ErrorHandler} from '../error_handler';
import {ComponentFactory} from '../linker/component_factory';
import {NgModuleRef} from '../linker/ng_module_factory';
import {QueryList} from '../linker/query_list';
import {TemplateRef} from '../linker/template_ref';
import {ViewContainerRef} from '../linker/view_container_ref';
import {Renderer2, RendererFactory2, RendererType2} from '../render/api';
import {Sanitizer, SecurityContext} from '../security';
import {Type} from '../type';











// ----------------------------------------------------------------------------------------------------------------------------------------------------
// Defs
// ----------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Factory for ViewDefinitions/NgModuleDefinitions.
 * We use a function so we can reexeute it in case an error happens and use the given logger
 * function to log the error from the definition of the node, which is shown in all browser
 * logs.
 */
export interface DefinitionFactory<D extends Definition<any>> {
  (logger: NodeLogger): D;
}

/**
 * Function to call console.error at the right source location. This is an indirection
 * via another function as browser will log the location that actually called
 * `console.error`.
 */
export interface NodeLogger { (): () => void; }

export interface Definition<DF extends DefinitionFactory<any>> {
  factory: DF|null;
}


/**
 * NgModuleDefinition
 * 啥都没有，就是一堆NgModuleProviderDef的存储
 */
export interface NgModuleDefinition extends Definition<NgModuleDefinitionFactory> {

  /**
   * providers
   */
  providers: NgModuleProviderDef[];
  
  /**
   * providersByKey
   */
  providersByKey: {[tokenKey: string]: NgModuleProviderDef};
}

export interface NgModuleDefinitionFactory extends DefinitionFactory<NgModuleDefinition> {}


/**
 * 
 */
export interface ViewDefinition extends Definition<ViewDefinitionFactory> {
  
  /**
   * flags
   */
  flags: ViewFlags;

  /**
   * updateDirectives
   */
  updateDirectives: ViewUpdateFn;

  /**
   * updateRenderer
   * @summary
   * 此属性非常关键，该函数负责更新界面，在component.ngFactory中，调用viewDef的最后一个参数，是一个函数；
   * 
   */
  updateRenderer: ViewUpdateFn;

  /**
   * handleEvent
   */
  handleEvent: ViewHandleEventFn;

  /**
   * Order: Depth first.
   * Especially providers are before elements / anchors.
   * 所有子节点的额数组，采用深度优先算法
   */
  nodes: NodeDef[];


  /**
   * aggregated NodeFlags for all nodes
   * @summary
   * 1、汇总所有子节点的NodeFlag；
   * 2、用于在父节点上判断是否存在某种NodeFlag的子节点，比如检查有没有ComponentView类型的子节点，直接通过它判断，如果存在，再进行遍历，处理这些ComponentView;
   * 3、这样可以提高性能，避免了每次都进行循环遍历，典型牺牲内存，换取性能的方式。
   */
  nodeFlags: NodeFlags;

  /**
   * rootNodeFlags
   * 根节点的NodeFlags
   * @summary
   * ？？？
   */
  rootNodeFlags: NodeFlags;

  /**
   * lastRenderRootNode
   * @summary
   * 看属性名是：最后渲染的根节点
   * ？？？
   */
  lastRenderRootNode: NodeDef|null;

  /**
   * bindingCount
   * @summary
   * 绑定数量
   * ？？？
   * input的数量？还是末班里引用变量的数量
   */
  bindingCount: number;

  /**
   * outputCount
   * @summary
   * output数量
   */
  outputCount: number;


  /**
   * Binary or of all query ids that are matched by one of the nodes.
   * This includes query ids from templates as well.
   * Used as a bloom filter.
   */
  nodeMatchedQueries: number;
}


/**
 * ViewDefinitionFactory
 */
export interface ViewDefinitionFactory extends DefinitionFactory<ViewDefinition> {}


/**
 * View更新函数接口
 * @summary
 * 用于规范View更新函数
 * 这些函数谁定义？ngFactory里？
 */
export interface ViewUpdateFn {
  (check: NodeCheckFn, view: ViewData): void;
}


/**
 * helper functions to create an overloaded function type.
 * @summary
 * 1、节点更新函数；
 * 2、该函数分两种类型：Inline、Dynamic
 * 3、Inline：效率更高，但检查的参数个数不超过10个；
 * 4、Dynamic：参数
 * 
 */
export interface NodeCheckFn {

  (view: ViewData, nodeIndex: number, argStyle: ArgumentType.Dynamic, values: any[]): any;

  (view: ViewData, nodeIndex: number, argStyle: ArgumentType.Inline, v0?: any, v1?: any, v2?: any,
   v3?: any, v4?: any, v5?: any, v6?: any, v7?: any, v8?: any, v9?: any): any;
}


/**
 * NodeCheckFn的参数类型
 */
export const enum ArgumentType {
  Inline = 0,
  Dynamic = 1
}


/**
 * ViewHandleEventFn
 */
export interface ViewHandleEventFn {
  (view: ViewData, nodeIndex: number, eventName: string, event: any): boolean;
}


/**
 * Bitmask for ViewDefinition.flags.
 * @summary
 * 变更检测策略：None=0 OnPush=2
 */
export const enum ViewFlags {
  None = 0,
  OnPush = 1 << 1,
}


/**
 * A node definition in the view.
 *
 * Note: We use one type for all nodes so that loops that loop over all nodes
 * of a ViewDefinition stay monomorphic!
 * @summary
 * 1、我们为所有的node使用统一的类型，为了方便迭代。
 * 2、DerivedNodeDef出了有NodeDef的属性外，还有自己特有的属性
 * 3、比如Element类型的Node的NodeDef上，element属性有值（值是一个ElementDef），其他类型，则element属性是null。
  */
export interface NodeDef {

  /**
   * NodeFlags
   */
  flags: NodeFlags;


  /**
   * node在viewData和viewDefinition内的索引
   * Index of the node in view data and view definition (those are the same)
   * @summary
   * node在ViewData.nodes中的索引，和在ViewDefinition.nodes中的索引是一样的
   * 区别是啥？肯定是有区别。
   */
  nodeIndex: number;
  
  /**
   * Index of the node in the check functions
   * Differ from nodeIndex when nodes are added or removed at runtime (ie after compilation)
   * @summary
   * 1、当前Node在check函数中的索引;
   * 2、运行时新增或者删除节点后，checkIndex和nodeIndex会有所不同。
   */
  checkIndex: number;
  
  /**
   * parent
   */
  parent: NodeDef|null;
  
  /**
   * renderParent
   * 这个是干嘛用的？
   */
  renderParent: NodeDef|null;
  
  /**
   * ngContentIndex
   * this is checked against NgContentDef.index to find matched nodes
   */
  ngContentIndex: number|null;


  /**
   * number of transitive children
   * 所有关联后代节点的数量
   * 1、直接子元素；
   * 2、间接后代。
   */
  childCount: number;


  /**
   * aggregated NodeFlags for all transitive children (does not include self)
   * 聚合所有关联子节点的NodeFlags
   * 
   **/
  childFlags: NodeFlags;


  /**
   * aggregated NodeFlags for all direct children (does not include self)
   * 聚合所有直接子子元素的NodeFlags
   */
  directChildFlags: NodeFlags;

  /**
   * bindingIndex
   */
  bindingIndex: number;

  /**
   * bindings
   * 这个Node上绑定的变量
   */
  bindings: BindingDef[];

  /**
   * bindingFlags
   */
  bindingFlags: BindingFlags;
  
  /**
   * outputIndex
   */
  outputIndex: number;

  /**
   * outputs
   */
  outputs: OutputDef[];

  /**
   * references that the user placed on the element
   * 模板变量：<div #div ></div>
   */
  references: {[refId: string]: QueryValueType};

  /**
   * ids and value types of all queries that are matched by this node.
   */
  matchedQueries: {[queryId: number]: QueryValueType};

  /**
   * Binary or of all matched query ids of this node.
   */
  matchedQueryIds: number;

  /**
   * Binary or of all query ids that are matched by one of the children.
   * This includes query ids from templates as well.
   * Used as a bloom filter.
   */
  childMatchedQueries: number;


  /**
   * element
   */
  element: ElementDef|null;

  /**
   * provider
   */
  provider: ProviderDef|null;
  
  /**
   * text
   */
  text: TextDef|null;
  
  /**
   * query
   */
  query: QueryDef|null;
  
  /**
   * NgContentDef
   */
  ngContent: NgContentDef|null;

  
}


/**
 * Bitmask for NodeDef.flags.
 * Naming convention:
 * - `Type...`: flags that are mutually exclusive
 * - `Cat...`: union of multiple `Type...` (short for category).
 */
export const enum NodeFlags {
  None = 0,
  TypeElement = 1 << 0,
  TypeText = 1 << 1,
  ProjectedTemplate = 1 << 2,
  CatRenderNode = TypeElement | TypeText,
  TypeNgContent = 1 << 3,
  TypePipe = 1 << 4,
  TypePureArray = 1 << 5,
  TypePureObject = 1 << 6,
  TypePurePipe = 1 << 7,
  CatPureExpression = TypePureArray | TypePureObject | TypePurePipe,
  TypeValueProvider = 1 << 8,
  TypeClassProvider = 1 << 9,
  TypeFactoryProvider = 1 << 10,
  TypeUseExistingProvider = 1 << 11,
  LazyProvider = 1 << 12,
  PrivateProvider = 1 << 13,
  TypeDirective = 1 << 14,
  Component = 1 << 15,
  CatProviderNoDirective =
      TypeValueProvider | TypeClassProvider | TypeFactoryProvider | TypeUseExistingProvider,
  CatProvider = CatProviderNoDirective | TypeDirective,
  OnInit = 1 << 16,
  OnDestroy = 1 << 17,
  DoCheck = 1 << 18,
  OnChanges = 1 << 19,
  AfterContentInit = 1 << 20,
  AfterContentChecked = 1 << 21,
  AfterViewInit = 1 << 22,
  AfterViewChecked = 1 << 23,
  EmbeddedViews = 1 << 24,
  ComponentView = 1 << 25,

  // 2^26 = 67108864
  TypeContentQuery = 1 << 26,

  // 2^27 = 134217728
  TypeViewQuery = 1 << 27,

  // 2^28 = 268435456
  StaticQuery = 1 << 28,

  // 2^29 = 536870912
  DynamicQuery = 1 << 29,
  
  // 201326592
  CatQuery = TypeContentQuery | TypeViewQuery,

  // mutually exclusive values...
  Types = CatRenderNode | TypeNgContent | TypePipe | CatPureExpression | CatProvider | CatQuery
}


/**
 * 变量绑定
 */
export interface BindingDef {
  
  /**
   * 绑定类型（TypeElementAttribute、TypeElementClass、TypeElementStyle）
   */
  flags: BindingFlags;

  /**
   * ？？？
   */
  ns: string|null;

  /**
   * 变量类型
   */
  name: string|null;

  /**
   * ？？？
   */
  nonMinifiedName: string|null;

  /**
   * ？？？
   */
  securityContext: SecurityContext|null;

  /**
   * 后缀，对于TextNode，是跟在变量后边的文字
   */
  suffix: string|null;
}


/**
 * 绑定标志
 */
export const enum BindingFlags {
  
  /**
   * 属性
   */
  TypeElementAttribute = 1 << 0,

  /**
   * class
   */
  TypeElementClass = 1 << 1,

  /**
   * style
   */
  TypeElementStyle = 1 << 2,

  /**
   * property
   */
  TypeProperty = 1 << 3,

  /**
   * ？？？
   */
  SyntheticProperty = 1 << 4,

  /**
   * ？？？
   */
  SyntheticHostProperty = 1 << 5,

  /**
   * SyntheticProperty和SyntheticHostProperty的合并类型
   */
  CatSyntheticProperty = SyntheticProperty | SyntheticHostProperty,

  // mutually exclusive values...
  Types = TypeElementAttribute | TypeElementClass | TypeElementStyle | TypeProperty
}





/**
 * OutputDef定义
 */
export interface OutputDef {
  type: OutputType;
  target: 'window'|'document'|'body'|'component'|null;
  eventName: string;
  propName: string|null;
}

/**
 * Output类型
 * ElementOutput=元素自身的；
 * DirectiveOutput=指令的
 */
export const enum OutputType {
  ElementOutput,
  DirectiveOutput
}




/**
 * QueryValue类型
 */
export const enum QueryValueType {
  ElementRef = 0,
  RenderElement = 1,
  TemplateRef = 2,
  ViewContainerRef = 3,
  Provider = 4
}









/**
 * 元素定义
 */
export interface ElementDef {

  /**
   * ElementDef
   * set to null for `<ng-container>`
   * 如果是ng-container，这设置为null
   */
  name: string|null;

  /**
   * ns
   */
  ns: string|null;

  /**
   * attrs
   * Element的属性集合
   * ns, name, value
   * [
   *    [ns1, name1, value1],
   *    [ns2, name2, value2]
   * ]
   */
  attrs: [string, string, string][]|null;

  /**
   * ViewDefinition
   */
  template: ViewDefinition|null;

  /**
   * componentProvider
   */
  componentProvider: NodeDef|null;

  /**
   * componentRendererType
   */
  componentRendererType: RendererType2|null;

  /**
   * componentView
   */
  // closure to allow recursive components
  componentView: ViewDefinitionFactory|null;

  /**
   * publicProviders
   * visible public providers for DI in the view,
   * as see from this element. This does not include private providers.
   * 公共的Providers
   * {
   *  key1: NodeDef1,
   *  key2: NodeDef2
   * }
   */
  publicProviders: {[tokenKey: string]: NodeDef}|null;

  /**
   * allProviders
   * same as visiblePublicProviders, but also includes private providers
   * that are located on this element.
   * @summary
   * 和visiablePublicProviders一样，但是还包含了位于这个元素上的私有providers
   */
  allProviders: {[tokenKey: string]: NodeDef}|null;
  
  /**
   * handleEvent
   * component.ngFactory中生成出来的
   * <div click="doSomething()"></div>，用来描述click如何调用doSomething()
   */
  handleEvent: ElementHandleEventFn|null;
}


/**
 * 元素上的事件处理函数接口定义
 * view = 元素所在View的ViewData；
 * eventName = 事件名称；
 * event = 事件本身的信息？类似于event$???
 */
export interface ElementHandleEventFn {
  (view: ViewData, eventName: string, event: any): boolean;
}




export interface ProviderDef {
  
  /**
   * token
   */
  token: any;

  /**
   * value
   */
  value: any;

  /**
   * 这个Provider的依赖数组
   */
  deps: DepDef[];
}


/**
 * 模块的依赖
 * @summary
 * 1、？？？和ProviderDef的区别
 * 2、貌似多了个flags和 index两个属性；
 */
export interface NgModuleProviderDef {

  /**
   * 
   */
  flags: NodeFlags;

  /**
   * 
   */
  index: number;


  /**
   * token
   */
  token: any;

  /**
   * value
   */
  value: any;

  /**
   * 依赖数组
   */
  deps: DepDef[];
}


/**
 * DepDef
 * @summary
 * 1、依赖定义；
 */
export interface DepDef {
  flags: DepFlags;
  token: any;
  tokenKey: string;
}

/**
 * Bitmask for DI flags
 */
export const enum DepFlags {
  None = 0,
  SkipSelf = 1 << 0,
  Optional = 1 << 1,
  Value = 2 << 2,
}



export interface TextDef {
  prefix: string;
}


/**
 * QueryDef
 */
export interface QueryDef {

  id: number;

  // variant of the id that can be used to check against NodeDef.matchedQueryIds, ...
  filterId: number;

  /**
   * bindings
   */
  bindings: QueryBindingDef[];
}


/**
 * QueryBinding定义
 * 
 * @ViewChild('tpl', {})
 * publci tplRef TemplateRef
 * 
 * propName是tplRef？
 * bindingType是First
 * 
 * 
 */
export interface QueryBindingDef {

  /**
   * 属性名
   */
  propName: string;
  
  /**
   * 绑定类型
   */
  bindingType: QueryBindingType;
}

/**
 * QueryBinding类型
 * First：ViewChild、ContentChild等是这种类型；
 * All：ViewChildren、ContentChildren是这种类型；
 */
export const enum QueryBindingType {
  First = 0,
  All = 1
}



/**
 * 
 */
export interface NgContentDef {
  /**
   * this index is checked against NodeDef.ngContentIndex to find the nodes
   * that are matched by this ng-content.
   * Note that a NodeDef with an ng-content can be reprojected, i.e.
   * have a ngContentIndex on its own.
   */
  index: number;
}





































// ----------------------------------------------------------------------------------------------------------------------------------------------------
// Data
// ----------------------------------------------------------------------------------------------------------------------------------------------------


export interface NgModuleData extends Injector, NgModuleRef<any> {
  // Note: we are using the prefix _ as NgModuleData is an NgModuleRef and therefore directly
  // exposed to the user.
  _def: NgModuleDefinition;
  _parent: Injector;
  _providers: any[];
}








/**
 * View instance data.
 * Attention: Adding fields to this is performance sensitive!
 */
export interface ViewData {

  /**
   * def
   * ViewDefinition的引用
   */
  def: ViewDefinition;

  /**
   * 根rootData
   */
  root: RootData;
  
  /**
   * DOM渲染器
   */
  renderer: Renderer2;
  
  /**
   * ???
   * index of component provider / anchor.
   */
  parentNodeDef: NodeDef|null;
  
  /**
   * 父ViewData
   */
  parent: ViewData|null;
  
  /**
   * 所在的ViewContainer的ViewData
   */
  viewContainerParent: ViewData|null;

  /**
   * 对应的组件实例
   */
  component: any;
  
  /**
   * context
   */
  context: any;

  /**
   *  Attention: Never loop over this, as this will create a polymorphic usage site.
   * Instead: Always loop over ViewDefinition.nodes,
   * and call the right accessor (e.g. `elementData`) based on the NodeType.
   * 注意：不要迭代这个属性，因为这样会产生一个 polymorphic usage site（咋翻译？多态的使用点？）
   * 要用迭代ViewDefinition的nodes节点，并调用对应类型的的访问器
   */
  nodes: {[key: number]: NodeData};

  /**
   * state
   * 目前共8种状态
   * BeforeFirstCheck、FirstCheck
   * Attached、ChecksEnabled、Destroyed
   * IsProjectedView、CheckProjectedView、CheckProjectedViews
   */
  state: ViewState;

  /**
   * oldValues
   */
  oldValues: any[];

  /**
   * disposables
   */
  disposables: DisposableFn[]|null;
}






/**
 * Bitmask of states
 */
export const enum ViewState {
  BeforeFirstCheck = 1 << 0,
  FirstCheck = 1 << 1,
  Attached = 1 << 2,
  ChecksEnabled = 1 << 3,
  IsProjectedView = 1 << 4,
  CheckProjectedView = 1 << 5,
  CheckProjectedViews = 1 << 6,
  Destroyed = 1 << 7,

  CatDetectChanges = Attached | ChecksEnabled,
  CatInit = BeforeFirstCheck | CatDetectChanges
}

export interface DisposableFn { (): void; }

/**
 * Node instance data.
 * Node实例的Data
 * 
 * We have a separate type per NodeType to save memory
 * (TextData | ElementData | ProviderData | PureExpressionData | QueryList<any>)
 * 为了节省内存，我们为每个NodeType使用独立的type。
 *
 * To keep our code monomorphic,
 * we prohibit using `NodeData` directly but enforce the use of accessors (`asElementData`, ...).
 * This way, no usage site can get a `NodeData` from view.nodes and then use it for different
 * purposes.
 * 为了保持代码一直，我们禁止直接使用NodeData，强制大家使用具体类型NodeData的访问器（例如：asElementData）
 * 这样，就不会有地方通过view.nodes直接拿到一个NodeData，并用作其他用途。
 * 
 * 也就是说NodeData只是给angular内部完成特定功能而设计的，不能用作其他用途。
 */
export class NodeData {
  
  /**
   * _bran
   */
  private __brand: any;
}

/**
 * Data for an instantiated NodeType.Text.
 *
 * Attention: Adding fields to this is performance sensitive!
 */
export interface TextData {
  
  /**
   * 原生的DOM节点（Text）类型
   */
  renderText: any;
}

/**
 * Accessor for view.nodes, enforcing that every usage site stays monomorphic.
 */
export function asTextData(view: ViewData, index: number): TextData {
  return <any>view.nodes[index];
}

/**
 * Data for an instantiated NodeType.Element.
 *
 * Attention: Adding fields to this is performance sensitive!
 * 存储节点类型为NodeType.Element的数据结构
 * @summary
 * 处理方式类似NodeDef？？？
 * ElementData可能有多种类型，不同类型属性值不一样；
 * 比如 是ViewContainer时，viewContainer属性=ViewContainerData对象，其他属性为null。
 */
export interface ElementData {

  /**
   * renderElement
   * 原生的DOM节点（元素类型）
   */
  renderElement: any;

  /**
   * componentView
   */
  componentView: ViewData;

  /**
   * viewContainer
   */
  viewContainer: ViewContainerData|null;

  /**
   * templateData
   */
  template: TemplateData;
}


/**
 * ViewContainerData
 */
export interface ViewContainerData extends ViewContainerRef {
  // Note: we are using the prefix _ as ViewContainerData is a ViewContainerRef and therefore
  // directly
  // exposed to the user.
  _embeddedViews: ViewData[];
}



export interface TemplateData extends TemplateRef<any> {
  // views that have been created from the template
  // of this element,
  // but inserted into the embeddedViews of another element.
  // By default, this is undefined.
  // Note: we are using the prefix _ as TemplateData is a TemplateRef and therefore directly
  // exposed to the user.
  _projectedViews: ViewData[];
}


/**
 * Accessor for view.nodes, enforcing that every usage site stays monomorphic.
 */
export function asElementData(view: ViewData, index: number): ElementData {
  return <any>view.nodes[index];
}

/**
 * Data for an instantiated NodeType.Provider.
 *
 * Attention: Adding fields to this is performance sensitive!
 */
export interface ProviderData {
  instance: any;
}

/**
 * Accessor for view.nodes, enforcing that every usage site stays monomorphic.
 */
export function asProviderData(view: ViewData, index: number): ProviderData {
  return <any>view.nodes[index];
}

/**
 * Data for an instantiated NodeType.PureExpression.
 *
 * Attention: Adding fields to this is performance sensitive!
 */
export interface PureExpressionData { value: any; }

/**
 * Accessor for view.nodes, enforcing that every usage site stays monomorphic.
 */
export function asPureExpressionData(view: ViewData, index: number): PureExpressionData {
  return <any>view.nodes[index];
}

/**
 * Accessor for view.nodes, enforcing that every usage site stays monomorphic.
 */
export function asQueryList(view: ViewData, index: number): QueryList<any> {
  return <any>view.nodes[index];
}






/**
 * RootData
 */
export interface RootData {

  /**
   * injector
   */
  injector: Injector;
  
  /**
   * ngModule
   */
  ngModule: NgModuleRef<any>;

  /**
   * projectableNodes
   */
  projectableNodes: any[][];

  /**
   * selectorOrNode
   */
  selectorOrNode: any;

  /**
   * renderer
   */
  renderer: Renderer2;

  /**
   * rendererFactory
   */
  rendererFactory: RendererFactory2;

  /**
   * errorHandler
   */
  errorHandler: ErrorHandler;

  /**
   * sanitizer
   */
  sanitizer: Sanitizer;
}
























// --------------------------------------------------------------------------
// Services
// --------------------------------------------------------------------------


export abstract class DebugContext {
  abstract get view(): ViewData;
  abstract get nodeIndex(): number|null;
  abstract get injector(): Injector;
  abstract get component(): any;
  abstract get providerTokens(): any[];
  abstract get references(): {[key: string]: any};
  abstract get context(): any;
  abstract get componentRenderElement(): any;
  abstract get renderNode(): any;
  abstract logError(console: Console, ...values: any[]): void;
}

// -------------------------------------
// Other
// -------------------------------------

export const enum CheckType {CheckAndUpdate, CheckNoChanges}

export interface ProviderOverride {
  token: any;
  flags: NodeFlags;
  value: any;
  deps: ([DepFlags, any]|any)[];
  deprecatedBehavior: boolean;
}









export interface Services {
  setCurrentNode(view: ViewData, nodeIndex: number): void;
  createRootView(
      injector: Injector, projectableNodes: any[][], rootSelectorOrNode: string|any,
      def: ViewDefinition, ngModule: NgModuleRef<any>, context?: any): ViewData;
  createEmbeddedView(parent: ViewData, anchorDef: NodeDef, viewDef: ViewDefinition, context?: any):
      ViewData;
  createComponentView(
      parentView: ViewData, nodeDef: NodeDef, viewDef: ViewDefinition, hostElement: any): ViewData;
  createNgModuleRef(
      moduleType: Type<any>, parent: Injector, bootstrapComponents: Type<any>[],
      def: NgModuleDefinition): NgModuleRef<any>;
  overrideProvider(override: ProviderOverride): void;
  overrideComponentView(compType: Type<any>, compFactory: ComponentFactory<any>): void;
  clearOverrides(): void;
  checkAndUpdateView(view: ViewData): void;
  checkNoChangesView(view: ViewData): void;
  destroyView(view: ViewData): void;
  resolveDep(
      view: ViewData, elDef: NodeDef|null, allowPrivateServices: boolean, depDef: DepDef,
      notFoundValue?: any): any;
  createDebugContext(view: ViewData, nodeIndex: number): DebugContext;
  handleEvent: ViewHandleEventFn;
  updateDirectives: (view: ViewData, checkType: CheckType) => void;
  updateRenderer: (view: ViewData, checkType: CheckType) => void;
  dirtyParentQueries: (view: ViewData) => void;
}

/**
 * This object is used to prevent cycles in the source files and to have a place where
 * debug mode can hook it. It is lazily filled when `isDevMode` is known.
 */
export const Services: Services = {
  setCurrentNode: undefined !,
  createRootView: undefined !,
  createEmbeddedView: undefined !,
  createComponentView: undefined !,
  createNgModuleRef: undefined !,
  overrideProvider: undefined !,
  overrideComponentView: undefined !,
  clearOverrides: undefined !,
  checkAndUpdateView: undefined !,
  checkNoChangesView: undefined !,
  destroyView: undefined !,
  resolveDep: undefined !,
  createDebugContext: undefined !,
  handleEvent: undefined !,
  updateDirectives: undefined !,
  updateRenderer: undefined !,
  dirtyParentQueries: undefined !,
};
