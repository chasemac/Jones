import React from 'react';

// Shared section header used across all location panels.
// Extracted from the 8 panels that each had an identical copy.
export const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
    <h3 className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>{children}</h3>
    {right}
  </div>
);
