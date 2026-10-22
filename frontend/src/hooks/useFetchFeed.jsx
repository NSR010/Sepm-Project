import { useState, useEffect } from 'react';

export function useFetchFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder for actual API fetch
    setTimeout(() => {
      setFeed([{ id: 1, title: 'Sample Art' }]);
      setLoading(false);
    }, 1000);
  }, []);

  return { feed, loading };
}
