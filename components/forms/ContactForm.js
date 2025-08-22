'use client';

import { useForm } from 'react-hook-form';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function ContactForm({
  onSubmit,
  loading = false,
  submitText = 'Add Contact',
  initialData = {},
  showNickname = true
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: initialData
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Username"
        id="username"
        placeholder="Enter username"
        required
        disabled={loading}
        error={errors.username?.message}
        {...register('username', {
          required: 'Username is required',
          minLength: {
            value: 3,
            message: 'Username must be at least 3 characters'
          },
          pattern: {
            value: /^[a-zA-Z0-9_]+$/,
            message: 'Username can only contain letters, numbers, and underscores'
          }
        })}
      />

      {showNickname && (
        <Input
          label="Nickname (Optional)"
          id="nickname"
          placeholder="Enter a nickname (optional)"
          disabled={loading}
          error={errors.nickname?.message}
          {...register('nickname', {
            maxLength: {
              value: 50,
              message: 'Nickname must be less than 50 characters'
            }
          })}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
        >
          {submitText}
        </Button>
      </div>
    </form>
  );
}