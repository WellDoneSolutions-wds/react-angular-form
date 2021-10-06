import {Observable} from 'rxjs';

import {AbstractControl} from '../model';
import {emailValidator, maxLengthValidator, maxValidator, minLengthValidator, minValidator, nullValidator, patternValidator, requiredTrueValidator, requiredValidator} from '../validators';


function toNumber(value: string|number): number {
  return typeof value === 'number' ? value : parseInt(value, 10);
}

export type ValidationErrors = {
  [key: string]: any
};


export interface Validator {

  validate(control: AbstractControl): ValidationErrors|null;


  registerOnValidatorChange?(fn: () => void): void;
}

abstract class AbstractValidatorDirective implements Validator {
  private _validator: ValidatorFn = nullValidator;
  private _onChange!: () => void;

  abstract inputName: string;

  
  abstract createValidator(input: unknown): ValidatorFn;

  
  abstract normalizeInput(input: unknown): unknown;

  handleChanges(changes: any): void {
    if (this.inputName in changes) {
      const input = this.normalizeInput(changes[this.inputName].currentValue);
      this._validator = this.createValidator(input);
      if (this._onChange) {
        this._onChange();
      }
    }
  }

  validate(control: AbstractControl): ValidationErrors|null {
    return this._validator(control);
  }

  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}


export class MaxValidator extends AbstractValidatorDirective {

  max!: string|number;
  /** @internal */

  inputName = 'max';

 normalizeInput = (input: string): number => parseFloat(input);
  

 createValidator = (max: number): ValidatorFn => maxValidator(max);

  ngOnChanges(changes: any): void {
    this.handleChanges(changes);
  }
}

/**
 * @description
 * Provider which adds `MinValidator` to the `NG_VALIDATORS` multi-provider list.
 */

/**
 * A directive which installs the {@link MinValidator} for any `formControlName`,
 * `formControl`, or control with `ngModel` that also has a `min` attribute.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding a min validator
 *
 * The following example shows how to add a min validator to an input attached to an
 * ngModel binding.
 *
 * ```html
 * <input type="number" ngModel min="4">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
export class MinValidator extends AbstractValidatorDirective {
  /**
   * @description
   * Tracks changes to the min bound to this directive.
   */
  min!: string|number;
  /** @internal */
  // override inputName = 'min';
   inputName = 'min';
 
  /** @internal */
  // override normalizeInput = (input: string): number => parseFloat(input);
   normalizeInput = (input: string): number => parseFloat(input);
  
  /** @internal */
  // override createValidator = (min: number): ValidatorFn => minValidator(min);
  createValidator = (min: number): ValidatorFn => minValidator(min);
  
  /**
   * Declare `ngOnChanges` lifecycle hook at the main directive level (vs keeping it in base class)
   * to avoid differences in handling inheritance of lifecycle hooks between Ivy and ViewEngine in
   * AOT mode. This could be refactored once ViewEngine is removed.
   * @nodoc
   */
  ngOnChanges(changes: any): void {
    this.handleChanges(changes);
  }
}

/**
 * @description
 * An interface implemented by classes that perform asynchronous validation.
 *
 * @usageNotes
 *
 * ### Provide a custom async validator directive
 *
 * The following example implements the `AsyncValidator` interface to create an
 * async validator directive with a custom error key.
 *
 * ```typescript
 * import { of } from 'rxjs';
 *
 * @Directive({
 *   selector: '[customAsyncValidator]',
 *   providers: [{provide: NG_ASYNC_VALIDATORS, useExisting: CustomAsyncValidatorDirective, multi:
 * true}]
 * })
 * class CustomAsyncValidatorDirective implements AsyncValidator {
 *   validate(control: AbstractControl): Observable<ValidationErrors|null> {
 *     return of({'custom': true});
 *   }
 * }
 * ```
 *
 * @publicApi
 */
export interface AsyncValidator extends Validator {
  /**
   * @description
   * Method that performs async validation against the provided control.
   *
   * @param control The control to validate against.
   *
   * @returns A promise or observable that resolves a map of validation errors
   * if validation fails, otherwise null.
   */
  validate(control: AbstractControl):
      Promise<ValidationErrors|null>|Observable<ValidationErrors|null>;
}

/**
 * @description
 * Provider which adds `RequiredValidator` to the `NG_VALIDATORS` multi-provider list.
 */

/**
 * @description
 * Provider which adds `CheckboxRequiredValidator` to the `NG_VALIDATORS` multi-provider list.
 */

/**
 * @description
 * A directive that adds the `required` validator to any controls marked with the
 * `required` attribute. The directive is provided with the `NG_VALIDATORS` multi-provider list.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding a required validator using template-driven forms
 *
 * ```
 * <input name="fullName" ngModel required>
 * ```
 *
 * @ngModule FormsModule
 * @ngModule ReactiveFormsModule
 * @publicApi
 */
export class RequiredValidator implements Validator {
  private _required = false;
  private _onChange?: () => void;

  /**
   * @description
   * Tracks changes to the required attribute bound to this directive.
   */
  get required(): boolean|string {
    return this._required;
  }

  set required(value: boolean|string) {
    this._required = value != null && value !== false && `${value}` !== 'false';
    if (this._onChange) this._onChange();
  }

  /**
   * Method that validates whether the control is empty.
   * Returns the validation result if enabled, otherwise null.
   * @nodoc
   */
  validate(control: AbstractControl): ValidationErrors|null {
    return this.required ? requiredValidator(control) : null;
  }

  /**
   * Registers a callback function to call when the validator inputs change.
   * @nodoc
   */
  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}


/**
 * A Directive that adds the `required` validator to checkbox controls marked with the
 * `required` attribute. The directive is provided with the `NG_VALIDATORS` multi-provider list.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding a required checkbox validator using template-driven forms
 *
 * The following example shows how to add a checkbox required validator to an input attached to an
 * ngModel binding.
 *
 * ```
 * <input type="checkbox" name="active" ngModel required>
 * ```
 *
 * @publicApi
 * @ngModule FormsModule
 * @ngModule ReactiveFormsModule
 */
export class CheckboxRequiredValidator extends RequiredValidator {
  /**
   * Method that validates whether or not the checkbox has been checked.
   * Returns the validation result if enabled, otherwise null.
   * @nodoc
   */
  //  override validate(control: AbstractControl): ValidationErrors|null {
  validate(control: AbstractControl): ValidationErrors|null {
    return this.required ? requiredTrueValidator(control) : null;
  }
}

/**
 * @description
 * Provider which adds `EmailValidator` to the `NG_VALIDATORS` multi-provider list.
 */
/**
 * A directive that adds the `email` validator to controls marked with the
 * `email` attribute. The directive is provided with the `NG_VALIDATORS` multi-provider list.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding an email validator
 *
 * The following example shows how to add an email validator to an input attached to an ngModel
 * binding.
 *
 * ```
 * <input type="email" name="email" ngModel email>
 * <input type="email" name="email" ngModel email="true">
 * <input type="email" name="email" ngModel [email]="true">
 * ```
 *
 * @publicApi
 * @ngModule FormsModule
 * @ngModule ReactiveFormsModule
 */
export class EmailValidator implements Validator {
  private _enabled = false;
  private _onChange?: () => void;

  /**
   * @description
   * Tracks changes to the email attribute bound to this directive.
   */
  set email(value: boolean|string) {
    this._enabled = value === '' || value === true || value === 'true';
    if (this._onChange) this._onChange();
  }

  /**
   * Method that validates whether an email address is valid.
   * Returns the validation result if enabled, otherwise null.
   * @nodoc
   */
  validate(control: AbstractControl): ValidationErrors|null {
    return this._enabled ? emailValidator(control) : null;
  }

  /**
   * Registers a callback function to call when the validator inputs change.
   * @nodoc
   */
  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}

/**
 * @description
 * A function that receives a control and synchronously returns a map of
 * validation errors if present, otherwise null.
 *
 * @publicApi
 */
export interface ValidatorFn {
  (control: AbstractControl): ValidationErrors|null;
}

/**
 * @description
 * A function that receives a control and returns a Promise or observable
 * that emits validation errors if present, otherwise null.
 *
 * @publicApi
 */
export interface AsyncValidatorFn {
  (control: AbstractControl): Promise<ValidationErrors|null>|Observable<ValidationErrors|null>;
}

/**
 * @description
 * Provider which adds `MinLengthValidator` to the `NG_VALIDATORS` multi-provider list.
 */

/**
 * A directive that adds minimum length validation to controls marked with the
 * `minlength` attribute. The directive is provided with the `NG_VALIDATORS` multi-provider list.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding a minimum length validator
 *
 * The following example shows how to add a minimum length validator to an input attached to an
 * ngModel binding.
 *
 * ```html
 * <input name="firstName" ngModel minlength="4">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
export class MinLengthValidator implements Validator {
  private _validator: ValidatorFn = nullValidator;
  private _onChange?: () => void;

  /**
   * @description
   * Tracks changes to the minimum length bound to this directive.
   */
  minlength!: string|number|null;  // This input is always defined, since the name matches selector.

  /** @nodoc */
  ngOnChanges(changes: any): void {
    if ('minlength' in changes) {
      this._createValidator();
      if (this._onChange) this._onChange();
    }
  }

  /**
   * Method that validates whether the value meets a minimum length requirement.
   * Returns the validation result if enabled, otherwise null.
   * @nodoc
   */
  validate(control: AbstractControl): ValidationErrors|null {
    return this.enabled() ? this._validator(control) : null;
  }

  /**
   * Registers a callback function to call when the validator inputs change.
   * @nodoc
   */
  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }

  private _createValidator(): void {
    this._validator =
        this.enabled() ? minLengthValidator(toNumber(this.minlength!)) : nullValidator;
  }

  /** @nodoc */
  enabled(): boolean {
    return this.minlength != null /* both `null` and `undefined` */;
  }
}

/**
 * @description
 * Provider which adds `MaxLengthValidator` to the `NG_VALIDATORS` multi-provider list.
 */

/**
 * A directive that adds max length validation to controls marked with the
 * `maxlength` attribute. The directive is provided with the `NG_VALIDATORS` multi-provider list.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding a maximum length validator
 *
 * The following example shows how to add a maximum length validator to an input attached to an
 * ngModel binding.
 *
 * ```html
 * <input name="firstName" ngModel maxlength="25">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
export class MaxLengthValidator implements Validator {
  private _validator: ValidatorFn = nullValidator;
  private _onChange?: () => void;

  /**
   * @description
   * Tracks changes to the maximum length bound to this directive.
   */
  maxlength!: string|number|null;  // This input is always defined, since the name matches selector.

  /** @nodoc */
  ngOnChanges(changes: any): void {
    if ('maxlength' in changes) {
      this._createValidator();
      if (this._onChange) this._onChange();
    }
  }

  /**
   * Method that validates whether the value exceeds the maximum length requirement.
   * @nodoc
   */
  validate(control: AbstractControl): ValidationErrors|null {
    return this.enabled() ? this._validator(control) : null;
  }

  /**
   * Registers a callback function to call when the validator inputs change.
   * @nodoc
   */
  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }

  private _createValidator(): void {
    this._validator =
        this.enabled() ? maxLengthValidator(toNumber(this.maxlength!)) : nullValidator;
  }

  /** @nodoc */
  enabled(): boolean {
    return this.maxlength != null /* both `null` and `undefined` */;
  }
}

/**
 * @description
 * Provider which adds `PatternValidator` to the `NG_VALIDATORS` multi-provider list.
 */


/**
 * @description
 * A directive that adds regex pattern validation to controls marked with the
 * `pattern` attribute. The regex must match the entire control value.
 * The directive is provided with the `NG_VALIDATORS` multi-provider list.
 *
 * @see [Form Validation](guide/form-validation)
 *
 * @usageNotes
 *
 * ### Adding a pattern validator
 *
 * The following example shows how to add a pattern validator to an input attached to an
 * ngModel binding.
 *
 * ```html
 * <input name="firstName" ngModel pattern="[a-zA-Z ]*">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
export class PatternValidator implements Validator {
  private _validator: ValidatorFn = nullValidator;
  private _onChange?: () => void;

  /**
   * @description
   * Tracks changes to the pattern bound to this directive.
   */
  pattern!: string|RegExp;  // This input is always defined, since the name matches selector.

  /** @nodoc */
  ngOnChanges(changes: any): void {
    if ('pattern' in changes) {
      this._createValidator();
      if (this._onChange) this._onChange();
    }
  }

  /**
   * Method that validates whether the value matches the pattern requirement.
   * @nodoc
   */
  validate(control: AbstractControl): ValidationErrors|null {
    return this._validator(control);
  }

  /**
   * Registers a callback function to call when the validator inputs change.
   * @nodoc
   */
  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }

  private _createValidator(): void {
    this._validator = patternValidator(this.pattern);
  }
}
