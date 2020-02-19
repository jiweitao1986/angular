/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AbstractControl} from '../model';
import {AsyncValidator, AsyncValidatorFn, Validator, ValidatorFn} from './validators';

/**
 * 如果验证器是一个持有validate的对象，则提取它的validate方法作为验证器
 * @param validator 
 */
export function normalizeValidator(validator: ValidatorFn | Validator): ValidatorFn {
  if ((<Validator>validator).validate) {
    return (c: AbstractControl) => (<Validator>validator).validate(c);
  } else {
    return <ValidatorFn>validator;
  }
}

/**
 * normalizeAsyncValidator
 * @param validator 
 */
export function normalizeAsyncValidator(validator: AsyncValidatorFn | AsyncValidator):
    AsyncValidatorFn {
  if ((<AsyncValidator>validator).validate) {
    return (c: AbstractControl) => (<AsyncValidator>validator).validate(c);
  } else {
    return <AsyncValidatorFn>validator;
  }
}
