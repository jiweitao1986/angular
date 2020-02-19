/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {LocationStrategy} from '@angular/common';
import {Attribute, Directive, ElementRef, HostBinding, HostListener, Input, OnChanges, OnDestroy, Renderer2, isDevMode} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';

import {QueryParamsHandling} from '../config';
import {NavigationEnd} from '../events';
import {Router} from '../router';
import {ActivatedRoute} from '../router_state';
import {UrlTree} from '../url_tree';

/**
 * @whatItDoes Lets you link to specific parts of your app.
 * 链接应用中特定的部分
 *
 * @howToUse
 *
 * Consider the following route configuration:
 * `[{ path: 'user/:name', component: UserCmp }]`
 *
 * When linking to this `user/:name` route, you can write:
 * `<a routerLink='/user/bob'>link to user component</a>`
 *
 * @description
 *
 * The RouterLink directives let you link to specific parts of your app.
 * RouterLink指令允许你链接到应用中特定的部分
 * 
 * When the link is static, you can use the directive as follows:
 * 当链接是静态的，你可以这样使用这个指令：
 * 
 * `<a routerLink="/user/bob">link to user component</a>`
 *
 * If you use dynamic values to generate the link, you can pass an array of path
 * segments, followed by the params for each segment.
 * 如果你使用动态的值来生成链接，你可以传递一个路径片段的数组
 *
 * For instance `['/team', teamId, 'user', userName, {details: true}]`
 * means that we want to generate a link to `/team/11/user/bob;details=true`.
 *
 * Multiple static segments can be merged into one
 * (e.g., `['/team/11/user', userName, {details: true}]`).
 * 多个静态片段可以被合并成一个
 * 
 * The first segment name can be prepended with `/`, `./`, or `../`:
 * 第一个片段的名称可以加 / ./ ../前缀
 * 
 * * If the first segment begins with `/`, the router will look up the route from the root of the
 *   app.
 * 当第一个segment以/开头时，router会从应用的根开始查找路由
 * 
 * * If the first segment begins with `./`, or doesn't begin with a slash, the router will
 *   instead look in the children of the current activated route.
 * 如果第一个segment以./开头，或者不是以/开头，router会在当前activated route的后代中查找
 * 
 * * And if the first segment begins with `../`, the router will go up one level.
 * 如果segment以../开头，router会从上一层开始查找。
 * 
 * You can set query params and fragment as follows:
 * 你可以按一下方式添加query params和fragment
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" fragment="education">
 *   link to user component
 * </a>
 * ```
 * RouterLink will use these to generate this link: `/user/bob#education?debug=true`.
 * RouterLink会用这些属性值产生类似于......的链接
 *
 * (Deprecated in v4.0.0 use `queryParamsHandling` instead) You can also tell the
 * directive to preserve the current query params and fragment:
 * 在angular4.0.0中queryParams和fragment已经被废弃。
 * 但你可以通过preserveQueryParams和preserveFragment属性告诉RouterLinker指令保留它们。
 * ```
 * <a [routerLink]="['/user/bob']" preserveQueryParams preserveFragment>
 *   link to user component
 * </a>
 * ```
 *
 * 你可以告诉指令如何处理queryParams，可选项包括以下
 * merge：合并queryParams到当前的queryParams中
 * preserve：保留当前的queryParams，不合并
 * 默认为
 * You can tell the directive to how to handle queryParams, available options are:
 *  - `'merge'`: merge the queryParams into the current queryParams
 *  - `'preserve'`: preserve the current queryParams
 *  - default/`''`: use the queryParams only
 *
 * Same options for {@link NavigationExtras#queryParamsHandling
 * NavigationExtras#queryParamsHandling}.
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" queryParamsHandling="merge">
 *   link to user component
 * </a>
 * ```
 *
 * The router link directive always treats the provided input as a delta to the current url.
 *
 * For instance, if the current url is `/user/(box//aux:team)`.
 *
 * Then the following link `<a [routerLink]="['/user/jim']">Jim</a>` will generate the link
 * `/user/(jim//aux:team)`.
 *
 * See {@link Router#createUrlTree createUrlTree} for more information.
 *
 * @ngModule RouterModule
 *
 * @stable
 */
@Directive({selector: ':not(a)[routerLink]'})
export class RouterLink {

  /**
   * queryParams：？后面的部分
   */
  @Input() queryParams: {[k: string]: any};

  /**
   * fragment: #后边的部分
   */
  @Input() fragment: string;

  /**
   * queryParamsHandling：queryParams合并策略
   */
  @Input() queryParamsHandling: QueryParamsHandling;

  /**
   * 是否保留Fragment
   */
  @Input() preserveFragment: boolean;

  /**
   * skipLocationChange ??????
   */
  @Input() skipLocationChange: boolean;

  /**
   * replaceUrl ??????
   */
  @Input() replaceUrl: boolean;

  /**
   * commands
   */
  private commands: any[] = [];

  /**
   * perserveQueryParams
   */
  private preserve: boolean;

  /**
   * 构造函数
   * @param router router对象
   * @param route ActivateRoute
   * @param tabIndex 
   * @param renderer Render2
   * @param el 当前元素
   */
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      @Attribute('tabindex') tabIndex: string,
      renderer: Renderer2,
      el: ElementRef
  ) {
    if (tabIndex == null) {
      renderer.setAttribute(el.nativeElement, 'tabindex', '0');
    }
  }

  /**
   * 通过routerLink属性写入commands，如果值时一个字符串，则将其放入数组中，组装成一个command数组
   */
  @Input()
  set routerLink(commands: any[]|string) {
    if (commands != null) {
      this.commands = Array.isArray(commands) ? commands : [commands];
    } else {
      this.commands = [];
    }
  }

  /**
   * @deprecated 4.0.0 use `queryParamsHandling` instead.
   * 在4.0.0版本中废弃，使用queryParamsHandling代替
   */
  @Input()
  set preserveQueryParams(value: boolean) {
    if (isDevMode() && <any>console && <any>console.warn) {
      console.warn('preserveQueryParams is deprecated!, use queryParamsHandling instead.');
    }
    this.preserve = value;
  }

  /**
   * 监听click事件，当用户点击时，调用navigateByUrl进行路由
   */
  @HostListener('click')
  onClick(): boolean {
    const extras = {
      skipLocationChange: attrBoolValue(this.skipLocationChange),
      replaceUrl: attrBoolValue(this.replaceUrl),
    };
    this.router.navigateByUrl(this.urlTree, extras);
    return true;
  }

  /**
   * 根据配置生成UrlTree
   */
  get urlTree(): UrlTree {
    return this.router.createUrlTree(this.commands, {
      relativeTo: this.route,
      queryParams: this.queryParams,
      fragment: this.fragment,
      preserveQueryParams: attrBoolValue(this.preserve),
      queryParamsHandling: this.queryParamsHandling,
      preserveFragment: attrBoolValue(this.preserveFragment),
    });
  }
}

/**
 * @whatItDoes Lets you link to specific parts of your app.
 *
 * See {@link RouterLink} for more information.
 *
 * @ngModule RouterModule
 *
 * @stable
 */
@Directive({selector: 'a[routerLink]'})
export class RouterLinkWithHref implements OnChanges, OnDestroy {
  @HostBinding('attr.target') @Input() target: string;
  @Input() queryParams: {[k: string]: any};
  @Input() fragment: string;
  @Input() queryParamsHandling: QueryParamsHandling;
  @Input() preserveFragment: boolean;
  @Input() skipLocationChange: boolean;
  @Input() replaceUrl: boolean;
  private commands: any[] = [];
  private subscription: Subscription;
  private preserve: boolean;

  // the url displayed on the anchor element.
  @HostBinding() href: string;

  constructor(
      private router: Router, private route: ActivatedRoute,
      private locationStrategy: LocationStrategy) {
    this.subscription = router.events.subscribe(s => {
      if (s instanceof NavigationEnd) {
        this.updateTargetUrlAndHref();
      }
    });
  }

  @Input()
  set routerLink(commands: any[]|string) {
    if (commands != null) {
      this.commands = Array.isArray(commands) ? commands : [commands];
    } else {
      this.commands = [];
    }
  }

  @Input()
  set preserveQueryParams(value: boolean) {
    if (isDevMode() && <any>console && <any>console.warn) {
      console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
    }
    this.preserve = value;
  }

  ngOnChanges(changes: {}): any { this.updateTargetUrlAndHref(); }
  ngOnDestroy(): any { this.subscription.unsubscribe(); }

  @HostListener('click', ['$event.button', '$event.ctrlKey', '$event.metaKey', '$event.shiftKey'])
  onClick(button: number, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean): boolean {
    if (button !== 0 || ctrlKey || metaKey || shiftKey) {
      return true;
    }

    if (typeof this.target === 'string' && this.target != '_self') {
      return true;
    }

    const extras = {
      skipLocationChange: attrBoolValue(this.skipLocationChange),
      replaceUrl: attrBoolValue(this.replaceUrl),
    };
    this.router.navigateByUrl(this.urlTree, extras);
    return false;
  }

  private updateTargetUrlAndHref(): void {
    this.href = this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.urlTree));
  }

  get urlTree(): UrlTree {
    return this.router.createUrlTree(this.commands, {
      relativeTo: this.route,
      queryParams: this.queryParams,
      fragment: this.fragment,
      preserveQueryParams: attrBoolValue(this.preserve),
      queryParamsHandling: this.queryParamsHandling,
      preserveFragment: attrBoolValue(this.preserveFragment),
    });
  }
}

function attrBoolValue(s: any): boolean {
  return s === '' || !!s;
}
