'use client';

import Modal from './Modal';
import Button from './Button';

export default function ModalForm({
  isOpen,
  onClose,
  title,
  onSubmit,
  loading = false,
  submitText = 'Submit',
  cancelText = 'Cancel',
  children,
  size = 'md',
  submitDisabled = false,
  submitVariant = 'primary',
  ...props
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size={size}>
      <form onSubmit={handleSubmit} className="space-y-4" {...props}>
        {/* Form Content */}
        <div className="space-y-4">
          {children}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant={submitVariant}
            loading={loading}
            disabled={loading || submitDisabled}
          >
            {loading ? 'Processing...' : submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}