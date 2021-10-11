/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs';
import { removeListItem } from './directives/shared';
import { AsyncValidatorFn, ValidationErrors, ValidatorFn } from './directives/validators';
import { addValidators, composeAsyncValidators, composeValidators, hasValidator, makeValidatorsArray, removeValidators, toObservable } from './validators';
import { EventEmitter, EventEmitter2 } from './core/event_emitter';
import produce from 'immer';
import nestedProperty from 'nested-property';

export const VALID = 'VALID';

export const INVALID = 'INVALID';

export const PENDING = 'PENDING';

export const DISABLED = 'DISABLED';

export type FormControlStatus = 'VALID' | 'INVALID' | 'PENDING' | 'DISABLED';

function _find(control: AbstractControl, path: Array<string | number> | string, delimiter: string) {
  if (path == null) return null;

  if (!Array.isArray(path)) {
    path = path.split(delimiter);
  }
  if (Array.isArray(path) && path.length === 0) return null;

  let controlToFind: AbstractControl | null = control;
  path.forEach((name: string | number) => {
    if (controlToFind instanceof FormGroup) {
      controlToFind = controlToFind.controls.hasOwnProperty(name as string) ?
        controlToFind.controls[name] :
        null;
    } else if (controlToFind instanceof FormArray) {
      controlToFind = controlToFind.at(<number>name) || null;
    } else {
      controlToFind = null;
    }
  });
  return controlToFind;
}

function pickValidators(validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions |
  null): ValidatorFn | ValidatorFn[] | null {
  return (isOptionsObj(validatorOrOpts) ? validatorOrOpts.validators : validatorOrOpts) || null;
}

function coerceToValidator(validator: ValidatorFn | ValidatorFn[] | null): ValidatorFn | null {
  return Array.isArray(validator) ? composeValidators(validator) : validator || null;
}

function pickAsyncValidators(
  asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null,
  validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null): AsyncValidatorFn |
  AsyncValidatorFn[] | null {
  return (isOptionsObj(validatorOrOpts) ? validatorOrOpts.asyncValidators : asyncValidator) || null;
}

function coerceToAsyncValidator(asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] |
  null): AsyncValidatorFn | null {
  return Array.isArray(asyncValidator) ? composeAsyncValidators(asyncValidator) :
    asyncValidator || null;
}

export type FormHooks = 'change' | 'blur' | 'submit';

export interface AbstractControlOptions {

  validators?: ValidatorFn | ValidatorFn[] | null;

  asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null;

  updateOn?: 'change' | 'blur' | 'submit';
}

function isOptionsObj(validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions |
  null): validatorOrOpts is AbstractControlOptions {
  return validatorOrOpts != null && !Array.isArray(validatorOrOpts) &&
    typeof validatorOrOpts === 'object';
}


export abstract class AbstractControl {
  _pendingDirty!: boolean;

 
  _hasOwnPendingAsyncValidator = false;

  _pendingTouched!: boolean;

  _onCollectionChange = () => { };

  _updateOn!: FormHooks;

  private _parent: FormGroup | FormArray | null = null;
  private _asyncValidationSubscription: any;

  private _composedValidatorFn: ValidatorFn | null;

  private _composedAsyncValidatorFn: AsyncValidatorFn | null;

  private _rawValidators: ValidatorFn | ValidatorFn[] | null;

  private _rawAsyncValidators: AsyncValidatorFn | AsyncValidatorFn[] | null;

  public readonly value: any;

  constructor(
    validators: ValidatorFn | ValidatorFn[] | null,
    asyncValidators: AsyncValidatorFn | AsyncValidatorFn[] | null) {
    this._rawValidators = validators;
    this._rawAsyncValidators = asyncValidators;
    this._composedValidatorFn = coerceToValidator(this._rawValidators);
    this._composedAsyncValidatorFn = coerceToAsyncValidator(this._rawAsyncValidators);
  }

  get validator(): ValidatorFn | null {
    return this._composedValidatorFn;
  }
  set validator(validatorFn: ValidatorFn | null) {
    this._rawValidators = this._composedValidatorFn = validatorFn;
  }

  get asyncValidator(): AsyncValidatorFn | null {
    return this._composedAsyncValidatorFn;
  }
  set asyncValidator(asyncValidatorFn: AsyncValidatorFn | null) {
    this._rawAsyncValidators = this._composedAsyncValidatorFn = asyncValidatorFn;
  }

  get parent(): FormGroup | FormArray | null {
    return this._parent;
  }

  public readonly status!: FormControlStatus;

  get valid(): boolean {
    return this.status === VALID;
  }

  get invalid(): boolean {
    return this.status === INVALID;
  }

 
  get pending(): boolean {
    return this.status == PENDING;
  }

  get disabled(): boolean {
    return this.status === DISABLED;
  }

  get enabled(): boolean {
    return this.status !== DISABLED;
  }

  public readonly errors!: ValidationErrors | null;

  
  public readonly pristine: boolean = true;

  get dirty(): boolean {
    return !this.pristine;
  }

  public readonly touched: boolean = false;

  get untouched(): boolean {
    return !this.touched;
  }

  public readonly valueChanges!: Observable<any>;
 
  public readonly statusChanges!: Observable<FormControlStatus>;

  get updateOn(): FormHooks {
    return this._updateOn ? this._updateOn : (this.parent ? this.parent.updateOn : 'change');
  }

  setValidators(validators: ValidatorFn | ValidatorFn[] | null): void {
    this._rawValidators = validators;
    this._composedValidatorFn = coerceToValidator(validators);
  }

  setAsyncValidators(validators: AsyncValidatorFn | AsyncValidatorFn[] | null): void {
    this._rawAsyncValidators = validators;
    this._composedAsyncValidatorFn = coerceToAsyncValidator(validators);
  }

  addValidators(validators: ValidatorFn | ValidatorFn[]): void {
    this.setValidators(addValidators(validators, this._rawValidators));
  }

  addAsyncValidators(validators: AsyncValidatorFn | AsyncValidatorFn[]): void {
    this.setAsyncValidators(addValidators(validators, this._rawAsyncValidators));
  }

  removeValidators(validators: ValidatorFn | ValidatorFn[]): void {
    this.setValidators(removeValidators(validators, this._rawValidators));
  }

  removeAsyncValidators(validators: AsyncValidatorFn | AsyncValidatorFn[]): void {
    this.setAsyncValidators(removeValidators(validators, this._rawAsyncValidators));
  }

  hasValidator(validator: ValidatorFn): boolean {
    return hasValidator(this._rawValidators, validator);
  }

  hasAsyncValidator(validator: AsyncValidatorFn): boolean {
    return hasValidator(this._rawAsyncValidators, validator);
  }

  clearValidators(): void {
    this.validator = null;
  }

  clearAsyncValidators(): void {
    this.asyncValidator = null;
  }

  markAsTouched(opts: { onlySelf?: boolean } = {}): void {
    (this as { touched: boolean }).touched = true;

    if (this._parent && !opts.onlySelf) {
      this._parent.markAsTouched(opts);
    }
  }

  markAllAsTouched(): void {
    this.markAsTouched({ onlySelf: true });

    this._forEachChild((control: AbstractControl) => control.markAllAsTouched());
  }

  markAsUntouched(opts: { onlySelf?: boolean } = {}): void {
    (this as { touched: boolean }).touched = false;
    this._pendingTouched = false;

    this._forEachChild((control: AbstractControl) => {
      control.markAsUntouched({ onlySelf: true });
    });

    if (this._parent && !opts.onlySelf) {
      this._parent._updateTouched(opts);
    }
  }

  markAsDirty(opts: { onlySelf?: boolean } = {}): void {
    (this as { pristine: boolean }).pristine = false;

    if (this._parent && !opts.onlySelf) {
      this._parent.markAsDirty(opts);
    }
  }

  markAsPristine(opts: { onlySelf?: boolean } = {}): void {
    (this as { pristine: boolean }).pristine = true;
    this._pendingDirty = false;

    this._forEachChild((control: AbstractControl) => {
      control.markAsPristine({ onlySelf: true });
    });

    if (this._parent && !opts.onlySelf) {
      this._parent._updatePristine(opts);
    }
  }

  markAsPending(opts: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    (this as { status: FormControlStatus }).status = PENDING;

    if (opts.emitEvent !== false) {
      (this.statusChanges as EventEmitter<FormControlStatus>).emit(this.status);
    }

    if (this._parent && !opts.onlySelf) {
      this._parent.markAsPending(opts);
    }
  }

  disable(opts: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
 
    const skipPristineCheck = this._parentMarkedDirty(opts.onlySelf);

    (this as { status: FormControlStatus }).status = DISABLED;
    (this as { errors: ValidationErrors | null }).errors = null;
    this._forEachChild((control: AbstractControl) => {
      control.disable({ ...opts, onlySelf: true });
    });
    this._updateValue();

    if (opts.emitEvent !== false) {
      (this.valueChanges as EventEmitter<any>).emit(this.value);
      (this.statusChanges as EventEmitter<FormControlStatus>).emit(this.status);
    }

    this._updateAncestors({ ...opts, skipPristineCheck });
    this._onDisabledChange.forEach((changeFn) => changeFn(true));
  }

  enable(opts: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    // If parent has been marked artificially dirty we don't want to re-calculate the
    // parent's dirtiness based on the children.
    const skipPristineCheck = this._parentMarkedDirty(opts.onlySelf);

    (this as { status: FormControlStatus }).status = VALID;
    this._forEachChild((control: AbstractControl) => {
      control.enable({ ...opts, onlySelf: true });
    });
    this.updateValueAndValidity({ onlySelf: true, emitEvent: opts.emitEvent });

    this._updateAncestors({ ...opts, skipPristineCheck });
    this._onDisabledChange.forEach((changeFn) => changeFn(false));
  }

  private _updateAncestors(
    opts: { onlySelf?: boolean, emitEvent?: boolean, skipPristineCheck?: boolean }) {
    if (this._parent && !opts.onlySelf) {
      this._parent.updateValueAndValidity(opts);
      if (!opts.skipPristineCheck) {
        this._parent._updatePristine();
      }
      this._parent._updateTouched();
    }
  }

  setParent(parent: FormGroup | FormArray): void {
    this._parent = parent;
  }

  abstract setValue(value: any, options?: Object): void;

  abstract patchValue(value: any, options?: Object): void;

  abstract reset(value?: any, options?: Object): void;

  updateValueAndValidity(opts: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    this._setInitialStatus();
    this._updateValue();

    if (this.enabled) {
      this._cancelExistingSubscription();
      (this as { errors: ValidationErrors | null }).errors = this._runValidator();
      (this as { status: FormControlStatus }).status = this._calculateStatus();

      if (this.status === VALID || this.status === PENDING) {
        this._runAsyncValidator(opts.emitEvent);
      }
    }

    if (opts.emitEvent !== false) {
      (this.valueChanges as EventEmitter<any>).emit(this.value);
      (this.statusChanges as EventEmitter<FormControlStatus>).emit(this.status);
    }

    if (this._parent && !opts.onlySelf) {
      this._parent.updateValueAndValidity(opts);
    }
  }

  _updateTreeValidity(opts: { emitEvent?: boolean } = { emitEvent: true }) {
    this._forEachChild((ctrl: AbstractControl) => ctrl._updateTreeValidity(opts));
    this.updateValueAndValidity({ onlySelf: true, emitEvent: opts.emitEvent });
  }

  private _setInitialStatus() {
    (this as { status: FormControlStatus }).status = this._allControlsDisabled() ? DISABLED : VALID;
  }

  private _runValidator(): ValidationErrors | null {
    return this.validator ? this.validator(this) : null;
  }

  private _runAsyncValidator(emitEvent?: boolean): void {
    if (this.asyncValidator) {
      (this as { status: FormControlStatus }).status = PENDING;
      this._hasOwnPendingAsyncValidator = true;
      const obs = toObservable(this.asyncValidator(this));
      this._asyncValidationSubscription = obs.subscribe((errors: ValidationErrors | null) => {
        this._hasOwnPendingAsyncValidator = false;

        this.setErrors(errors, { emitEvent });
      });
    }
  }

  private _cancelExistingSubscription(): void {
    if (this._asyncValidationSubscription) {
      this._asyncValidationSubscription.unsubscribe();
      this._hasOwnPendingAsyncValidator = false;
    }
  }

  setErrors(errors: ValidationErrors | null, opts: { emitEvent?: boolean } = {}): void {
    (this as { errors: ValidationErrors | null }).errors = errors;
    this._updateControlsErrors(opts.emitEvent !== false);
  }

 
  get(path: Array<string | number> | string): AbstractControl | null {
    return _find(this, path, '.');
  }

  getError(errorCode: string, path?: Array<string | number> | string): any {
    const control = path ? this.get(path) : this;
    return control && control.errors ? control.errors[errorCode] : null;
  }

  hasError(errorCode: string, path?: Array<string | number> | string): boolean {
    return !!this.getError(errorCode, path);
  }

  get root(): AbstractControl {
    let x: AbstractControl = this;

    while (x._parent) {
      x = x._parent;
    }

    return x;
  }

  /** @internal */
  _updateControlsErrors(emitEvent: boolean): void {
    (this as { status: FormControlStatus }).status = this._calculateStatus();

    if (emitEvent) {
      (this.statusChanges as EventEmitter<FormControlStatus>).emit(this.status);
    }

    if (this._parent) {
      this._parent._updateControlsErrors(emitEvent);
    }
  }

  /** @internal */
  _initObservables() {
    (this as { valueChanges: Observable<any> }).valueChanges = new EventEmitter2();
    (this as { statusChanges: Observable<FormControlStatus> }).statusChanges = new EventEmitter2();
  }


  private _calculateStatus(): FormControlStatus {
    if (this._allControlsDisabled()) return DISABLED;
    if (this.errors) return INVALID;
    if (this._hasOwnPendingAsyncValidator || this._anyControlsHaveStatus(PENDING)) return PENDING;
    if (this._anyControlsHaveStatus(INVALID)) return INVALID;
    return VALID;
  }

  /** @internal */
  abstract _updateValue(): void;

  /** @internal */
  abstract _forEachChild(cb: Function): void;

  /** @internal */
  abstract _anyControls(condition: Function): boolean;

  /** @internal */
  abstract _allControlsDisabled(): boolean;

  /** @internal */
  abstract _syncPendingControls(): boolean;

  /** @internal */
  _anyControlsHaveStatus(status: FormControlStatus): boolean {
    return this._anyControls((control: AbstractControl) => control.status === status);
  }

  /** @internal */
  _anyControlsDirty(): boolean {
    return this._anyControls((control: AbstractControl) => control.dirty);
  }

  /** @internal */
  _anyControlsTouched(): boolean {
    return this._anyControls((control: AbstractControl) => control.touched);
  }

  /** @internal */
  _updatePristine(opts: { onlySelf?: boolean } = {}): void {
    (this as { pristine: boolean }).pristine = !this._anyControlsDirty();

    if (this._parent && !opts.onlySelf) {
      this._parent._updatePristine(opts);
    }
  }

  /** @internal */
  _updateTouched(opts: { onlySelf?: boolean } = {}): void {
    (this as { touched: boolean }).touched = this._anyControlsTouched();

    if (this._parent && !opts.onlySelf) {
      this._parent._updateTouched(opts);
    }
  }

  /** @internal */
  _onDisabledChange: Function[] = [];

  /** @internal */
  _isBoxedValue(formState: any): boolean {
    return typeof formState === 'object' && formState !== null &&
      Object.keys(formState).length === 2 && 'value' in formState && 'disabled' in formState;
  }

  /** @internal */
  _registerOnCollectionChange(fn: () => void): void {
    this._onCollectionChange = fn;
  }

  /** @internal */
  _setUpdateStrategy(opts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null): void {
    if (isOptionsObj(opts) && opts.updateOn != null) {
      this._updateOn = opts.updateOn!;
    }
  }

  private _parentMarkedDirty(onlySelf?: boolean): boolean {
    const parentDirty = this._parent && this._parent.dirty;
    return !onlySelf && !!parentDirty && !this._parent!._anyControlsDirty();
  }


  nestedPath!: string;
  path: string | number | null = null;

  dispatchStateFn: (value: any) => void = (vale: any) => { };

  getRoot(): AbstractControl {
    if (this.parent) {
      return this.parent.getRoot();
    } else {
      return this;
    }
  };

  setState(value: any) {
    const root = this.getRoot();
    const dispatchStateFn = root.dispatchStateFn;
    const path = (
      root.nestedPath ? [root.nestedPath, ...this.getPath()] : this.getPath()
    ).join('.')
    if (path === '') {
      dispatchStateFn(value);
    } else {
      const newState = produce(
        (draftState) => {
          nestedProperty.set(draftState, path, value);
        });
      dispatchStateFn(newState)
    }
  }


  getPath(): (string | number | null)[] {
    if (this.parent)
      return [...this.parent.getPath(), this.path]
    else
      return [];
  }

  getPathString(): string {
    return this.getPath().join('.');
  }






}

export class FormControl extends AbstractControl {

  _onChange: Function[] = [];

  _pendingValue: any;

  _pendingChange: any;

  constructor(
    formState: any = null,
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
    super(pickValidators(validatorOrOpts), pickAsyncValidators(asyncValidator, validatorOrOpts));
    this._applyFormState(formState);
    this._setUpdateStrategy(validatorOrOpts);
    this._initObservables();
    this.updateValueAndValidity({
      onlySelf: true,
      emitEvent: !!this.asyncValidator
    });
  }

 
  setValue(value: any, options: {

    onlySelf?: boolean,
    emitEvent?: boolean,
    emitModelToViewChange?: boolean,
    emitViewToModelChange?: boolean
  } = {}): void {
    (this as { value: any }).value = this._pendingValue = value;
    
    const root = this.getRoot();
    const tempPath = this.getPath().join('.');
    const path = root.nestedPath ? `${root.nestedPath}.${tempPath}` : tempPath;
    this.setState(value);


    if (this._onChange.length && options.emitModelToViewChange !== false) {
      this._onChange.forEach(
        (changeFn) => changeFn(this.value, options.emitViewToModelChange !== false));
    }
    this.updateValueAndValidity(options);
  }


  patchValue(value: any, options: {
    onlySelf?: boolean,
    emitEvent?: boolean,
    emitModelToViewChange?: boolean,
    emitViewToModelChange?: boolean
  } = {}): void {
    this.setValue(value, options);
  }

  reset(formState: any = null, options: { onlySelf?: boolean, emitEvent?: boolean } = {}):
    void {
    this._applyFormState(formState);
    this.markAsPristine(options);
    this.markAsUntouched(options);
    this.setValue(this.value, options);
    this._pendingChange = false;
  }

  _updateValue() { }

  _anyControls(condition: Function): boolean {
    return false;
  }

  _allControlsDisabled(): boolean {
    return this.disabled;
  }

  registerOnChange(fn: Function): void {
    this._onChange.push(fn);
  }

  _unregisterOnChange(fn: Function): void {
    removeListItem(this._onChange, fn);
  }

  registerOnDisabledChange(fn: (isDisabled: boolean) => void): void {
    this._onDisabledChange.push(fn);
  }

  _unregisterOnDisabledChange(fn: (isDisabled: boolean) => void): void {
    removeListItem(this._onDisabledChange, fn);
  }

  _forEachChild(cb: Function): void { }


  _syncPendingControls(): boolean {
    if (this.updateOn === 'submit') {
      if (this._pendingDirty) this.markAsDirty();
      if (this._pendingTouched) this.markAsTouched();
      if (this._pendingChange) {
        this.setValue(this._pendingValue, { onlySelf: true, emitModelToViewChange: false });
        return true;
      }
    }
    return false;
  }

  private _applyFormState(formState: any) {
    if (this._isBoxedValue(formState)) {
      (this as { value: any }).value = this._pendingValue = formState.value;
      formState.disabled ? this.disable({ onlySelf: true, emitEvent: false }) :
        this.enable({ onlySelf: true, emitEvent: false });
    } else {
      (this as { value: any }).value = this._pendingValue = formState;
    }
  }


  onChange = (event: any) => {
    const value = getControlValue(event);
    const isDirty = value !== this.value;
    if (this.updateOn !== "change") {
      this._pendingValue = value;
      this._pendingChange = true;
      if (isDirty && !this._pendingDirty) {
        this._pendingDirty = true;
      }
    } else {
      if (isDirty && !this.dirty) {
        this.markAsDirty();
      }
      this.setValue(value);
    }
  };


  onBlur = () => {
    if (this.updateOn === "blur") {
      if (this._pendingDirty && !this.dirty) {
        this.markAsDirty();
      }
      if (!this.touched) {
        this.markAsTouched();
      }
      this.setValue(this._pendingValue, { emitEvent: false, onlySelf: true });
    } else if (this.updateOn === "submit") {
      this._pendingTouched = true;
    } else {
      const emitChangeToView = !this.touched;
      if (!this.touched) {
        this.markAsTouched();
        this.setValue(this.value); 
      }
      if (emitChangeToView) {

      }
    }
  };

}


export class FormGroup extends AbstractControl {

  constructor(
    public controls: { [key: string]: AbstractControl },
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
    super(pickValidators(validatorOrOpts), pickAsyncValidators(asyncValidator, validatorOrOpts));
    this._initObservables();
    this._setUpdateStrategy(validatorOrOpts);
    this._setUpControls();
    this.updateValueAndValidity({
      onlySelf: true,
      emitEvent: !!this.asyncValidator
    });
  }

  registerControl(name: string, control: AbstractControl): AbstractControl {
    if (this.controls[name]) return this.controls[name];
    this.controls[name] = control;
    control.setParent(this);
    control._registerOnCollectionChange(this._onCollectionChange);
    return control;
  }

  addControl(name: string, control: AbstractControl, options: { emitEvent?: boolean } = {}): void {
    this.registerControl(name, control);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
    this._onCollectionChange();
  }

  removeControl(name: string, options: { emitEvent?: boolean } = {}): void {
    if (this.controls[name]) this.controls[name]._registerOnCollectionChange(() => { });
    delete (this.controls[name]);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
    this._onCollectionChange();
  }

  setControl(name: string, control: AbstractControl, options: { emitEvent?: boolean } = {}): void {
    if (this.controls[name]) this.controls[name]._registerOnCollectionChange(() => { });
    delete (this.controls[name]);
    if (control) this.registerControl(name, control);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
    this._onCollectionChange();
  }

  contains(controlName: string): boolean {
    return this.controls.hasOwnProperty(controlName) && this.controls[controlName].enabled;
  }

  setValue(
    value: { [key: string]: any }, options: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    this._checkAllValuesPresent(value);
    Object.keys(value).forEach(name => {
      this._throwIfControlMissing(name);
      this.controls[name].setValue(value[name], { onlySelf: true, emitEvent: options.emitEvent });
    });
    this.updateValueAndValidity(options);
  }

  patchValue(
    value: { [key: string]: any }, options: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
  
    if (value == null /* both `null` and `undefined` */) return;

    Object.keys(value).forEach(name => {
      if (this.controls[name]) {
        this.controls[name].patchValue(value[name], { onlySelf: true, emitEvent: options.emitEvent });
      }
    });
    this.updateValueAndValidity(options);
    this.setState(value)
  }

  reset(value: any = {}, options: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    this._forEachChild((control: AbstractControl, name: string) => {
      control.reset(value[name], { onlySelf: true, emitEvent: options.emitEvent });
    });
    this._updatePristine(options);
    this._updateTouched(options);
    this.updateValueAndValidity(options);
  }

  getRawValue(): any {
    return this._reduceChildren(
      {}, (acc: { [k: string]: AbstractControl }, control: AbstractControl, name: string) => {
        acc[name] = control instanceof FormControl ? control.value : (<any>control).getRawValue();
        return acc;
      });
  }

  _syncPendingControls(): boolean {
    let subtreeUpdated = this._reduceChildren(false, (updated: boolean, child: AbstractControl) => {
      return child._syncPendingControls() ? true : updated;
    });
    if (subtreeUpdated) this.updateValueAndValidity({ onlySelf: true });
    return subtreeUpdated;
  }

  _throwIfControlMissing(name: string): void {
    if (!Object.keys(this.controls).length) {
      throw new Error(`
         There are no form controls registered with this group yet. If you're using ngModel,
         you may want to check next tick (e.g. use setTimeout).
       `);
    }
    if (!this.controls[name]) {
      throw new Error(`Cannot find form control with name: ${name}.`);
    }
  }

  _forEachChild(cb: (v: any, k: string) => void): void {
    Object.keys(this.controls).forEach(key => {
      const control = this.controls[key];
      control && cb(control, key);
    });
  }

  _setUpControls(): void {
    this._forEachChild((control: AbstractControl, key: string /***WDS***/) => {
      control.setParent(this);
      control.path = key;

      control._registerOnCollectionChange(this._onCollectionChange);
    });
  }

  _updateValue(): void {
    (this as { value: any }).value = this._reduceValue();
  }

  _anyControls(condition: Function): boolean {
    for (const controlName of Object.keys(this.controls)) {
      const control = this.controls[controlName];
      if (this.contains(controlName) && condition(control)) {
        return true;
      }
    }
    return false;
  }

  _reduceValue() {
    return this._reduceChildren(
      {}, (acc: { [k: string]: AbstractControl }, control: AbstractControl, name: string) => {
        if (control.enabled || this.disabled) {
          acc[name] = control.value;
        }
        return acc;
      });
  }

  /** @internal */
  _reduceChildren(initValue: any, fn: Function) {
    let res = initValue;
    this._forEachChild((control: AbstractControl, name: string) => {
      res = fn(res, control, name);
    });
    return res;
  }

  _allControlsDisabled(): boolean {
    for (const controlName of Object.keys(this.controls)) {
      if (this.controls[controlName].enabled) {
        return false;
      }
    }
    return Object.keys(this.controls).length > 0 || this.disabled;
  }

  /** @internal */
  _checkAllValuesPresent(value: any): void {
    this._forEachChild((control: AbstractControl, name: string) => {
      if (value[name] === undefined) {
        throw new Error(`Must supply a value for form control with name: '${name}'.`);
      }
    });
  }
}

export class FormArray extends AbstractControl {
 
  constructor(
    public controls: AbstractControl[],
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
    super(pickValidators(validatorOrOpts), pickAsyncValidators(asyncValidator, validatorOrOpts));
    this._initObservables();
    this._setUpdateStrategy(validatorOrOpts);
    this._setUpControls();
    this.updateValueAndValidity({
      onlySelf: true,
      emitEvent: !!this.asyncValidator
    });
  }

  at(index: number): AbstractControl {
    return this.controls[index];
  }

  push(control: AbstractControl, options: { emitEvent?: boolean } = {}): void {
    this.controls.push(control);

    control.path = this.controls.length - 1;
    const path = this.getPath().join('.') + '.' + control.path;
    const newState = produce(
      (draftState) => {
        nestedProperty.set(draftState, path, control.value);
      });
    this.setState(newState)

    this._registerControl(control);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
    this._onCollectionChange();
  }

  insert(index: number, control: AbstractControl, options: { emitEvent?: boolean } = {}): void {
    this.controls.splice(index, 0, control);

    this._registerControl(control);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
  }

  removeAt(index: number, options: { emitEvent?: boolean } = {}): void {
    if (this.controls[index]) this.controls[index]._registerOnCollectionChange(() => { });
    
    const path = this.getPath().join('.');
    const newState = produce(
      (draftState) => {
        const controls = nestedProperty.get(draftState, path);
        controls.splice(index, 1);
      });
    this.setState(newState);
    this.controls.forEach(
      (control, index) => {
        control.path = index;
      })

    this.controls.splice(index, 1);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
  }

  setControl(index: number, control: AbstractControl, options: { emitEvent?: boolean } = {}): void {
    if (this.controls[index]) this.controls[index]._registerOnCollectionChange(() => { });
    this.controls.splice(index, 1);

    if (control) {
      this.controls.splice(index, 0, control);
      this._registerControl(control);
    }

    this.updateValueAndValidity({ emitEvent: options.emitEvent });
    this._onCollectionChange();
  }

  get length(): number {
    return this.controls.length;
  }


  setValue(value: any[], options: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    this._checkAllValuesPresent(value);
    value.forEach((newValue: any, index: number) => {
      this._throwIfControlMissing(index);
      this.at(index).setValue(newValue, { onlySelf: true, emitEvent: options.emitEvent });
    });
    this.updateValueAndValidity(options);
  }

  patchValue(value: any[], options: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {

    if (value == null /* both `null` and `undefined` */) return;

    value.forEach((newValue: any, index: number) => {
      if (this.at(index)) {
        this.at(index).patchValue(newValue, { onlySelf: true, emitEvent: options.emitEvent });
      }
    });
    this.updateValueAndValidity(options);
  }

  reset(value: any = [], options: { onlySelf?: boolean, emitEvent?: boolean } = {}): void {
    this._forEachChild((control: AbstractControl, index: number) => {
      control.reset(value[index], { onlySelf: true, emitEvent: options.emitEvent });
    });
    this._updatePristine(options);
    this._updateTouched(options);
    this.updateValueAndValidity(options);
  }

  getRawValue(): any[] {
    return this.controls.map((control: AbstractControl) => {
      return control instanceof FormControl ? control.value : (<any>control).getRawValue();
    });
  }

  clear(options: { emitEvent?: boolean } = {}): void {
    if (this.controls.length < 1) return;
    this._forEachChild((control: AbstractControl) => control._registerOnCollectionChange(() => { }));
    this.controls.splice(0);
    this.updateValueAndValidity({ emitEvent: options.emitEvent });
  }

  _syncPendingControls(): boolean {
    let subtreeUpdated = this.controls.reduce((updated: boolean, child: AbstractControl) => {
      return child._syncPendingControls() ? true : updated;
    }, false);
    if (subtreeUpdated) this.updateValueAndValidity({ onlySelf: true });
    return subtreeUpdated;
  }

  _throwIfControlMissing(index: number): void {
    if (!this.controls.length) {
      throw new Error(`
         There are no form controls registered with this array yet. If you're using ngModel,
         you may want to check next tick (e.g. use setTimeout).
       `);
    }
    if (!this.at(index)) {
      throw new Error(`Cannot find form control at index ${index}`);
    }
  }

  _forEachChild(cb: Function): void {
    this.controls.forEach((control: AbstractControl, index: number) => {
      cb(control, index);
    });
  }

  _updateValue(): void {
    (this as { value: any }).value =
      this.controls.filter((control) => control.enabled || this.disabled)
        .map((control) => control.value);
  }

  _anyControls(condition: Function): boolean {
    return this.controls.some((control: AbstractControl) => control.enabled && condition(control));
  }

  _setUpControls(): void {
    this._forEachChild((control: AbstractControl, index: number /***WDS**/) => {
      this._registerControl(control)
      control.path = index;
    });
  }

  _checkAllValuesPresent(value: any): void {
    this._forEachChild((control: AbstractControl, i: number) => {
      if (value[i] === undefined) {
        throw new Error(`Must supply a value for form control at index: ${i}.`);
      }
    });
  }

  _allControlsDisabled(): boolean {
    for (const control of this.controls) {
      if (control.enabled) return false;
    }
    return this.controls.length > 0 || this.disabled;
  }

  private _registerControl(control: AbstractControl) {
    control.setParent(this);
    control._registerOnCollectionChange(this._onCollectionChange);
  }
}

function getControlValue(event: any) {
  if (isEvent(event)) {
    switch (event.target.type) {
      case "checkbox":
        return event.target.checked;
      case "select-multiple":
        if (event.target.options) {
          let options = event.target.options;
          var value = [];
          for (var i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
              value.push(options[i].value);
            }
          }
          return value;
        }
        return event.target.value;
      case "number":
        return event.target.valueAsNumber;
      default:
        return isReactNative() ? event.nativeEvent.text : event.target.value;
    }
  }
  return event;
}

export const isReactNative = () =>
  typeof window !== "undefined" &&
  window.navigator &&
  window.navigator.product &&
  window.navigator.product === "ReactNative";
export const isEvent = (candidate: any) =>
  !!(candidate && candidate.stopPropagation && candidate.preventDefault);

