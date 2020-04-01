/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectorRef, SimpleChange, SimpleChanges, WrappedValue} from '../change_detection/change_detection';
import {Injector, resolveForwardRef} from '../di';
import {ElementRef} from '../linker/element_ref';
import {TemplateRef} from '../linker/template_ref';
import {ViewContainerRef} from '../linker/view_container_ref';
import {Renderer as RendererV1, Renderer2} from '../render/api';

import {createChangeDetectorRef, createInjector, createRendererV1} from './refs';
import {BindingDef, BindingFlags, DepDef, DepFlags, NodeDef, NodeFlags, OutputDef, OutputType, ProviderData, QueryValueType, Services, ViewData, ViewFlags, ViewState, asElementData, asProviderData} from './types';
import {calcBindingFlags, checkBinding, dispatchEvent, isComponentView, splitDepsDsl, splitMatchedQueriesDsl, tokenKey, viewParentEl} from './util';





const RendererV1TokenKey = tokenKey(RendererV1);
const Renderer2TokenKey = tokenKey(Renderer2);
const ElementRefTokenKey = tokenKey(ElementRef);
const ViewContainerRefTokenKey = tokenKey(ViewContainerRef);
const TemplateRefTokenKey = tokenKey(TemplateRef);
const ChangeDetectorRefTokenKey = tokenKey(ChangeDetectorRef);
const InjectorRefTokenKey = tokenKey(Injector);




/**
 * DirectiveDef
 * @summary
 * --------------------------------------------------------------------------------
 * 使用场景
 * @Component({
 *  selector: ''
 *  template: '<app-child>'
 * })
 * class AppComponent {
 * }
 * @Component({
 *  selector: ''
 *  template: '<div>WelcomeComponent</div>'
 * })
 * class WelcomeComponent {
 * }
 * 
 * 针对WelcomeComponent，angular会创建两个ViewDefinition
 * 1、View_WelcomeComponent_0：它用来定义tempalte里面内容的的ViewDefinitionFactory；
 * 2、View_WelcomeComponent_Host_0：它用来定义组件自身的HostView（app-welcome）；
 * 3、这个HostViewFactory的作用，
 * --------------------------------------------------------------------------------
 * 
 * --------------------------------------------------------------------------------
 * 
 * 
 */
export function directiveDef(
    checkIndex: number,
    flags: NodeFlags,
    matchedQueries: null | [string | number, QueryValueType][],
    childCount: number,
    ctor: any,
    deps: ([DepFlags, any] | any)[],
    props?: null | {[name: string]: [number, string]},
    outputs?: null | {[name: string]: string}
): NodeDef {
  
  // 组织bindings
  const bindings: BindingDef[] = [];
  if (props) {
    for (let prop in props) {
      const [bindingIndex, nonMinifiedName] = props[prop];
      bindings[bindingIndex] = {
        flags: BindingFlags.TypeProperty,
        name: prop, nonMinifiedName,
        ns: null,
        securityContext: null,
        suffix: null
      };
    }
  }

  // 组织outputDefs
  const outputDefs: OutputDef[] = [];
  if (outputs) {
    for (let propName in outputs) {
      outputDefs.push({
        type: OutputType.DirectiveOutput,
        propName,
        target: null,
        eventName: outputs[propName]
      });
    }
  }
  
  // 设置NodeFlags
  flags |= NodeFlags.TypeDirective;
  
  // 返回Node定义
  return _def(
      checkIndex,
      flags,
      matchedQueries,
      childCount,
      ctor,
      ctor,
      deps,
      bindings,
      outputDefs
  );
}



/**
 * Pipe定义
 * @summary
 * 1、只是定义了一下NodeFlags；
 * 2、ctor = token = value
 */
export function pipeDef(
  flags: NodeFlags,
  ctor: any,
  deps: ([DepFlags, any] | any)[]
): NodeDef {
  flags |= NodeFlags.TypePipe;
  return _def(-1, flags, null, 0, ctor, ctor, deps);
}


/**
 * providerDef
 */
export function providerDef(
    flags: NodeFlags,
    matchedQueries: null | [string | number, QueryValueType][],
    token: any,
    value: any,
    deps: ([DepFlags, any] | any)[]
): NodeDef {
  return _def(-1, flags, matchedQueries, 0, token, value, deps);
}



export function _def(
    checkIndex: number,
    flags: NodeFlags,
    matchedQueriesDsl: [string | number, QueryValueType][] | null,
    childCount: number,
    token: any,
    value: any,
    deps: ([DepFlags, any] | any)[],
    bindings?: BindingDef[],
    outputs?: OutputDef[]
): NodeDef {

  // Query
  const {
    matchedQueries,
    references,
    matchedQueryIds
  } = splitMatchedQueriesDsl(matchedQueriesDsl);

  // Outputs
  if (!outputs) {
    outputs = [];
  }

  // Bindings
  if (!bindings) {
    bindings = [];
  }
  // Need to resolve forwardRefs as e.g. for `useValue` we
  // lowered the expression and then stopped evaluating it,
  // i.e. also didn't unwrap it.
  value = resolveForwardRef(value);

  const depDefs = splitDepsDsl(deps);

  return {
    // will bet set by the view definition
    nodeIndex: -1,
    parent: null,
    renderParent: null,
    bindingIndex: -1,
    outputIndex: -1,
    // regular values
    checkIndex,
    flags,
    childFlags: 0,
    directChildFlags: 0,
    childMatchedQueries: 0,
    matchedQueries,
    matchedQueryIds,
    references,
    ngContentIndex: -1,
    childCount,
    bindings,
    bindingFlags: calcBindingFlags(bindings),
    outputs,
    element: null,
    provider: {token, value, deps: depDefs},
    text: null,
    query: null,
    ngContent: null
  };
}





















export function createProviderInstance(view: ViewData, def: NodeDef): any {
  return _createProviderInstance(view, def);
}




export function createPipeInstance(view: ViewData, def: NodeDef): any {
  // deps are looked up from component.
  let compView = view;
  while (compView.parent && !isComponentView(compView)) {
    compView = compView.parent;
  }
  // pipes can see the private services of the component
  const allowPrivateServices = true;
  // pipes are always eager and classes!
  return createClass(
      compView.parent !,
      viewParentEl(compView) !,
      allowPrivateServices,
      def.provider !.value,
      def.provider !.deps
  );
}



export function createDirectiveInstance(view: ViewData, def: NodeDef): any {
  // components can see other private services, other directives can't.
  const allowPrivateServices = (def.flags & NodeFlags.Component) > 0;
  // directives are always eager and classes!
  const instance = createClass(
      view,
      def.parent !,
      allowPrivateServices,
      def.provider !.value,
      def.provider !.deps
  );
  if (def.outputs.length) {
    for (let i = 0; i < def.outputs.length; i++) {
      const output = def.outputs[i];
      const subscription = instance[output.propName !].subscribe(
          eventHandlerClosure(view, def.parent !.nodeIndex, output.eventName)
      );
      view.disposables ![def.outputIndex + i] = subscription.unsubscribe.bind(subscription);
    }
  }
  return instance;
}


function eventHandlerClosure(view: ViewData, index: number, eventName: string) {
  return (event: any) => dispatchEvent(view, index, eventName, event);
}





























export function checkAndUpdateDirectiveInline(
    view: ViewData, def: NodeDef, v0: any, v1: any, v2: any, v3: any, v4: any, v5: any, v6: any,
    v7: any, v8: any, v9: any): boolean {
  const providerData = asProviderData(view, def.nodeIndex);
  const directive = providerData.instance;
  let changed = false;
  let changes: SimpleChanges = undefined !;
  const bindLen = def.bindings.length;
  if (bindLen > 0 && checkBinding(view, def, 0, v0)) {
    changed = true;
    changes = updateProp(view, providerData, def, 0, v0, changes);
  }
  if (bindLen > 1 && checkBinding(view, def, 1, v1)) {
    changed = true;
    changes = updateProp(view, providerData, def, 1, v1, changes);
  }
  if (bindLen > 2 && checkBinding(view, def, 2, v2)) {
    changed = true;
    changes = updateProp(view, providerData, def, 2, v2, changes);
  }
  if (bindLen > 3 && checkBinding(view, def, 3, v3)) {
    changed = true;
    changes = updateProp(view, providerData, def, 3, v3, changes);
  }
  if (bindLen > 4 && checkBinding(view, def, 4, v4)) {
    changed = true;
    changes = updateProp(view, providerData, def, 4, v4, changes);
  }
  if (bindLen > 5 && checkBinding(view, def, 5, v5)) {
    changed = true;
    changes = updateProp(view, providerData, def, 5, v5, changes);
  }
  if (bindLen > 6 && checkBinding(view, def, 6, v6)) {
    changed = true;
    changes = updateProp(view, providerData, def, 6, v6, changes);
  }
  if (bindLen > 7 && checkBinding(view, def, 7, v7)) {
    changed = true;
    changes = updateProp(view, providerData, def, 7, v7, changes);
  }
  if (bindLen > 8 && checkBinding(view, def, 8, v8)) {
    changed = true;
    changes = updateProp(view, providerData, def, 8, v8, changes);
  }
  if (bindLen > 9 && checkBinding(view, def, 9, v9)) {
    changed = true;
    changes = updateProp(view, providerData, def, 9, v9, changes);
  }
  if (changes) {
    directive.ngOnChanges(changes);
  }
  if ((view.state & ViewState.FirstCheck) && (def.flags & NodeFlags.OnInit)) {
    directive.ngOnInit();
  }
  if (def.flags & NodeFlags.DoCheck) {
    directive.ngDoCheck();
  }
  return changed;
}

export function checkAndUpdateDirectiveDynamic(
    view: ViewData, def: NodeDef, values: any[]): boolean {
  const providerData = asProviderData(view, def.nodeIndex);
  const directive = providerData.instance;
  let changed = false;
  let changes: SimpleChanges = undefined !;
  for (let i = 0; i < values.length; i++) {
    if (checkBinding(view, def, i, values[i])) {
      changed = true;
      changes = updateProp(view, providerData, def, i, values[i], changes);
    }
  }
  if (changes) {
    directive.ngOnChanges(changes);
  }
  if ((view.state & ViewState.FirstCheck) && (def.flags & NodeFlags.OnInit)) {
    directive.ngOnInit();
  }
  if (def.flags & NodeFlags.DoCheck) {
    directive.ngDoCheck();
  }
  return changed;
}



















/**
 * 创建Provider实例
 * @param view 
 * @param def 
 */
function _createProviderInstance(view: ViewData, def: NodeDef): any {
  // private services can see other private services
  const allowPrivateServices = (def.flags & NodeFlags.PrivateProvider) > 0;
  const providerDef = def.provider;
  switch (def.flags & NodeFlags.Types) {
    case NodeFlags.TypeClassProvider:
      return createClass(
          view, def.parent !, allowPrivateServices, providerDef !.value, providerDef !.deps);
    case NodeFlags.TypeFactoryProvider:
      return callFactory(
          view, def.parent !, allowPrivateServices, providerDef !.value, providerDef !.deps);
    case NodeFlags.TypeUseExistingProvider:
      return resolveDep(view, def.parent !, allowPrivateServices, providerDef !.deps[0]);
    case NodeFlags.TypeValueProvider:
      return providerDef !.value;
  }
}


/**
 * 根据Class创建实例
 * @param view ViewData
 * @param elDef NodeDef
 * @param allowPrivateServices 是否允许PrivateServices
 * @param ctor 构造函数
 * @param deps 构造函数的依赖
 */
function createClass(
    view: ViewData, elDef: NodeDef, allowPrivateServices: boolean, ctor: any, deps: DepDef[]
): any {
  const len = deps.length;
  switch (len) {
    case 0:
      return new ctor();
    case 1:
      return new ctor(resolveDep(view, elDef, allowPrivateServices, deps[0]));
    case 2:
      return new ctor(
          resolveDep(view, elDef, allowPrivateServices, deps[0]),
          resolveDep(view, elDef, allowPrivateServices, deps[1]));
    case 3:
      return new ctor(
          resolveDep(view, elDef, allowPrivateServices, deps[0]),
          resolveDep(view, elDef, allowPrivateServices, deps[1]),
          resolveDep(view, elDef, allowPrivateServices, deps[2]));
    default:
      const depValues = new Array(len);
      for (let i = 0; i < len; i++) {
        depValues[i] = resolveDep(view, elDef, allowPrivateServices, deps[i]);
      }
      return new ctor(...depValues);
  }
}


/**
 * 根据Factory创建实例
 * @param view 
 * @param elDef 
 * @param allowPrivateServices 
 * @param factory 
 * @param deps 
 */
function callFactory(
    view: ViewData, elDef: NodeDef, allowPrivateServices: boolean, factory: any,
    deps: DepDef[]): any {
  const len = deps.length;
  switch (len) {
    case 0:
      return factory();
    case 1:
      return factory(resolveDep(view, elDef, allowPrivateServices, deps[0]));
    case 2:
      return factory(
          resolveDep(view, elDef, allowPrivateServices, deps[0]),
          resolveDep(view, elDef, allowPrivateServices, deps[1]));
    case 3:
      return factory(
          resolveDep(view, elDef, allowPrivateServices, deps[0]),
          resolveDep(view, elDef, allowPrivateServices, deps[1]),
          resolveDep(view, elDef, allowPrivateServices, deps[2]));
    default:
      const depValues = Array(len);
      for (let i = 0; i < len; i++) {
        depValues[i] = resolveDep(view, elDef, allowPrivateServices, deps[i]);
      }
      return factory(...depValues);
  }
}

// This default value is when checking the hierarchy for a token.
//
// It means both:
// - the token is not provided by the current injector,
// - only the element injectors should be checked (ie do not check module injectors
//
//          mod1
//         /
//       el1   mod2
//         \  /
//         el2
//
// When requesting el2.injector.get(token), we should check in the following order and return the
// first found value:
// - el2.injector.get(token, default)
// - el1.injector.get(token, NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR) -> do not check the module
// - mod2.injector.get(token, default)
export const NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR = {};





















/**
 * ！！！！！！！！！！！！！！！！！！！
 * 重要，处理组件的注入查找
 * ！！！！！！！！！！！！！！！！！！！
 * 处理依赖
 * @param view ViewData
 * @param elDef 是一个NodeDef，具体包含哪些？
 * @param allowPrivateServices 是否允许私有服务，只有NodeFlags.ComponentView的时候才有；
 * @param depDef 依赖定义
 * @param notFoundValue 默认空值
 */
export function resolveDep(
    view: ViewData,
    elDef: NodeDef,
    allowPrivateServices: boolean,
    depDef: DepDef,
    notFoundValue: any = Injector.THROW_IF_NOT_FOUND
): any {
  
  // DepFlags：Node、SkipSelf、Optional、Value
  if (depDef.flags & DepFlags.Value) {
    return depDef.token;
  }
  
  // 用初始的ViewData作为startView
  const startView = view;

  // 如果允许Optional，则找不到时默认返回null
  if (depDef.flags & DepFlags.Optional) {
    notFoundValue = null;
  }

  
  // 如果
  const tokenKey = depDef.tokenKey;
  if (tokenKey === ChangeDetectorRefTokenKey) {
    // directives on the same element as a component should be able to control the change detector
    // of that component as well.
    allowPrivateServices = !!(elDef && elDef.element !.componentView);
  }

  // 如果设置了SkipSelf，则使用父NodeDef
  if (elDef && (depDef.flags & DepFlags.SkipSelf)) {
    allowPrivateServices = false;
    elDef = elDef.parent !;
  }

  while (view) {
    if (elDef) {
      switch (tokenKey) {
        case RendererV1TokenKey: {
          
          // 处理RendererV1
          const compView = findCompView(view, elDef, allowPrivateServices);
          return createRendererV1(compView);
        }
        case Renderer2TokenKey: {
          
          // 处理Renderer2
          const compView = findCompView(view, elDef, allowPrivateServices);
          return compView.renderer;
        }
        case ElementRefTokenKey:
          
          // 处理ElementRef
          return new ElementRef(asElementData(view, elDef.nodeIndex).renderElement);
        case ViewContainerRefTokenKey:
          
          // 处理ViewContainerRef
          return asElementData(view, elDef.nodeIndex).viewContainer;
        case TemplateRefTokenKey: {
          
          // 处理TemplateRef
          if (elDef.element !.template) {
            return asElementData(view, elDef.nodeIndex).template;
          }
          break;
        }
        case ChangeDetectorRefTokenKey: {
          
          // 处理ChangeDetectorRef
          let cdView = findCompView(view, elDef, allowPrivateServices);
          return createChangeDetectorRef(cdView);
        }
        case InjectorRefTokenKey:
          
          // 处理Injector
          return createInjector(view, elDef);
        default:
          
          // 其他场景
          // 如果allowPrivateServcies=ture，使用allProviders;
          // 如果allowPrivateServcies=false,使用publicProviders;
          const providerDef =
              (allowPrivateServices ? elDef.element !.allProviders :
                                      elDef.element !.publicProviders) ![tokenKey];
          if (providerDef) {
            let providerData = asProviderData(view, providerDef.nodeIndex);
            if (!providerData) {
              providerData = {
                instance: _createProviderInstance(view, providerDef)
              };
              view.nodes[providerDef.nodeIndex] = providerData as any;
            }
            return providerData.instance;
          }
      }
    }
    
    // 如果elDef（NodeDef）不存在，则继续向上遍历
    allowPrivateServices = isComponentView(view);
    elDef = viewParentEl(view) !;
    view = view.parent !;
  }

  // 如果上述过程找不到，则在RootData的injector上查找
  const value = startView.root.injector.get(depDef.token, NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR);

  // 如果只允许在ElementInjector上查找，则返回了
  if (value !== NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR ||
      notFoundValue === NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR) {
    // Return the value from the root element injector when
    // - it provides it
    //   (value !== NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR)
    // - the module injector should not be checked
    //   (notFoundValue === NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR)
    return value;
  }

  // 如果允许继续查找，转到模块的injector上查找
  return startView.root.ngModule.injector.get(depDef.token, notFoundValue);
}


/**
 * 查找ComponentView
 * @param view 
 * @param elDef 
 * @param allowPrivateServices 
 */
function findCompView(view: ViewData, elDef: NodeDef, allowPrivateServices: boolean) {
  let compView: ViewData;
  if (allowPrivateServices) {

    // 根据elDef（NodeDef）的nodeIndex，在view(ViewData)的nodes（NodeData数组）里找到对应的NodeData；
    // allowPrivateServices=true，  确定该NodeData，肯定是一个ElementData，上面有一个componentView属性（ViewData）
    compView = asElementData(view, elDef.nodeIndex).componentView;
  } else {
    
    // 如果不是ComponentView，则继续向上查找
    compView = view;
    while (compView.parent && !isComponentView(compView)) {
      compView = compView.parent;
    }
  }
  return compView;
}







































function updateProp(
    view: ViewData,
    providerData: ProviderData,
    def: NodeDef,
    bindingIdx: number,
    value: any,
    changes: SimpleChanges
): SimpleChanges {

  // ？？？ 什么样的节点的Nodeflags是Component? 是HostView这种node吗？类似于<app-xxx></app-xxx>这种标签对应的元素的Node
  // 如果前档节点采用了OnPush方式，此时它的ChecksEnabled没有设置，这里要打开这个标志，进行一次检测（Input变化的时候，对OnPush的也要进行一次检测）
  if (def.flags & NodeFlags.Component) {
    const compView = asElementData(view, def.parent !.nodeIndex).componentView;
    if (compView.def.flags & ViewFlags.OnPush) {
      compView.state |= ViewState.ChecksEnabled;
    }
  }

  // 获取属性名
  const binding = def.bindings[bindingIdx];
  const propName = binding.name !;


  // 通过providerData找到对应的 Instance（ComponentInstance、DirectiveInstance），并赋上最新的值；
  // Note: This is still safe with Closure Compiler as
  // the user passed in the property name as an object has to `providerDef`,
  // so Closure Compiler will have renamed the property correctly already.
  providerData.instance[propName] = value;

  // 检查是否有OnChanges钩子
  if (def.flags & NodeFlags.OnChanges) {
    changes = changes || {};
    
    // 获取旧值，注意这里的计算index的方式
    let oldValue = view.oldValues[def.bindingIndex + bindingIdx];
    if (oldValue instanceof WrappedValue) {
      oldValue = oldValue.wrapped;
    }

    // 前边不是获取了一次binding了吗？怎么还要获取一次？？？
    const binding = def.bindings[bindingIdx];
    
    // 将这次变化组织为一个SimpleChanges，放到changes中
    changes[binding.nonMinifiedName !] =
        new SimpleChange(oldValue, value, (view.state & ViewState.FirstCheck) !== 0);
  }
  
  // 老的值已经利用完了（用来生成SimpleChange），将当前值跟您到oldValues里面
  view.oldValues[def.bindingIndex + bindingIdx] = value;

  // 返回changes
  return changes;
}



















/**
 * 声明周期钩子调用
 * @param view 当前View的ViewData
 * @param lifecycles 要调用的声明周期钩子
 */
export function callLifecycleHooksChildrenFirst(view: ViewData, lifecycles: NodeFlags) {
  
  // 1、ViewDefinition会归集所有子节点的NodeFlags到自己的NodeFlags上；
  // 2、在调用父的生命周期钩子之前，先检查父的NodeFlag上，来判断后代节点是否有该Liecyles；
  // 3、如果没有，则提前退出，来提高性能
  if (!(view.def.nodeFlags & lifecycles)) {
    return;
  }
  
  const nodes = view.def.nodes;
  for (let i = 0; i < nodes.length; i++) {
    const nodeDef = nodes[i];
    let parent = nodeDef.parent;

    // 如果parent不存在，但声明周期钩子存在，则直接调用
    if (!parent && nodeDef.flags & lifecycles) {
      // matching root node (e.g. a pipe)
      callProviderLifecycles(view, i, nodeDef.flags & lifecycles);
    }

    // 如果存在下级节点，跳过所有下级节点
    if ((nodeDef.childFlags & lifecycles) === 0) {
      // no child matches one of the lifecycles
      i += nodeDef.childCount;
    }

    // ？？？此处逻辑待进一步跟踪，调用父节点对应的lifecyles？？？
    // 1、如果parnet存在；
    // 2、parent是TypeElement类型；
    // 3、??? 当前节点的索引=父节点索引+父节点所有自己节点个数，啥意思？判断当前节点是不是父节点的最后一个节点吗？
    while (
      parent &&
      (parent.flags & NodeFlags.TypeElement) &&
      i === parent.nodeIndex + parent.childCount
    ) {
      // last child of an element
      if (parent.directChildFlags & lifecycles) {
        callElementProvidersLifecycles(view, parent, lifecycles);
      }
      parent = parent.parent;
    }
  }
}

/**
 * 调用elDef上所有子节点及其子节点的声明周期钩子
 * @param view 
 * @param elDef 
 * @param lifecycles 
 * @summary
 * 1、从for循环的是方式上看，elDef和它下面的子节点，都在当一个ViewDef内；
 * 2、循环的时候，从elDef开始，加上elDef.childCount结束；
 */
function callElementProvidersLifecycles(view: ViewData, elDef: NodeDef, lifecycles: NodeFlags) {
  for (let i = elDef.nodeIndex + 1; i <= elDef.nodeIndex + elDef.childCount; i++) {
    const nodeDef = view.def.nodes[i];
    if (nodeDef.flags & lifecycles) {
      callProviderLifecycles(view, i, nodeDef.flags & lifecycles);
    }
    // only visit direct children
    i += nodeDef.childCount;
  }
}

/**
 * 调用声明周期钩子函数
 * @param view ViewData
 * @param index nodeIndex
 * @param lifecycles 构造
 */
function callProviderLifecycles(view: ViewData, index: number, lifecycles: NodeFlags) {
  const providerData = asProviderData(view, index);
  if (!providerData) {
    return;
  }
  const provider = providerData.instance;
  if (!provider) {
    return;
  }
  Services.setCurrentNode(view, index);
  if (lifecycles & NodeFlags.AfterContentInit) {
    provider.ngAfterContentInit();
  }
  if (lifecycles & NodeFlags.AfterContentChecked) {
    provider.ngAfterContentChecked();
  }
  if (lifecycles & NodeFlags.AfterViewInit) {
    provider.ngAfterViewInit();
  }
  if (lifecycles & NodeFlags.AfterViewChecked) {
    provider.ngAfterViewChecked();
  }
  if (lifecycles & NodeFlags.OnDestroy) {
    provider.ngOnDestroy();
  }
}
