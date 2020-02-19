/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


/**
 * 树结构
 */
export class Tree<T> {
  /** @internal */
  _root: TreeNode<T>;

  /**
   * 构造函数
   * @param root 
   */
  constructor(root: TreeNode<T>) {
    this._root = root;
  }

  /**
   * 根节点的值
   */
  get root(): T {
    return this._root.value;
  }

  /**
   * 父节点的值
   * @internal
   */
  parent(t: T): T|null {
    const p = this.pathFromRoot(t);
    return p.length > 1 ? p[p.length - 2] : null;
  }

  /**
   * 子节点值集合
   * @internal
   */
  children(t: T): T[] {
    const n = findNode(t, this._root);
    return n ? n.children.map(t => t.value) : [];
  }

  /**
   * 第一个子节点的值
   * @internal
   */
  firstChild(t: T): T|null {
    const n = findNode(t, this._root);
    return n && n.children.length > 0 ? n.children[0].value : null;
  }

  /**
   * 兄弟节点的集合
   * @internal
   */
  siblings(t: T): T[] {
    const p = findPath(t, this._root);
    if (p.length < 2) return [];

    const c = p[p.length - 2].children.map(c => c.value);
    return c.filter(cc => cc !== t);
  }

  /**
   * 从当前节点到根节点路径上所有节点的值集合
   * @internal
   */
  pathFromRoot(t: T): T[] {
    return findPath(t, this._root).map(s => s.value);
  }
}


// DFS for the node matching the value
/**
 * 使用深度优先算法，根据节点的value查找对应节点
 * @param value 
 * @param node 
 */
function findNode<T>(value: T, node: TreeNode<T>): TreeNode<T>|null {
  if (value === node.value) return node;

  for (const child of node.children) {
    const node = findNode(value, child);
    if (node) return node;
  }

  return null;
}

/**
 * 从node开始向下
 */
// Return the path to the node with the given value using DFS
function findPath<T>(value: T, node: TreeNode<T>): TreeNode<T>[] {
  if (value === node.value) return [node];

  for (const child of node.children) {
    const path = findPath(value, child);
    if (path.length) {
      path.unshift(node);
      return path;
    }
  }

  return [];
}


/**
 * 树节点定义
 */
export class TreeNode<T> {

  /**
   * 构造函数
   * @param value 节点值
   * @param children 后代节点集合
   */
  constructor(
    public value: T,
    public children: TreeNode<T>[]
  ) {}

  /**
   * 节点的字符串表示
   */
  toString(): string {
    return `TreeNode(${this.value})`;
  }
}

// Return the list of T indexed by outlet name
export function nodeChildrenAsMap<T extends{outlet: string}>(node: TreeNode<T>| null) {
  const map: {[outlet: string]: TreeNode<T>} = {};

  if (node) {
    node.children.forEach(child => map[child.value.outlet] = child);
  }

  return map;
}