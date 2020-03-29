/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {RendererType2} from '../render/api';
import {SecurityContext} from '../security';

import {BindingDef, BindingFlags, ElementData, ElementHandleEventFn, NodeDef, NodeFlags, OutputDef, OutputType, QueryValueType, ViewData, ViewDefinitionFactory, asElementData} from './types';
import {NOOP, calcBindingFlags, checkAndUpdateBinding, dispatchEvent, elementEventFullName, getParentRenderElement, resolveDefinition, resolveRendererType2, splitMatchedQueriesDsl, splitNamespace} from './util';



/**
 * anchorDef
 * @param flags 标志位=0
 * @param matchedQueriesDsl 二维数组，里面有模板变量，待进一步分析？？？
 * @param ngContentIndex = null ？？？，待进一步分析
 * @param childCount 
 * @param handleEvent 
 * @param templateFactory
 * @summary
 * 1、定义ng-template节点；
 * 2、ng-tempalte的内容，是一个单独的View；
 * 3、所以需要传入tempalte
 */
export function anchorDef(
    flags: NodeFlags,
    matchedQueriesDsl: null | [string | number, QueryValueType][],
    ngContentIndex: null | number,
    childCount: number,
    handleEvent?: null | ElementHandleEventFn,
    templateFactory?: ViewDefinitionFactory
): NodeDef {
  
  // 合并TypeElement，因为<ng-template></ng-tempalte>也是一个元素？？？
  flags |= NodeFlags.TypeElement;

  const {
    matchedQueries,
    references,
    matchedQueryIds
  } = splitMatchedQueriesDsl(matchedQueriesDsl);

  const template = templateFactory ? resolveDefinition(templateFactory) : null;

  // 返回的NodeDef有如下特点：
  // 1、flags = NodeFlags.TypeElement;
  // 2、element属性是一个ElementDef，他持有一个tempalte属性；
  // 3、template属性是一个ViewDefinition，它是<ng-tempalte></ng-tempalte>中间的内容的ViewDefinition。
  return {
    // will bet set by the view definition
    nodeIndex: -1,
    parent: null,
    renderParent: null,
    bindingIndex: -1,
    outputIndex: -1,
    // regular values
    flags,
    checkIndex: -1,
    childFlags: 0,
    directChildFlags: 0,
    childMatchedQueries: 0,
    matchedQueries,
    matchedQueryIds,
    references,
    ngContentIndex,
    childCount,
    bindings: [],
    bindingFlags: 0,
    outputs: [],
    element: {
      ns: null,
      name: null,
      attrs: null,
      template,
      componentProvider: null,
      componentView: null,
      componentRendererType: null,
      publicProviders: null,
      allProviders: null,
      handleEvent: handleEvent || NOOP
    },
    provider: null,
    text: null,
    query: null,
    ngContent: null
  };
}





/**
 * 定义Element
 * @params { number }    checkIndex        标记检查顺序的索引？？？
 * @params { NodeFlags } flags             元素状态
 * @params { Array }     matchedQueriesDsl
 * @params { number }    ngContentIndex    
 * @params { number }    childCount       子元素或者子节点？？？的数量
 * @params { string }    namespaceAndName 元素的命名空间和名称
 * @params {[string, string][]} fixedAttrs 属性数组，每个属性时一个数组，数组中第一个元素是属性名，第二个是属性值
 * @params bindings
 * @params outputs
 * @params handleEvent
 * @params componentView
 * @params componentRendererType
 */
export function elementDef(
    checkIndex: number,
    flags: NodeFlags,
    matchedQueriesDsl: null | [string | number, QueryValueType][],
    ngContentIndex: null | number,
    childCount: number,
    namespaceAndName: string | null,
    fixedAttrs: null | [string, string][] = [],
    bindings?: null | [BindingFlags, string, string | SecurityContext | null][],
    outputs?: null | ([string, string])[],
    handleEvent?: null | ElementHandleEventFn,
    componentView?: null | ViewDefinitionFactory,
    componentRendererType?: RendererType2 | null
): NodeDef {
  
  // handleEvent
  if (!handleEvent) {
    handleEvent = NOOP;
  }
  
  // matchedQueriesDsl
  const {
    matchedQueries,
    references,
    matchedQueryIds
  } = splitMatchedQueriesDsl(matchedQueriesDsl);
  
  // namespaceAndName
  let ns: string = null !;
  let name: string = null !;
  if (namespaceAndName) {
    [ns, name] = splitNamespace(namespaceAndName);
  }
  
  // bindings
  bindings = bindings || [];
  const bindingDefs: BindingDef[] = new Array(bindings.length);
  for (let i = 0; i < bindings.length; i++) {
    const [bindingFlags, namespaceAndName, suffixOrSecurityContext] = bindings[i];

    const [ns, name] = splitNamespace(namespaceAndName);
    let securityContext: SecurityContext = undefined !;
    let suffix: string = undefined !;
    switch (bindingFlags & BindingFlags.Types) {
      case BindingFlags.TypeElementStyle:
        suffix = <string>suffixOrSecurityContext;
        break;
      case BindingFlags.TypeElementAttribute:
      case BindingFlags.TypeProperty:
        securityContext = <SecurityContext>suffixOrSecurityContext;
        break;
    }
    bindingDefs[i] =
        {flags: bindingFlags, ns, name, nonMinifiedName: name, securityContext, suffix};
  }

  // outputs
  // 格式形如：
  // [
  //    [null, 'click']
   //]
  outputs = outputs || [];
  const outputDefs: OutputDef[] = new Array(outputs.length);
  for (let i = 0; i < outputs.length; i++) {
    const [target, eventName] = outputs[i];
    outputDefs[i] = {
      type: OutputType.ElementOutput,
      target: <any>target,
      eventName,
      propName: null
    };
  }

  // fixedAttrs
  fixedAttrs = fixedAttrs || [];
  const attrs = <[string, string, string][]>fixedAttrs.map(([namespaceAndName, value]) => {
    const [ns, name] = splitNamespace(namespaceAndName);
    return [ns, name, value];
  });

  // componentRendererType
  componentRendererType = resolveRendererType2(componentRendererType);
  if (componentView) {
    flags |= NodeFlags.ComponentView;
  }

  // flags
  flags |= NodeFlags.TypeElement;
 
 
  
  // 返回节点的有如下特点：
  // flags = NodeFlags.TypeElement
  // namespaceAndName = 标签名
  // element是一个ElementDef；
  // element.componentRendererType = 是调用了createRenderType函数，创建出来的；
  // element.componentView = 节点对应组件的ViewDefinitionFactory，注意不是HostViewDefinitionFactory;
  // 通过element.componentView和componentRendererType可以区分普通的Element还是组件Element
  // 
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

    ngContentIndex,
    childCount,
    bindings: bindingDefs,
    bindingFlags: calcBindingFlags(bindingDefs),
    outputs: outputDefs,
    element: {
      ns,
      name,
      attrs,
      template: null,
      // will bet set by the view definition
      componentProvider: null,
      componentView: componentView || null,
      componentRendererType: componentRendererType,
      publicProviders: null,
      allProviders: null,
      handleEvent: handleEvent || NOOP,
    },
    provider: null,
    text: null,
    query: null,
    ngContent: null
  };
}

/**
 * createElement
 * @param view 
 * @param renderHost 
 * @param def 
 */
export function createElement(view: ViewData, renderHost: any, def: NodeDef): ElementData {
  const elDef = def.element !;
  const rootSelectorOrNode = view.root.selectorOrNode;
  const renderer = view.renderer;
  let el: any;

  // 创建元素
  if (view.parent || !rootSelectorOrNode) {

    // 创建DOM元素
    if (elDef.name) {
      el = renderer.createElement(elDef.name, elDef.ns);
    } else {
      el = renderer.createComment('');
    }

    // 追加到父元素中
    const parentEl = getParentRenderElement(view, renderHost, def);
    if (parentEl) {
      renderer.appendChild(parentEl, el);
    }
  } else {
    el = renderer.selectRootElement(rootSelectorOrNode);
  }

  // 设置属性
  if (elDef.attrs) {
    for (let i = 0; i < elDef.attrs.length; i++) {
      const [ns, name, value] = elDef.attrs[i];
      renderer.setAttribute(el, name, value, ns);
    }
  }
  return el;
}




export function listenToElementOutputs(view: ViewData, compView: ViewData, def: NodeDef, el: any) {
  for (let i = 0; i < def.outputs.length; i++) {
    const output = def.outputs[i];
    const handleEventClosure = renderEventHandlerClosure(
        view, def.nodeIndex, elementEventFullName(output.target, output.eventName));
    let listenTarget: 'window'|'document'|'body'|'component'|null = output.target;
    let listenerView = view;
    if (output.target === 'component') {
      listenTarget = null;
      listenerView = compView;
    }
    const disposable =
        <any>listenerView.renderer.listen(listenTarget || el, output.eventName, handleEventClosure);
    view.disposables ![def.outputIndex + i] = disposable;
  }
}

function renderEventHandlerClosure(view: ViewData, index: number, eventName: string) {
  return (event: any) => dispatchEvent(view, index, eventName, event);
}


/**
 * 检查并更新元素
 * @param view 
 * @param def 
 */
export function checkAndUpdateElementInline(
    view: ViewData, def: NodeDef, v0: any, v1: any, v2: any, v3: any, v4: any, v5: any, v6: any,
    v7: any, v8: any, v9: any): boolean {
  const bindLen = def.bindings.length;
  let changed = false;
  if (bindLen > 0 && checkAndUpdateElementValue(view, def, 0, v0)) changed = true;
  if (bindLen > 1 && checkAndUpdateElementValue(view, def, 1, v1)) changed = true;
  if (bindLen > 2 && checkAndUpdateElementValue(view, def, 2, v2)) changed = true;
  if (bindLen > 3 && checkAndUpdateElementValue(view, def, 3, v3)) changed = true;
  if (bindLen > 4 && checkAndUpdateElementValue(view, def, 4, v4)) changed = true;
  if (bindLen > 5 && checkAndUpdateElementValue(view, def, 5, v5)) changed = true;
  if (bindLen > 6 && checkAndUpdateElementValue(view, def, 6, v6)) changed = true;
  if (bindLen > 7 && checkAndUpdateElementValue(view, def, 7, v7)) changed = true;
  if (bindLen > 8 && checkAndUpdateElementValue(view, def, 8, v8)) changed = true;
  if (bindLen > 9 && checkAndUpdateElementValue(view, def, 9, v9)) changed = true;
  return changed;
}

/**
 * checkAndUpdateElementDynamic
 * @param view 
 * @param def 
 * @param values 
 */
export function checkAndUpdateElementDynamic(view: ViewData, def: NodeDef, values: any[]): boolean {
  let changed = false;
  for (let i = 0; i < values.length; i++) {
    if (checkAndUpdateElementValue(view, def, i, values[i])) changed = true;
  }
  return changed;
}


/**
 * 更新Element元素
 * @param view 
 * @param def 
 * @param bindingIdx 
 * @param value 
 */
function checkAndUpdateElementValue(view: ViewData, def: NodeDef, bindingIdx: number, value: any) {
  if (!checkAndUpdateBinding(view, def, bindingIdx, value)) {
    return false;
  }
  const binding = def.bindings[bindingIdx];
  const elData = asElementData(view, def.nodeIndex);
  const renderNode = elData.renderElement;
  const name = binding.name !;


  switch (binding.flags & BindingFlags.Types) {
    
    // [attr.attr-name]="attrValue"的场景
    case BindingFlags.TypeElementAttribute:
      setElementAttribute(view, binding, renderNode, binding.ns, name, value);
      break;

    // [class.class-name]="true"的场景
    case BindingFlags.TypeElementClass:
      setElementClass(view, renderNode, name, value);
      break;
    
    // [style.style-name]="red"的场景
    case BindingFlags.TypeElementStyle:
      setElementStyle(view, binding, renderNode, name, value);
      break;

    // 这种是直接给DOM节点对象的属性赋值，不是html属性的值，DOM属性和HTML属性之间部分有映射，部分没有关系。
    case BindingFlags.TypeProperty:
      const bindView = 
        (def.flags & NodeFlags.ComponentView && binding.flags & BindingFlags.SyntheticHostProperty) ?
        elData.componentView : view;
      setElementProperty(bindView, binding, renderNode, name, value);
      break;
  }
  return true;
}

/**
 * 设置元素属性
 * @param view 
 * @param binding 
 * @param renderNode 
 * @param ns 
 * @param name 
 * @param value
 * @summary
 *  针对这种绑定 [attr.some-attr]="attrValue"
 * name=some-attr
 * value=attrValue
 * 
 */
function setElementAttribute(
    view: ViewData, binding: BindingDef, renderNode: any,
    ns: string | null, name: string, value: any
) {
  const securityContext = binding.securityContext;
  let renderValue = securityContext ? view.root.sanitizer.sanitize(securityContext, value) : value;
  renderValue = renderValue != null ? renderValue.toString() : null;
  const renderer = view.renderer;
  if (value != null) {
    renderer.setAttribute(renderNode, name, renderValue, ns);
  } else {
    renderer.removeAttribute(renderNode, name, ns);
  }
}

/**
 * 设置Class
 * @param view 
 * @param renderNode 
 * @param name 
 * @param value 
 * @summary
 * [class.some-class]="classValue"针对这种场景
 * name=some-class
 * value=classValue
 */
function setElementClass(view: ViewData, renderNode: any, name: string, value: boolean) {
  const renderer = view.renderer;
  if (value) {
    renderer.addClass(renderNode, name);
  } else {
    renderer.removeClass(renderNode, name);
  }
}

/**
 * 设置style
 * @param view ViewData
 * @param binding 
 * @param renderNode 
 * @param name 
 * @param value 
 * @summary
 * [style.color]="styleValue"
 * name=color
 * value=styleValue
 */
function setElementStyle(
    view: ViewData, binding: BindingDef, renderNode: any, name: string, value: any
) {
  let renderValue: string|null =
      view.root.sanitizer.sanitize(SecurityContext.STYLE, value as{} | string);
  if (renderValue != null) {
    renderValue = renderValue.toString();
    const unit = binding.suffix;
    if (unit != null) {
      renderValue = renderValue + unit;
    }
  } else {
    renderValue = null;
  }
  const renderer = view.renderer;
  if (renderValue != null) {
    renderer.setStyle(renderNode, name, renderValue);
  } else {
    renderer.removeStyle(renderNode, name);
  }
}

/**
 * 设置元素的属性值
 * @param view 
 * @param binding 
 * @param renderNode 
 * @param name 
 * @param value 
 */
function setElementProperty(
    view: ViewData, binding: BindingDef, renderNode: any, name: string, value: any
) {
  const securityContext = binding.securityContext;
  let renderValue = securityContext ?
    view.root.sanitizer.sanitize(securityContext, value) : value;

  // setProperty
  view.renderer.setProperty(renderNode, name, renderValue);
}
