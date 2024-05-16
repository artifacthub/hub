import { useEffect } from 'react';
import { useLocation } from 'react-router';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useOnLocationChange = (handleLocationChange: any) => {
  const location = useLocation();
  useEffect(() => handleLocationChange(location), [location, handleLocationChange]);
};

export default useOnLocationChange;
