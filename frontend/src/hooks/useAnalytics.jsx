import { useState, useEffect } from 'react';

export function useAnalytics(userId) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Placeholder for analytics fetch
    setData([{ name: 'Jan', views: 400 }, { name: 'Feb', views: 300 }]);
  }, [userId]);

  return { data };
}
