import { useState } from 'react';

const useMemoFilter = () => {
  const [filter, setFilter] = useState<string>('');

  const applyFilter = (newFilter: string) => {
    setFilter(newFilter);
  };

  return { filter, applyFilter };
};

export default useMemoFilter;