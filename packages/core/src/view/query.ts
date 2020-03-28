/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ElementRef} from '../linker/element_ref';
import {QueryList} from '../linker/query_list';

import {NodeDef, NodeFlags, QueryBindingDef, QueryBindingType, QueryDef, QueryValueType, ViewData, asElementData, asProviderData, asQueryList} from './types';
import {declaredViewContainer, filterQueryId, isEmbeddedView} from './util';

/**
 * 定义查询
 * @param flags 要查询的节点类型 
 * @param id id
 * @param bindings 查询结果绑定的属性 
 */
export function queryDef(
    flags: NodeFlags,
    id: number,
    bindings: {[propName: string]: QueryBindingType}
): NodeDef {

  // 组织QueryBindingDef[]
  let bindingDefs: QueryBindingDef[] = [];
  for (let propName in bindings) {
    const bindingType = bindings[propName];
    bindingDefs.push({propName, bindingType});
  }

  return {
    // will bet set by the view definition
    nodeIndex: -1,
    parent: null,
    renderParent: null,
    bindingIndex: -1,
    outputIndex: -1,
    // regular values
    // TODO(vicb): check
    checkIndex: -1, flags,
    childFlags: 0,
    directChildFlags: 0,
    childMatchedQueries: 0,
    ngContentIndex: -1,
    matchedQueries: {},
    matchedQueryIds: 0,
    references: {},
    childCount: 0,
    bindings: [],
    bindingFlags: 0,
    outputs: [],
    element: null,
    provider: null,
    text: null,

    // query是一个QueryDef
    query: {
      id,
      filterId: filterQueryId(id),
      bindings: bindingDefs
    },


    ngContent: null
  };
}


/**
 * 创建一个QueryList
 */
export function createQuery(): QueryList<any> {
  return new QueryList();
}


/**
 * 
 * @param view 
 */
export function dirtyParentQueries(view: ViewData) {
  const queryIds = view.def.nodeMatchedQueries;
  while (view.parent && isEmbeddedView(view)) {
    let tplDef = view.parentNodeDef !;
    view = view.parent;
    // content queries
    const end = tplDef.nodeIndex + tplDef.childCount;
    for (let i = 0; i <= end; i++) {
      const nodeDef = view.def.nodes[i];
      if ((nodeDef.flags & NodeFlags.TypeContentQuery) &&
          (nodeDef.flags & NodeFlags.DynamicQuery) &&
          (nodeDef.query !.filterId & queryIds) === nodeDef.query !.filterId) {
        asQueryList(view, i).setDirty();
      }
      if ((nodeDef.flags & NodeFlags.TypeElement && i + nodeDef.childCount < tplDef.nodeIndex) ||
          !(nodeDef.childFlags & NodeFlags.TypeContentQuery) ||
          !(nodeDef.childFlags & NodeFlags.DynamicQuery)) {
        // skip elements that don't contain the template element or no query.
        i += nodeDef.childCount;
      }
    }
  }

  // view queries
  if (view.def.nodeFlags & NodeFlags.TypeViewQuery) {
    for (let i = 0; i < view.def.nodes.length; i++) {
      const nodeDef = view.def.nodes[i];
      if ((nodeDef.flags & NodeFlags.TypeViewQuery) && (nodeDef.flags & NodeFlags.DynamicQuery)) {
        asQueryList(view, i).setDirty();
      }
      // only visit the root nodes
      i += nodeDef.childCount;
    }
  }
}




/**
 * 检查并更新Query
 * @param view 
 * @param nodeDef 
 */
export function checkAndUpdateQuery(view: ViewData, nodeDef: NodeDef) {
  const queryList = asQueryList(view, nodeDef.nodeIndex);
  if (!queryList.dirty) {
    return;
  }
  let directiveInstance: any;
  let newValues: any[] = undefined !;
  
  if (nodeDef.flags & NodeFlags.TypeContentQuery) {
    
    // 计算ContentQuery（ContentChild和ContentChildrend？？？）
    const elementDef = nodeDef.parent !.parent !;
    newValues = calcQueryValues(
        view, elementDef.nodeIndex, elementDef.nodeIndex + elementDef.childCount, nodeDef.query !,
        []);
    directiveInstance = asProviderData(view, nodeDef.parent !.nodeIndex).instance;
  } else if (nodeDef.flags & NodeFlags.TypeViewQuery) {

    // 计算ViewQuery（ViewChild和ViewChildren？？？）
    newValues = calcQueryValues(view, 0, view.def.nodes.length - 1, nodeDef.query !, []);
    directiveInstance = view.component;
  }


  queryList.reset(newValues);
  const bindings = nodeDef.query !.bindings;
  let notify = false;
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i];
    let boundValue: any;
    switch (binding.bindingType) {
      case QueryBindingType.First:
        boundValue = queryList.first;
        break;
      case QueryBindingType.All:
        boundValue = queryList;
        notify = true;
        break;
    }
    directiveInstance[binding.propName] = boundValue;
  }
  if (notify) {
    queryList.notifyOnChanges();
  }
}


/**
 * 计算QueryValues
 * @param view 
 * @param startIndex 
 * @param endIndex 
 * @param queryDef 
 * @param values 
 */
function calcQueryValues(
    view: ViewData,
    startIndex: number,
    endIndex: number,
    queryDef: QueryDef,
    values: any[]
): any[] {


  // 遍历ViewDefinition.nodes节点集合中startIndex和endIndex之间的nodeDef
  for (let i = startIndex; i <= endIndex; i++) {
    const nodeDef = view.def.nodes[i];

    // ？？？ matchedQueries是个啥？
    const valueType = nodeDef.matchedQueries[queryDef.id];
    if (valueType != null) {
      values.push(getQueryValue(view, nodeDef, valueType));
    }

    // 这个判断牛逼了
    // 1、节点是Element类型器；
    // 2、Element类型的NodeDef上的element属性指向一个ElementDef对象；
    // 3、ElementDef.template存在，说明了啥？？？
    // ElementDef.template是一个ViewDefinition，是当前元素对应的ViewDefinition
    if (
      nodeDef.flags & NodeFlags.TypeElement &&
      nodeDef.element !.template &&
      (nodeDef.element !.template !.nodeMatchedQueries & queryDef.filterId) === queryDef.filterId
    ) {
      
      // 找到这个NodeDef对应的ElementData，
      const elementData = asElementData(view, i);

      // 检查NodeDef上的childMatchedQueries和QueryDef是否匹配
      // 判断逻辑看不懂？？？
      // check embedded views that were attached at the place of their template,
      // but process child nodes first if some match the query (see issue #16568)
      if ((nodeDef.childMatchedQueries & queryDef.filterId) === queryDef.filterId) {
        calcQueryValues(view, i + 1, i + nodeDef.childCount, queryDef, values);
        i += nodeDef.childCount;
      }

      // 1、如果nodeDef是一个EmbeddedViews类型；
      // 2、则这个NodeDef关联了一个ElementData，ElementData关联了一个ViewContainerData；
      // 3、遍历ViewContainerData下的扩展views（这些views是ViewDefinition数组），对这些views进行递归遍历，继续计算
      if (nodeDef.flags & NodeFlags.EmbeddedViews) {
        const embeddedViews = elementData.viewContainer !._embeddedViews;
        for (let k = 0; k < embeddedViews.length; k++) {
          const embeddedView = embeddedViews[k];
          const dvc = declaredViewContainer(embeddedView);
          if (dvc && dvc === elementData) {
            calcQueryValues(embeddedView, 0, embeddedView.def.nodes.length - 1, queryDef, values);
          }
        }
      }

      // 如果ElementData上有_projectedViews属性值；
      // 说明了：NodeDef关联了一个ElementDef，该ElementDef关联了一个ElementData；
      // ElementData上关联了一个TempalteData；
      // 递归计算projectedViews
      const projectedViews = elementData.template._projectedViews;
      if (projectedViews) {
        for (let k = 0; k < projectedViews.length; k++) {
          const projectedView = projectedViews[k];
          calcQueryValues(projectedView, 0, projectedView.def.nodes.length - 1, queryDef, values);
        }
      }
    }

    // 跳过该NodeDef的后代节点？？？
    if ((nodeDef.childMatchedQueries & queryDef.filterId) !== queryDef.filterId) {
      // if no child matches the query, skip the children.
      i += nodeDef.childCount;
    }
  }

  return values;
}


/**
 * 
 * @param view 
 * @param nodeDef 
 * @param queryValueType （RenderElement、ElementRef）
 */
export function getQueryValue(
    view: ViewData,
    nodeDef: NodeDef,
    queryValueType: QueryValueType
): any {
  if (queryValueType != null) {
    // a match
    switch (queryValueType) {
      
      // 1、如果是RenderElement是查询原生的DOM元素
      // 2、根据nodeDef（ElementDef）的index，到viewData上去查找对应的ElementData；
      // 3、ElementData上的renderElement是原生的DOM元素
      case QueryValueType.RenderElement:
        return asElementData(view, nodeDef.nodeIndex).renderElement;

      // 1、和QueryValueType.RenderElement一样，先找到原生DOM元素；
      // 2、为这个DOM节点，new 一个 ElementRef；
      // 3、ElementRef非常简单，是对DOM Element 的一个简单包装
      case QueryValueType.ElementRef:
        return new ElementRef(asElementData(view, nodeDef.nodeIndex).renderElement);

      // 1、先查找对应的ElementData；
      // 2、返回ElementData上的tempalte（template是一个TemplateData类型）
      // 3、
      case QueryValueType.TemplateRef:
        return asElementData(view, nodeDef.nodeIndex).template;

      // 1、先在ViewData上查找对应的ElementData；
      // 2、然后返回ElementData的viewContainer属性（是一个ViewContainerData）、
      // 3、ViewContainerData很简单，只有一个属性，结构形如： { _embeddedViews: ViewData[]; }

      case QueryValueType.ViewContainerRef:
        return asElementData(view, nodeDef.nodeIndex).viewContainer;

      // 1、先根据nodeIndex查找ViewData的nodes中的ProviderData对象；
      // 2、将ProviderData的instance返回；
      // 3、该场景是支持ViewChild(XXXService)的场景？
      case QueryValueType.Provider:
        return asProviderData(view, nodeDef.nodeIndex).instance;
    }
  }
}
