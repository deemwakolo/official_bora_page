'use client';

import type { ZodSchema } from 'zod';

import type {
  DefaultValues,
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverResult,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';

import { FormProvider, useForm } from 'react-hook-form';

/*
 * BORA FORM BOUNDARY
 * ==================
 *
 * React Hook Form provides field REGISTRATION, dirty tracking and
 * submission lifecycle. BORA keeps every decision that matters:
 * field definitions, validation schemas, business rules, persistence,
 * Save/Discard semantics, authorization, and all visual tokens.
 *
 *   BoraForm  (this file — the boundary)
 *     -> useForm()            field registration, dirty, isSubmitting
 *     -> resolver (optional)  a BORA-supplied Zod schema
 *     -> onSubmit(values)     the BORA OWNER's own handler
 *
 * It is a THIN pass-through. It renders a <form>, wires the resolver,
 * and hands control to the caller. It does NOT:
 *   • persist anything
 *   • decide success or failure
 *   • render a Save bar or own Save/Discard semantics
 *   • introduce any styling or token of its own
 *
 * @hookform/resolvers is NOT installed, and BORA does not add
 * dependencies to make a wrapper tidier. `boraZodResolver` below is a
 * ~15 line adapter onto RHF's own public `Resolver` type. If RHF's
 * resolver contract changes, this one file changes — not BORA forms.
 *
 * Existing simple controlled forms (OperationsField, EmailPasswordLogin,
 * ControlRoomProfileEditor, UIPropertyControl) are INTENTIONALLY NOT
 * migrated. They work, and migrating them would be BORA adapting itself
 * to a library rather than the reverse.
 */

/**
 * Adapts a BORA-owned Zod schema to React Hook Form's resolver contract.
 *
 * The schema is BORA's, so validation messages stay BORA's. RHF only
 * learns whether the values were acceptable.
 *
 * RHF's `FieldErrors` index signature is narrower than `FieldError`, so
 * the accumulator is built as a plain record and cast ONCE, here, at the
 * library boundary — instead of leaking casts into BORA code.
 */
export function boraZodResolver<
  TValues extends FieldValues
>(schema: ZodSchema<TValues>): Resolver<TValues> {
  return async (values): Promise<ResolverResult<TValues>> => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {
        values: result.data as TValues,
        errors: {},
      };
    }

    // Flatten Zod issues onto RHF field paths. A field-level issue
    // becomes that field's error; anything without a path (an object- or
    // form-level rule) is reported on `root`.
    const errors: Record<string, { type: string; message: string }> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join('.');

      // First issue per field wins: RHF renders one message per field,
      // and choosing "all messages" would be a BORA copy decision.
      if (path && !errors[path]) {
        errors[path] = {
          type: 'validation',
          message: issue.message,
        };
      }
    }

    if (!Object.keys(errors).length && result.error.issues.length) {
      // A schema issue with no field path is a form-level problem.
      errors.root = {
        type: 'validation',
        message: result.error.issues[0].message,
      };
    }

    return {
      // RHF requires an EMPTY object here, not the submitted values: on
      // failure nothing is considered transformed or valid.
      values: {},
      errors: errors as FieldErrors<TValues>,
    };
  };
}

export interface BoraFormProps<TValues extends FieldValues> {
  /**
   * The caller's own submit handler.
   *
   * This is where BORA calls its Server Action and decides what
   * success or failure means. `BoraForm` never calls the database,
   * and never treats "form submitted" as "write succeeded".
   */
  onSubmit: SubmitHandler<TValues>;

  /** Optional BORA-owned schema. Omit for purely uncontrolled forms. */
  schema?: ZodSchema<TValues>;

  /**
   * Initial values. Typed as RHF's own `DefaultValues` so callers get
   * deep-partial ergonomics (a form for a 9-field record does not have
   * to supply all 9 to typecheck).
   */
  defaultValues?: DefaultValues<TValues>;

  /** Passed straight to `useForm` for behaviour BORA needs verbatim. */
  options?: {
    mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
    revalidateMode?:
      | 'onChange'
      | 'onBlur'
      | 'onSubmit';
  };

  /**
   * Optional escape hatch: a render-prop consumer that needs the
   * `UseFormReturn` (custom layout, BORA-owned save bar).
   */
  children?: React.ReactNode;

  /** Plain form attributes (className, noValidate, ...). */
  formProps?: Omit<
    React.FormHTMLAttributes<HTMLFormElement>,
    'onSubmit'
  >;

  /** Receives the RHF instance when no children are supplied. */
  render?: (form: UseFormReturn<TValues>) => React.ReactNode;
}

/**
 * BORA FORM — the single BORA-owned entry point to React Hook Form.
 *
 * Usage:
 *   <BoraForm schema={schema} onSubmit={handleSave}>
 *     ...
 *   </BoraForm>
 *
 * BORA fields register through this instance, so adding form lifecycle
 * to an admin screen never requires importing react-hook-form directly.
 *
 * The third RHF generic (`TTransformedValues`) is pinned to `TValues`:
 * a Zod schema does not change the shape of the values BORA submits, so
 * transformed and input values are the same type here. Leaving it
 * default makes RHF infer a fresh `FieldValues` and every downstream
 * `handleSubmit` / `FormProvider` reference stops typechecking.
 */
export default function BoraForm<TValues extends FieldValues>({
  onSubmit,
  schema,
  defaultValues,
  options,
  children,
  formProps,
  render,
}: BoraFormProps<TValues>) {
  const form = useForm<
    TValues,
    unknown,
    TValues
  >({
    ...(defaultValues ? { defaultValues } : {}),
    ...(schema
      ? { resolver: boraZodResolver(schema) }
      : {}),
    ...(options?.mode ? { mode: options.mode } : {}),
    ...(options?.revalidateMode
      ? { revalidateMode: options.revalidateMode }
      : {}),
  });

  const { handleSubmit } = form;

  return (
    /*
     * FormProvider is what lets BoraFormField call useFormContext()
     * without any component importing react-hook-form directly. This is
     * the whole point of the boundary: BORA fields depend on BORA.
     */
    <FormProvider {...form}>
      <form
        noValidate
        {...formProps}
        onSubmit={handleSubmit(onSubmit)}
      >
        {children}

        {/* `render` receives the live form instance so a BORA-owned save
            bar can read dirty / isSubmitting / errors without BoraForm
            ever deciding what Save means or what success looks like. */}
        {render?.(form)}
      </form>
    </FormProvider>
  );
}
