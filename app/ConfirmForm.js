'use client';

export default function ConfirmForm({ action, confirmMessage, children }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
