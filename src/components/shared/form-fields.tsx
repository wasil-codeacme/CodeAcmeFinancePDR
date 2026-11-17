'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Radix Select cannot hold an empty-string value, so "none" travels as this token.
const EMPTY_OPTION_VALUE = '__none__';

export type SelectOption = { value: string; label: string };
export type SelectOptionGroup = { label: string; options: SelectOption[] };

type FieldShellProps = {
  name: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

function FieldShell({ name, label, hint, className, children }: FieldShellProps) {
  const { fieldState } = useController({ name });
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {fieldState.error?.message ? (
        <p className="text-destructive text-xs" role="alert">
          {fieldState.error.message}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  name: string;
  label: string;
  hint?: string;
  className?: string;
} & Pick<
  ComponentProps<'input'>,
  'type' | 'placeholder' | 'inputMode' | 'autoComplete' | 'autoFocus'
>;

export function TextField({ name, label, hint, className, ...inputProps }: TextFieldProps) {
  const { register, getFieldState, formState } = useFormContext();
  const invalid = Boolean(getFieldState(name, formState).error);
  return (
    <FieldShell name={name} label={label} hint={hint} className={className}>
      <Input id={name} aria-invalid={invalid} {...inputProps} {...register(name)} />
    </FieldShell>
  );
}

export function NumberTextField(props: Omit<TextFieldProps, 'type' | 'inputMode'>) {
  return <TextField {...props} type="text" inputMode="decimal" />;
}

export function TextareaField({ name, label, hint, className }: Omit<TextFieldProps, 'type'>) {
  const { register } = useFormContext();
  return (
    <FieldShell name={name} label={label} hint={hint} className={className}>
      <Textarea id={name} rows={2} {...register(name)} />
    </FieldShell>
  );
}

type SelectFieldProps = {
  name: string;
  label: string;
  hint?: string;
  className?: string;
  placeholder?: string;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  emptyLabel?: string;
};

export function SelectField({
  name,
  label,
  hint,
  className,
  placeholder,
  options,
  groups,
  emptyLabel,
}: SelectFieldProps) {
  const { field, fieldState } = useController({ name });
  const value =
    field.value === '' || field.value === null || field.value === undefined
      ? undefined
      : String(field.value);
  return (
    <FieldShell name={name} label={label} hint={hint} className={className}>
      <Select
        value={value ?? (emptyLabel ? EMPTY_OPTION_VALUE : undefined)}
        onValueChange={(next) => field.onChange(next === EMPTY_OPTION_VALUE ? '' : next)}
      >
        <SelectTrigger
          id={name}
          aria-invalid={Boolean(fieldState.error)}
          className="w-full"
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel ? <SelectItem value={EMPTY_OPTION_VALUE}>{emptyLabel}</SelectItem> : null}
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          {groups?.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
}: {
  name: string;
  label: string;
  hint?: string;
}) {
  const { field } = useController({ name });
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={name}
        checked={Boolean(field.value)}
        onCheckedChange={(checked) => field.onChange(checked === true)}
        className="mt-0.5"
      />
      <div className="grid gap-0.5">
        <Label htmlFor={name} className="font-normal">
          {label}
        </Label>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
    </div>
  );
}
