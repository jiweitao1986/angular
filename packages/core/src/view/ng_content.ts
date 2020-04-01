/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NodeDef, NodeFlags, ViewData} from './types';
import {RenderNodeAction, getParentRenderElement, visitProjectedRenderNodes} from './util';

/**
 * 创建NgContentDef（<ng-content></ng-template>）
 * @param ngContentIndex 啥作用？？？
 * @param index 
 * @summary
 * --------------------------------------------------------------------------------
 * 模板中的<ng-content></ng-content>会调用此方法创建对应类型的NodeDef
 * --------------------------------------------------------------------------------
 * <ng-content></ng-content>对应的NodeDef有如下特点：
 * 1、flags = NodeFlags.TypeNgContent
 * 2、ngContextIndex =
 * 3、ngContent = { index: 1}，这里的index，是在当前ViewDefinition中的索引，比如当前ViewDefainition中有多个<ng-content>，用index来标记他们的位置。
 * --------------------------------------------------------------------------------
 */
export function ngContentDef(ngContentIndex: null | number, index: number): NodeDef {


  return {
    // will bet set by the view definition
    nodeIndex: -1,
    parent: null,
    renderParent: null,
    bindingIndex: -1,
    outputIndex: -1,
    // regular values
    checkIndex: -1,
    flags: NodeFlags.TypeNgContent,
    childFlags: 0,
    directChildFlags: 0,
    childMatchedQueries: 0,
    matchedQueries: {},
    matchedQueryIds: 0,
    references: {},
    
    // ngContentIndex = null
    ngContentIndex,

    childCount: 0,
    bindings: [],
    bindingFlags: 0,
    outputs: [],
    element: null,
    provider: null,
    text: null,
    query: null,
    
    // index = 0
    ngContent: {
      index
    }
  };
}

export function appendNgContent(view: ViewData, renderHost: any, def: NodeDef) {
  const parentEl = getParentRenderElement(view, renderHost, def);
  if (!parentEl) {
    // Nothing to do if there is no parent element.
    return;
  }
  const ngContentIndex = def.ngContent !.index;
  visitProjectedRenderNodes(
      view, ngContentIndex, RenderNodeAction.AppendChild, parentEl, null, undefined);
}
