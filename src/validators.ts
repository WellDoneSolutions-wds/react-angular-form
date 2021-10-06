import { ModuleUtils} from './utils/lang';

import {forkJoin, from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {AsyncValidator, AsyncValidatorFn, ValidationErrors, Validator, ValidatorFn} from './directives/validators';
import {AbstractControl} from './model';

function isEmptyInputValue(value: any): boolean {
  return value == null || value.length === 0;
}

function hasValidLength(value: any): boolean {
  return value != null && typeof value.length === 'number';
}

const EMAIL_REGEXP =
    /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export class Validators {
  
  static min(min: number): ValidatorFn {
    return minValidator(min);
  }

  static max(max: number): ValidatorFn {
    return maxValidator(max);
  }

  static required(control: AbstractControl): ValidationErrors|null {
    return requiredValidator(control);
  }

  static requiredTrue(control: AbstractControl): ValidationErrors|null {
    return requiredTrueValidator(control);
  }

  static email(control: AbstractControl): ValidationErrors|null {
    return emailValidator(control);
  }

  static minLength(minLength: number): ValidatorFn {
    return minLengthValidator(minLength);
  }

  static maxLength(maxLength: number): ValidatorFn {
    return maxLengthValidator(maxLength);
  }

  static pattern(pattern: string|RegExp): ValidatorFn {
    return patternValidator(pattern);
  }

  static nullValidator(control: AbstractControl): ValidationErrors|null {
    return nullValidator(control);
  }

  static compose(validators: null): null;
  static compose(validators: (ValidatorFn|null|undefined)[]): ValidatorFn|null;
  static compose(validators: (ValidatorFn|null|undefined)[]|null): ValidatorFn|null {
    return compose(validators);
  }

  static composeAsync(validators: (AsyncValidatorFn|null)[]): AsyncValidatorFn|null {
    return composeAsync(validators);
  }
}

export function minValidator(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors|null => {
    if (isEmptyInputValue(control.value) || isEmptyInputValue(min)) {
      return null;  // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);

    return !isNaN(value) && value < min ? {'min': {'min': min, 'actual': control.value}} : null;
  };
}

export function maxValidator(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors|null => {
    if (isEmptyInputValue(control.value) || isEmptyInputValue(max)) {
      return null;  // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);

    return !isNaN(value) && value > max ? {'max': {'max': max, 'actual': control.value}} : null;
  };
}

export function requiredValidator(control: AbstractControl): ValidationErrors|null {
  return isEmptyInputValue(control.value) ? {'required': true} : null;
}

export function requiredTrueValidator(control: AbstractControl): ValidationErrors|null {
  return control.value === true ? null : {'required': true};
}

export function emailValidator(control: AbstractControl): ValidationErrors|null {
  if (isEmptyInputValue(control.value)) {
    return null;  // don't validate empty values to allow optional controls
  }
  return EMAIL_REGEXP.test(control.value) ? null : {'email': true};
}

export function minLengthValidator(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors|null => {
    if (isEmptyInputValue(control.value) || !hasValidLength(control.value)) {
      // don't validate empty values to allow optional controls
      // don't validate values without `length` property
      return null;
    }

    return control.value.length < minLength ?
        {'minlength': {'requiredLength': minLength, 'actualLength': control.value.length}} :
        null;
  };
}

/**
 * Validator that requires the length of the control's value to be less than or equal
 * to the provided maximum length. See `Validators.maxLength` for additional information.
 */
export function maxLengthValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors|null => {
    return hasValidLength(control.value) && control.value.length > maxLength ?
        {'maxlength': {'requiredLength': maxLength, 'actualLength': control.value.length}} :
        null;
  };
}

/**
 * Validator that requires the control's value to match a regex pattern.
 * See `Validators.pattern` for additional information.
 */
export function patternValidator(pattern: string|RegExp): ValidatorFn {
  if (!pattern) return nullValidator;
  let regex: RegExp;
  let regexStr: string;
  if (typeof pattern === 'string') {
    regexStr = '';

    if (pattern.charAt(0) !== '^') regexStr += '^';

    regexStr += pattern;

    if (pattern.charAt(pattern.length - 1) !== '$') regexStr += '$';

    regex = new RegExp(regexStr);
  } else {
    regexStr = pattern.toString();
    regex = pattern;
  }
  return (control: AbstractControl): ValidationErrors|null => {
    if (isEmptyInputValue(control.value)) {
      return null;  // don't validate empty values to allow optional controls
    }
    const value: string = control.value;
    return regex.test(value) ? null :
                               {'pattern': {'requiredPattern': regexStr, 'actualValue': value}};
  };
}

/**
 * Function that has `ValidatorFn` shape, but performs no operation.
 */
export function nullValidator(control: AbstractControl): ValidationErrors|null {
  return null;
}

function isPresent(o: any): boolean {
  return o != null;
}

export function toObservable(r: any): Observable<any> {
  const obs = ModuleUtils.isPromise(r) ? from(r) : r;
  if (!(ModuleUtils.isObservable(obs)) /* && (typeof ngDevMode === 'undefined' || ngDevMode)*/) {
    throw new Error(`Expected validator to return Promise or Observable.`);
  }
  return obs;
}

function mergeErrors(arrayOfErrors: (ValidationErrors|null)[]): ValidationErrors|null {
  let res: {[key: string]: any} = {};

  // Not using Array.reduce here due to a Chrome 80 bug
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1049982
  arrayOfErrors.forEach((errors: ValidationErrors|null) => {
    res = errors != null ? {...res!, ...errors} : res!;
  });

  return Object.keys(res).length === 0 ? null : res;
}

type GenericValidatorFn = (control: AbstractControl) => any;

function executeValidators<V extends GenericValidatorFn>(
    control: AbstractControl, validators: V[]): ReturnType<V>[] {
  return validators.map(validator => validator(control));
}

function isValidatorFn<V>(validator: V|Validator|AsyncValidator): validator is V {
  return !(validator as Validator).validate;
}

/**
 * Given the list of validators that may contain both functions as well as classes, return the list
 * of validator functions (convert validator classes into validator functions). This is needed to
 * have consistent structure in validators list before composing them.
 *
 * @param validators The set of validators that may contain validators both in plain function form
 *     as well as represented as a validator class.
 */
export function normalizeValidators<V>(validators: (V|Validator|AsyncValidator)[]): V[] {
  return validators.map(validator => {
    return isValidatorFn<V>(validator) ?
        validator :
        ((c: AbstractControl) => validator.validate(c)) as unknown as V;
  });
}

/**
 * Merges synchronous validators into a single validator function.
 * See `Validators.compose` for additional information.
 */
function compose(validators: (ValidatorFn|null|undefined)[]|null): ValidatorFn|null {
  if (!validators) return null;
  const presentValidators: ValidatorFn[] = validators.filter(isPresent) as any;
  if (presentValidators.length == 0) return null;

  return function(control: AbstractControl) {
    return mergeErrors(executeValidators<ValidatorFn>(control, presentValidators));
  };
}

/**
 * Accepts a list of validators of different possible shapes (`Validator` and `ValidatorFn`),
 * normalizes the list (converts everything to `ValidatorFn`) and merges them into a single
 * validator function.
 */
export function composeValidators(validators: Array<Validator|ValidatorFn>): ValidatorFn|null {
  return validators != null ? compose(normalizeValidators<ValidatorFn>(validators)) : null;
}

/**
 * Merges asynchronous validators into a single validator function.
 * See `Validators.composeAsync` for additional information.
 */
function composeAsync(validators: (AsyncValidatorFn|null)[]): AsyncValidatorFn|null {
  if (!validators) return null;
  const presentValidators: AsyncValidatorFn[] = validators.filter(isPresent) as any;
  if (presentValidators.length == 0) return null;

  return function(control: AbstractControl) {
    const observables =
        executeValidators<AsyncValidatorFn>(control, presentValidators).map(toObservable);
    return forkJoin(observables).pipe(map(mergeErrors));
  };
}

/**
 * Accepts a list of async validators of different possible shapes (`AsyncValidator` and
 * `AsyncValidatorFn`), normalizes the list (converts everything to `AsyncValidatorFn`) and merges
 * them into a single validator function.
 */
export function composeAsyncValidators(validators: Array<AsyncValidator|AsyncValidatorFn>):
    AsyncValidatorFn|null {
  return validators != null ? composeAsync(normalizeValidators<AsyncValidatorFn>(validators)) :
                              null;
}

/**
 * Merges raw control validators with a given directive validator and returns the combined list of
 * validators as an array.
 */
export function mergeValidators<V>(controlValidators: V|V[]|null, dirValidator: V): V[] {
  if (controlValidators === null) return [dirValidator];
  return Array.isArray(controlValidators) ? [...controlValidators, dirValidator] :
                                            [controlValidators, dirValidator];
}

/**
 * Retrieves the list of raw synchronous validators attached to a given control.
 */
export function getControlValidators(control: AbstractControl): ValidatorFn|ValidatorFn[]|null {
  return (control as any)._rawValidators as ValidatorFn | ValidatorFn[] | null;
}

/**
 * Retrieves the list of raw asynchronous validators attached to a given control.
 */
export function getControlAsyncValidators(control: AbstractControl): AsyncValidatorFn|
    AsyncValidatorFn[]|null {
  return (control as any)._rawAsyncValidators as AsyncValidatorFn | AsyncValidatorFn[] | null;
}

/**
 * Accepts a singleton validator, an array, or null, and returns an array type with the provided
 * validators.
 *
 * @param validators A validator, validators, or null.
 * @returns A validators array.
 */
export function makeValidatorsArray<T extends ValidatorFn|AsyncValidatorFn>(validators: T|T[]|
                                                                            null): T[] {
  if (!validators) return [];
  return Array.isArray(validators) ? validators : [validators];
}

/**
 * Determines whether a validator or validators array has a given validator.
 *
 * @param validators The validator or validators to compare against.
 * @param validator The validator to check.
 * @returns Whether the validator is present.
 */
export function hasValidator<T extends ValidatorFn|AsyncValidatorFn>(
    validators: T|T[]|null, validator: T): boolean {
  return Array.isArray(validators) ? validators.includes(validator) : validators === validator;
}

/**
 * Combines two arrays of validators into one. If duplicates are provided, only one will be added.
 *
 * @param validators The new validators.
 * @param currentValidators The base array of currrent validators.
 * @returns An array of validators.
 */
export function addValidators<T extends ValidatorFn|AsyncValidatorFn>(
    validators: T|T[], currentValidators: T|T[]|null): T[] {
  const current = makeValidatorsArray(currentValidators);
  const validatorsToAdd = makeValidatorsArray(validators);
  validatorsToAdd.forEach((v: T) => {
    // Note: if there are duplicate entries in the new validators array,
    // only the first one would be added to the current list of validarors.
    // Duplicate ones would be ignored since `hasValidator` would detect
    // the presence of a validator function and we update the current list in place.
    if (!hasValidator(current, v)) {
      current.push(v);
    }
  });
  return current;
}

export function removeValidators<T extends ValidatorFn|AsyncValidatorFn>(
    validators: T|T[], currentValidators: T|T[]|null): T[] {
  return makeValidatorsArray(currentValidators).filter(v => !hasValidator(validators, v));
}
