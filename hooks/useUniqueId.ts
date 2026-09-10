import { useId } from 'react';

/**
 * Hook to generate a stable unique ID prefix for a component instance.
 * Optionally accepts a prefix string to make the ID more descriptive.
 * Returns a function that can be used to generate IDs with a suffix.
 */
export const useUniqueId = (prefix: string = 'uid') => {
  // React 18's useId guarantees a unique ID across the whole app.
  const id = useId();
  const base = `${prefix}-${id}`;
  return (suffix?: string) => (suffix ? `${base}-${suffix}` : base);
};
