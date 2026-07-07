'use client';

import { useState } from 'react';

export default function SelectOrNew({ name, options, required, defaultValue = '' }) {
  const startsAsNew = defaultValue && !options.includes(defaultValue);
  const [isNew, setIsNew] = useState(startsAsNew);

  if (isNew) {
    return (
      <div className="select-or-new">
        <input name={name} defaultValue={defaultValue} required={required} autoFocus />
        {options.length > 0 && (
          <button type="button" className="btn-sm" onClick={() => setIsNew(false)}>
            Escolher da lista
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue || ''}
      onChange={(e) => {
        if (e.target.value === '__novo__') setIsNew(true);
      }}
    >
      <option value="" disabled>
        Selecione...
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value="__novo__">+ Adicionar novo...</option>
    </select>
  );
}
