/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Subject} from 'rxjs/Subject';

/**
 * ----------------------------------------
 * 自定义事件
 * ----------------------------------------
 * 
 * Use by directives and components to emit custom Events.
 *
 * ### Examples
 *
 * In the following example, `Zippy` alternatively emits `open` and `close` events when its
 * title gets clicked:
 *
 * ```
 * @Component({
 *   selector: 'zippy',
 *   template: `
 *   <div class="zippy">
 *     <div (click)="toggle()">Toggle</div>
 *     <div [hidden]="!visible">
 *       <ng-content></ng-content>
 *     </div>
 *  </div>`})
 * export class Zippy {
 *   visible: boolean = true;
 *   @Output() open: EventEmitter<any> = new EventEmitter();
 *   @Output() close: EventEmitter<any> = new EventEmitter();
 *
 *   toggle() {
 *     this.visible = !this.visible;
 *     if (this.visible) {
 *       this.open.emit(null);
 *     } else {
 *       this.close.emit(null);
 *     }
 *   }
 * }
 * ```
 *
 * The events payload can be accessed by the parameter `$event` on the components output event
 * handler:
 *
 * ```
 * <zippy (open)="onOpen($event)" (close)="onClose($event)"></zippy>
 * ```
 *
 * Uses Rx.Observable but provides an adapter to make it work as specified here:
 * https://github.com/jhusain/observable-spec
 *
 * Once a reference implementation of the spec is available, switch to it.
 * @stable
 */
export class EventEmitter<T> extends Subject<T> {

  // TODO: mark this as internal once all the facades are gone
  // we can't mark it as internal now because EventEmitter exported via @angular/core would not
  // contain this property making it incompatible with all the code that uses EventEmitter via
  // facades, which are local to the code and do not have this property stripped.
  // tslint:disable-next-line
  __isAsync: boolean;

  /**
   * Creates an instance of {@link EventEmitter}, which depending on `isAsync`,
   * delivers events synchronously or asynchronously.
   *
   * @param isAsync By default, events are delivered synchronously (default value: `false`).
   * Set to `true` for asynchronous event delivery.
   */
  constructor(isAsync: boolean = false) {
    super();
    this.__isAsync = isAsync;
  }

  emit(value?: T) { super.next(value); }

  /**
   * 
   * @param generatorOrNext 事件订阅
   * @param error 
   * @param complete 
   */
  subscribe(generatorOrNext?: any, error?: any, complete?: any): any {

    let schedulerFn: (t: any) => any;
    let errorFn = (err: any): any => null;
    let completeFn = (): any => null;

    // 如果generatorOrNext是对象，则是一个generatior
    if (generatorOrNext && typeof generatorOrNext === 'object') {
      
      //schedulerFn
      schedulerFn = this.__isAsync ? (value: any) => {
        setTimeout(() => generatorOrNext.next(value));
      } : (value: any) => { generatorOrNext.next(value); };

      //errorFn
      if (generatorOrNext.error) {
        errorFn = this.__isAsync ? (err) => { setTimeout(() => generatorOrNext.error(err)); } :
                                   (err) => { generatorOrNext.error(err); };
      }

      //completeFn
      if (generatorOrNext.complete) {
        completeFn = this.__isAsync ? () => { setTimeout(() => generatorOrNext.complete()); } :
                                      () => { generatorOrNext.complete(); };
      }

    } else {

      // schedulerFn
      schedulerFn = this.__isAsync ? (value: any) => { setTimeout(() => generatorOrNext(value)); } :
                                     (value: any) => { generatorOrNext(value); };

      // errorFn
      if (error) {
        errorFn =
            this.__isAsync ? (err) => { setTimeout(() => error(err)); } : (err) => { error(err); };
      }

      // completeFn
      if (complete) {
        completeFn =
            this.__isAsync ? () => { setTimeout(() => complete()); } : () => { complete(); };
      }
    }

    return super.subscribe(schedulerFn, errorFn, completeFn);
  }
}
