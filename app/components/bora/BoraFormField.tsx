'use client';

import type { ReactNode } from 'react';

import {
  useFormContext,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

/*
 * BORA FORM FIELD — presentation only.
 *
 * Registration + dirty state come from React Hook Form. Every visual
 * decision here is a BORA token (`--bora-*`), exactly like
 * OperationsField and UIPropertyControl. This component introduces no
 * styling source of its own.
 *
 * It renders a CHILD via `children` (the caller's own input) rather
 * than an <input>, so BORA keeps control of the actual control markup.
 */

export interface BoraFormFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>
> {
  name: TName;
  label: string;
  hint?: string;

  /**
   * The caller's control, rendered with the `register()` result and the
   * matching `boraFieldId(name)` so the label stays associated.
   *
   * BoraFormField deliberately does not render an <input>: the actual
   * control markup stays BORA's (see OperationsField,
   * UIPropertyControl), and only REGISTRATION comes from RHF.
   */
  children: (args: {
    register: ReturnType<
      ReturnType<typeof useFormContext<TValues>>['register']
    >;
    id: string;
  }) => ReactNode;

  /** Override the error presentation. Copy itself comes from BORA's
   *  Zod schema via RHF. */
  renderError?: (message: string) => ReactNode;
}

export default function BoraFormField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>
>({
  name,
  label,
  hint,
  children,
  renderError,
}: BoraFormFieldProps<TValues, TName>) {
  const form = useFormContext<TValues>();

  const id = boraFieldId(String(name));

  const fieldError = form.formState.errors[name];
  const message =
    fieldError && 'message' in fieldError
      ? String(fieldError.message ?? '')
      : '';

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </label>

      {children({ register: form.register(name), id })}

      {hint && !message && (
        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {hint}
        </p>
      )}

      {/*
        role="alert" so a validation message is announced. The copy is
        BORA's, supplied through the schema — the library never writes
        user-facing text.
      */}
      {message && (
        <p
          role="alert"
          className="mt-1 text-[6px] font-black uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-red)' }}
        >
          {renderError ? renderError(message) : message}
        </p>
      )}
    </div>
  );
}

/** Input id helper, so a caller's control can match its BoraFormField. */
export function boraFieldId(name: string): string {
  return `bora-field-${name}`;
}
