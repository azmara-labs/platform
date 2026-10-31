import {
  Children,
  type ComponentPropsWithoutRef,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  version,
} from "react";
import {
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  get,
  type RegisterOptions,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormReturn,
  useController,
  useFormContext,
  useFormState,
} from "react-hook-form";
import { Field, type FieldProps } from "../field/field.js";
import { ErrorSummary, type ErrorSummaryProps } from "../form/error-summary.js";

export interface FormProps<Values extends FieldValues, Output = Values>
  extends Omit<ComponentPropsWithoutRef<"form">, "onSubmit" | "onInvalid"> {
  /** What `useForm()` returned. */
  form: UseFormReturn<Values, unknown, Output>;
  /** Called with the valid (and, with a resolver, parsed) values. */
  onSubmit: SubmitHandler<Output>;
  /** Called with the errors when the submit fails validation. */
  onInvalid?: SubmitErrorHandler<Values>;
}

/**
 * A `<form noValidate>` wired to React Hook Form: it provides the form to the `FormField`s and
 * `FormErrorSummary` inside it and submits through `handleSubmit`. The browser's own validation
 * bubbles are off, so the form's messages are the only ones people see.
 */
export function Form<Values extends FieldValues, Output = Values>({
  form,
  onSubmit,
  onInvalid,
  children,
  ...props
}: FormProps<Values, Output>) {
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit, onInvalid)} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

/**
 * The form's `ErrorSummary`: lists every error after a failed submit and takes focus, again on
 * each failed submit. Put it at the top of a `Form`.
 */
export function FormErrorSummary(props: Omit<ErrorSummaryProps, "errors" | "submitCount">) {
  const { errors, submitCount } = useFormState();
  return <ErrorSummary errors={errors} submitCount={submitCount} {...props} />;
}

export interface FormFieldRenderProps<Values extends FieldValues = FieldValues>
  extends ControllerRenderProps<Values, FieldPath<Values>> {
  invalid: boolean;
}

export interface FormFieldProps<Values extends FieldValues = FieldValues>
  extends Omit<FieldProps, "name" | "error" | "children" | "validate" | "render"> {
  /** The field's path in the form values, such as `"email"` or `"address.city"`. */
  name: FieldPath<Values>;
  /**
   * React Hook Form's rules for this field: `required`, `validate`, `setValueAs` (use
   * `numberOrNull` for a `NumberField`) and the rest. Not needed with a schema resolver.
   */
  rules?: RegisterOptions<Values, FieldPath<Values>>;
  /**
   * Use `useController` instead of `register()`: for controls without a real input ref, such as a
   * toggle, a select or a date picker. The child gets `value`, `onValueChange` and `onBlur`.
   */
  controlled?: boolean;
  /** Renders the control yourself from the controller's field props. Implies `controlled`. */
  render?: (field: FormFieldRenderProps<Values>) => ReactNode;
  /** One control, such as `Input`, `Textarea`, `NumberField` or `PasswordInput`. */
  children?: ReactNode;
}

type AnyHandler = (...args: unknown[]) => unknown;

function chain(first: unknown, second: unknown): AnyHandler | undefined {
  if (typeof first !== "function") return second as AnyHandler | undefined;
  if (typeof second !== "function") return first as AnyHandler;
  return (...args) => {
    (first as AnyHandler)(...args);
    return (second as AnyHandler)(...args);
  };
}

// React 19 moved an element's ref into its props; reading element.ref there warns.
const REF_IN_PROPS = Number.parseInt(version, 10) >= 19;

function childRef(child: ReactElement<Record<string, unknown>>): Ref<unknown> | undefined {
  return (REF_IN_PROPS ? child.props.ref : (child as { ref?: unknown }).ref) as
    | Ref<unknown>
    | undefined;
}

/** One ref callback that feeds every ref given, so `register()` does not replace the caller's. */
function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

function onlyChild(children: ReactNode): ReactElement<Record<string, unknown>> | null {
  return Children.count(children) === 1 && isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;
}

function errorMessage(errors: unknown, name: string): ReactNode {
  const error = get(errors, name) as { message?: ReactNode } | undefined;
  if (!error) return undefined;
  // An error with no message still marks the field invalid.
  return error.message === undefined || error.message === "" ? true : error.message;
}

function RegisteredField<Values extends FieldValues>({
  name,
  rules,
  required,
  children,
  controlled: _controlled,
  render: _render,
  ...fieldProps
}: FormFieldProps<Values>) {
  const { register } = useFormContext<Values>();
  const { errors } = useFormState<Values>({ name });
  const error = errorMessage(errors, name);
  const child = onlyChild(children);
  const registration = register(name, rules);
  const control = child
    ? cloneElement(child, {
        ...registration,
        ref: mergeRefs(childRef(child), registration.ref),
        onChange: chain(child.props.onChange, registration.onChange),
        onBlur: chain(child.props.onBlur, registration.onBlur),
      })
    : children;

  return (
    <Field
      {...fieldProps}
      required={required ?? Boolean(rules?.required)}
      error={error === true ? undefined : error}
      invalid={error !== undefined}
    >
      {control}
    </Field>
  );
}

function ControlledField<Values extends FieldValues>({
  name,
  rules,
  required,
  render,
  children,
  controlled: _controlled,
  ...fieldProps
}: FormFieldProps<Values>) {
  const { field, fieldState } = useController<Values>({ name, rules });
  const error = fieldState.error ? fieldState.error.message || undefined : undefined;
  const child = onlyChild(children);
  const control = render
    ? render({ ...field, invalid: fieldState.invalid })
    : child
      ? cloneElement(child, {
          ref: field.ref,
          name: field.name,
          value: field.value,
          disabled: field.disabled ?? child.props.disabled,
          onValueChange: chain(child.props.onValueChange, field.onChange),
          onBlur: chain(child.props.onBlur, field.onBlur),
        })
      : children;

  return (
    <Field
      {...fieldProps}
      required={required ?? Boolean(rules?.required)}
      error={error}
      invalid={fieldState.invalid}
    >
      {control}
    </Field>
  );
}

/**
 * A labelled field bound to the surrounding `Form`. It registers its one control with
 * `register()`, so the control's real `ref` is used and there is no `Controller`; it shows the
 * field's error and marks it invalid, and shows the required marker when `required` (or a
 * `required` rule) is set. Set `controlled` or `render` for controls without an input ref.
 */
export function FormField<Values extends FieldValues = FieldValues>(props: FormFieldProps<Values>) {
  return props.controlled || props.render ? (
    <ControlledField<Values> {...props} />
  ) : (
    <RegisteredField<Values> {...props} />
  );
}
