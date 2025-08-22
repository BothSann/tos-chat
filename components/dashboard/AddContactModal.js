'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useContactStore, useUIStore } from '@/store/useStore';
import ModalForm from '../ui/ModalForm';
import Input from '../ui/Input';

export default function AddContactModal({ isOpen, onClose }) {
  const { addContact, loadContacts } = useContactStore();
  const { addNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setError } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await addContact(data.username, data.nickname || '');
      
      // Reload contacts to ensure UI is updated
      await loadContacts();
      
      addNotification({
        type: 'success',
        title: 'Contact Added',
        message: `${data.username} has been added to your contacts`,
        duration: 3000
      });

      reset();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add contact';
      
      if (error.response?.status === 401) {
        addNotification({
          type: 'error',
          title: 'Authentication Error',
          message: 'Your session has expired. Please refresh the page and log in again.',
          duration: 8000
        });
      } else if (error.response?.data?.error === 'VALIDATION_ERROR') {
        setError('username', { message: errorMessage });
      } else {
        addNotification({
          type: 'error',
          title: 'Failed to Add Contact',
          message: errorMessage,
          duration: 5000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Contact"
      onSubmit={handleSubmit(onSubmit)}
      loading={isLoading}
      submitText="Add Contact"
    >
      <Input
        label="Username"
        id="username"
        placeholder="Enter username"
        required
        disabled={isLoading}
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

      <Input
        label="Nickname (Optional)"
        id="nickname"
        placeholder="Enter a nickname (optional)"
        disabled={isLoading}
        error={errors.nickname?.message}
        {...register('nickname', {
          maxLength: {
            value: 50,
            message: 'Nickname must be less than 50 characters'
          }
        })}
      />
    </ModalForm>
  );
}