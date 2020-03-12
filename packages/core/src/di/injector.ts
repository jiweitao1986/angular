/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Type} from '../type';
import {stringify} from '../util';

import {resolveForwardRef} from './forward_ref';
import {InjectionToken} from './injection_token';
import {Inject, Optional, Self, SkipSelf} from './metadata';
import {ConstructorProvider, ExistingProvider, FactoryProvider, StaticClassProvider, StaticProvider, ValueProvider} from './provider';

const _THROW_IF_NOT_FOUND = new Object();
export const THROW_IF_NOT_FOUND = _THROW_IF_NOT_FOUND;

/**
 * _NullInjector
 */
class _NullInjector implements Injector {
  
  /**
   * get
   * @param token 
   * @param notFoundValue
   * @summary
   * notFoundValue的默认值为_THROW_IF_NOT_FOUND
   * 如果没有传递该参数，则会报错；
   * 如果传递了，则返回对应的值
   */
  get(token: any, notFoundValue: any = _THROW_IF_NOT_FOUND): any {
    if (notFoundValue === _THROW_IF_NOT_FOUND) {
      throw new Error(`NullInjectorError: No provider for ${stringify(token)}!`);
    }
    return notFoundValue;
  }
}

/**
 * @whatItDoes Injector interface
 * @howToUse
 * ```
 * const injector: Injector = ...;
 * injector.get(...);
 * ```
 *
 * @description
 * For more details, see the {@linkDocs guide/dependency-injection "Dependency Injection Guide"}.
 *
 * ### Example
 *
 * {@example core/di/ts/injector_spec.ts region='Injector'}
 *
 * `Injector` returns itself when given `Injector` as a token:
 * {@example core/di/ts/injector_spec.ts region='injectInjector'}
 *
 * @stable
 */
export abstract class Injector {

  //
  static THROW_IF_NOT_FOUND = _THROW_IF_NOT_FOUND;

  //
  static NULL: Injector = new _NullInjector();

  /**
   * 从注入器中获取一个实例
   * Retrieves an instance from the injector based on the provided token.
   * 
   * 如果找不到：
   * 如果notFoundValue没有设置，则抛出一个异常，否则返回notFoundValue

   * If not found:
   * - Throws an error if no `notFoundValue` that is not equal to
   * Injector.THROW_IF_NOT_FOUND is given
   * - Returns the `notFoundValue` otherwise
   */
  abstract get<T>(token: Type<T>|InjectionToken<T>, notFoundValue?: T): T;
  
  
  /**
   * 4.0后已废弃
   * @deprecated from v4.0.0 use Type<T> or InjectionToken<T>
   * @suppress {duplicate}
   */
  abstract get(token: any, notFoundValue?: any): any;

  /**
   * 创建一个用StaticProvider作为配置的注入器
   * Create a new Injector which is configure using `StaticProvider`s.
   *
   * ### Example
   *
   * {@example core/di/ts/provider_spec.ts region='ConstructorProvider'}
   */
  static create(providers: StaticProvider[], parent?: Injector): Injector {
    return new StaticInjector(providers, parent);
  }
}



const IDENT = function<T>(value: T): T {
  return value;
};

//
const EMPTY = <any[]>[];

//
const CIRCULAR = IDENT;

//
const MULTI_PROVIDER_FN = function(): any[] {
  return Array.prototype.slice.call(arguments);
};

//
const GET_PROPERTY_NAME = {} as any;

//
const USE_VALUE =
    getClosureSafeProperty<ValueProvider>({provide: String, useValue: GET_PROPERTY_NAME});

//
const NG_TOKEN_PATH = 'ngTokenPath';

//
const NG_TEMP_TOKEN_PATH = 'ngTempTokenPath';

//
const enum OptionFlags {
  Optional = 1 << 0,
  CheckSelf = 1 << 1,
  CheckParent = 1 << 2,
  Default = CheckSelf | CheckParent
}

//
const NULL_INJECTOR = Injector.NULL;

//
const NEW_LINE = /\n/gm;

//
const NO_NEW_LINE = 'ɵ';


/**
 * StaticInjector
 */
export class StaticInjector implements Injector {

  /**
   * 父注入器
   */
  readonly parent: Injector;

  /**
   * 
   */
  private _records: Map<any, Record>;


  /**
   * 
   * @param providers 
   * @param parent 
   */
  constructor(
    providers: StaticProvider[],
    parent: Injector = NULL_INJECTOR
) {
    this.parent = parent;
    const records = this._records = new Map<any, Record>();
    
    // 将this加入到Injector中，方便其他地方注入Injector
    records.set(
        Injector,
        <Record>{
          token: Injector,
          fn: IDENT,
          deps: EMPTY,
          value: this,
          useNew: false
        }
    );
    recursivelyProcessProviders(records, providers);
  }

  /**
   * 获取一个实例
   * @param token 
   * @param notFoundValue 
   */
  get<T>(token: Type<T>|InjectionToken<T>, notFoundValue?: T): T;
  get(token: any, notFoundValue?: any): any;
  get(token: any, notFoundValue?: any): any {
    const record = this._records.get(token);
    try {

      return tryResolveToken(
        token,
        record,
        this._records,
        this.parent,
        notFoundValue
      );

    } catch (e) {
      const tokenPath: any[] = e[NG_TEMP_TOKEN_PATH];
      e.message = formatError('\n' + e.message, tokenPath);
      e[NG_TOKEN_PATH] = tokenPath;
      e[NG_TEMP_TOKEN_PATH] = null;
      throw e;
    }
  }

  /**
   * toString
   */
  toString() {
    const tokens = <string[]>[], records = this._records;
    records.forEach((v, token) => tokens.push(stringify(token)));
    return `StaticInjector[${tokens.join(', ')}]`;
  }
}



/**
 * 支持的Provider类型
 */
type SupportedProvider =
    ValueProvider |
    ExistingProvider |
    StaticClassProvider |
    ConstructorProvider |
    FactoryProvider;


/**
 * Record
 * @summary
 * Record和Provider的关系
 * 1、Provider会转换为Record存储在Injector的_records属性里面；
 * 2、_records是个Map，key是个token，这个token是Provider的provide指定的值（注意处理forward_ref）;
 * 3、对于ValueAccessor，useValue的值=>Record.value
 * 4、对于FactoryAccessor，factory=>fn;
 * 5、对于StaticClassProvider， useClass=>fn
 */
interface Record {
  
  /**
   * 工厂方法
   * @summary
   */
  fn: Function;
  
  /**
   * 是否使用new操作符来创建实例
   * @summary
   * 1、如果是FactoryProvider，直接调用即可；
   * 2、如果是StaticClassProvider，则需要使用new操作符
   */
  useNew: boolean;
  
  /**
   * 所依赖的Record
   */
  deps: DependencyRecord[];
  
  /**
   * 值
   * @summary
   * 用于保存ValueProvider中的useValue指定的值。
   */
  value: any;
}


/**
 * DependencyRecord
 */
interface DependencyRecord {

  /**
   * 
   */
  token: any;

  /**
   * 
   */
  options: number;
}



type TokenPath = Array<any>;


/**
 * resolveProvider
 * @param provider 
 */
function resolveProvider(provider: SupportedProvider): Record {

  const deps = computeDeps(provider);

  let fn: Function = IDENT;

  let value: any = EMPTY;

  
  let useNew: boolean = false;
  let provide = resolveForwardRef(provider.provide);
  
  if (USE_VALUE in provider) {
    // We need to use USE_VALUE in provider since provider.useValue could be defined as undefined.
    value = (provider as ValueProvider).useValue;
  } else if ((provider as FactoryProvider).useFactory) {
    fn = (provider as FactoryProvider).useFactory;
  } else if ((provider as ExistingProvider).useExisting) {
    // Just use IDENT
  } else if ((provider as StaticClassProvider).useClass) {
    useNew = true;
    fn = resolveForwardRef((provider as StaticClassProvider).useClass);
  } else if (typeof provide == 'function') {
    useNew = true;
    fn = provide;
  } else {
    throw staticError(
        'StaticProvider does not have [useValue|useFactory|useExisting|useClass] or [provide] is not newable',
        provider);
  }
  
  // deps：当前这个provider对应的deps
  // fn: 应该是工厂方法，StaticClassProvider会包装一个fn；
  // useNew：是否创建新实例
  // value：用于ValueProvider。
  return {deps, fn, useNew, value};
}



function multiProviderMixError(token: any) {
  return staticError('Cannot mix multi providers and regular providers', token);
}


/**
 * 递归处理providers
 * @param records 
 * @param provider 
 * @summary
 * 将providers处理成records
 */
function recursivelyProcessProviders(
  records: Map<any, Record>,
  provider: StaticProvider
) {

  if (provider) {

    provider = resolveForwardRef(provider);

    if (provider instanceof Array) {
      // if we have an array recurse into the array
      for (let i = 0; i < provider.length; i++) {
        recursivelyProcessProviders(records, provider[i]);
      }
    } else if (typeof provider === 'function') {
      // Functions were supported in ReflectiveInjector, but are not here. For safety give useful
      // error messages
      throw staticError('Function/Class not supported', provider);
    } else if (provider && typeof provider === 'object' && provider.provide) {
      // At this point we have what looks like a provider: {provide: ?, ....}
      let token = resolveForwardRef(provider.provide);
      const resolvedProvider = resolveProvider(provider);


      if (provider.multi === true) {
        // This is a multi provider.
        let multiProvider: Record|undefined = records.get(token);
        if (multiProvider) {
          if (multiProvider.fn !== MULTI_PROVIDER_FN) {
            throw multiProviderMixError(token);
          }
        } else {
          // Create a placeholder factory which will look up the constituents of the multi provider.
          records.set(token, multiProvider = <Record>{
            token: provider.provide,
            deps: [],
            useNew: false,
            fn: MULTI_PROVIDER_FN,
            value: EMPTY
          });
        }
        // Treat the provider as the token.
        token = provider;
        multiProvider.deps.push({token, options: OptionFlags.Default});
      }


      const record = records.get(token);
      if (record && record.fn == MULTI_PROVIDER_FN) {
        throw multiProviderMixError(token);
      }
      records.set(token, resolvedProvider);
    } else {
      throw staticError('Unexpected provider', provider);
    }


  }
}


/**
 * 尝试处理Token
 * @param token 
 * @param record 
 * @param records 
 * @param parent 
 * @param notFoundValue 
 */
function tryResolveToken(
    token: any,
    record: Record | undefined,
    records: Map<any, Record>,
    parent: Injector,
    notFoundValue: any
): any {
  try {
    return resolveToken(token, record, records, parent, notFoundValue);
  } catch (e) {
    // ensure that 'e' is of type Error.
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    const path: any[] = e[NG_TEMP_TOKEN_PATH] = e[NG_TEMP_TOKEN_PATH] || [];
    path.unshift(token);
    if (record && record.value == CIRCULAR) {
      // Reset the Circular flag.
      record.value = EMPTY;
    }
    throw e;
  }
}


/**
 * 处理token
 * @param token 注入的token
 * @param record 已经存在的Record
 * @param records 所有的Records
 * @param parent 父Injector
 * @param notFoundValue 找不到token对应的值的默认返回值
 * @summary
 * 1、token
 */
function resolveToken(
    token: any,
    record: Record | undefined,
    records: Map<any, Record>,
    parent: Injector,
    notFoundValue: any
): any {
  let value;
  if (record) {
    
    // 如果在当前injector的records里
    // If we don't have a record, this implies that we don't own the provider hence don't know how
    // to resolve it.
    value = record.value;
    if (value == CIRCULAR) {
      
      // 循环依赖报错
      throw Error(NO_NEW_LINE + 'Circular dependency');
    } else if (value === EMPTY) {
      record.value = CIRCULAR;
      
      
      let obj = undefined;
      let useNew = record.useNew;
      let fn = record.fn;
      let depRecords = record.deps;
      
      // 递归Record的依赖，为这些依赖创建实例
      let deps = EMPTY;
      if (depRecords.length) {
        deps = [];
        for (let i = 0; i < depRecords.length; i++) {
          const depRecord: DependencyRecord = depRecords[i];
          const options = depRecord.options;
          const childRecord = options & OptionFlags.CheckSelf ? records.get(depRecord.token) : undefined;
          deps.push(tryResolveToken(
              // Current Token to resolve
              depRecord.token,
              // A record which describes how to resolve the token.
              // If undefined, this means we don't have such a record
              childRecord,
              // Other records we know about.
              records,
              
              // If we don't know how to resolve dependency and we should not check parent for it,
              // than pass in Null injector.
              !childRecord && !(options & OptionFlags.CheckParent) ? NULL_INJECTOR : parent,
              options & OptionFlags.Optional ? null : Injector.THROW_IF_NOT_FOUND));
        }
      }
      
      // 如果解决了，则将创建的实例赋值给Record的value属性
      record.value = value = useNew ? new (fn as any)(...deps) : fn.apply(obj, deps);
    }
  } else {
    
    /**
     * 如果record不存在，则到parent上获取
     */
    value = parent.get(token, notFoundValue);
  }
  return value;
}


/**
 * 计算依赖
 * @param provider
 */
function computeDeps(provider: StaticProvider): DependencyRecord[] {
  let deps: DependencyRecord[] = EMPTY;
  const providerDeps: any[] =
      (provider as ExistingProvider & StaticClassProvider & ConstructorProvider).deps;
  if (providerDeps && providerDeps.length) {
    deps = [];
    for (let i = 0; i < providerDeps.length; i++) {
      let options = OptionFlags.Default;
      let token = resolveForwardRef(providerDeps[i]);
      if (token instanceof Array) {
        for (let j = 0, annotations = token; j < annotations.length; j++) {
          const annotation = annotations[j];
          if (annotation instanceof Optional || annotation == Optional) {
            options = options | OptionFlags.Optional;
          } else if (annotation instanceof SkipSelf || annotation == SkipSelf) {
            options = options & ~OptionFlags.CheckSelf;
          } else if (annotation instanceof Self || annotation == Self) {
            options = options & ~OptionFlags.CheckParent;
          } else if (annotation instanceof Inject) {
            token = (annotation as Inject).token;
          } else {
            token = resolveForwardRef(annotation);
          }
        }
      }
      deps.push({token, options});
    }
  } else if ((provider as ExistingProvider).useExisting) {
    const token = resolveForwardRef((provider as ExistingProvider).useExisting);
    deps = [{token, options: OptionFlags.Default}];
  } else if (!providerDeps && !(USE_VALUE in provider)) {
    // useValue & useExisting are the only ones which are exempt from deps all others need it.
    throw staticError('\'deps\' required', provider);
  }
  return deps;
}


/**
 * 格式化错误信息
 * @param text
 * @param obj 
 */
function formatError(text: string, obj: any): string {
  text = text && text.charAt(0) === '\n' && text.charAt(1) == NO_NEW_LINE ? text.substr(2) : text;
  let context = stringify(obj);
  if (obj instanceof Array) {
    context = obj.map(stringify).join(' -> ');
  } else if (typeof obj === 'object') {
    let parts = <string[]>[];
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        let value = obj[key];
        parts.push(
            key + ':' + (typeof value === 'string' ? JSON.stringify(value) : stringify(value)));
      }
    }
    context = `{${parts.join(', ')}}`;
  }
  return `StaticInjectorError[${context}]: ${text.replace(NEW_LINE, '\n  ')}`;
}


/**
 * 静态错误
 * @param text 
 * @param obj 
 */
function staticError(text: string, obj: any): Error {
  return new Error(formatError(text, obj));
}


/**
 * 获取闭包安全的属性
 * @param objWithPropertyToExtract 
 */
function getClosureSafeProperty<T>(objWithPropertyToExtract: T): string {
  for (let key in objWithPropertyToExtract) {
    if (objWithPropertyToExtract[key] === GET_PROPERTY_NAME) {
      return key;
    }
  }
  throw Error('!prop');
}
