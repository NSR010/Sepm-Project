import { useState, useEffect } from 'react';
import api from '../services/api';

export function useAnalytics(userId) {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalViews: 0, totalLikes: 0, totalContents: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics');
        if (response.data && response.data.data) {
          setData(response.data.data);
          setStats({
            totalViews: response.data.totalViews || 0,
            totalLikes: response.data.totalLikes || 0,
            totalContents: response.data.totalContents || 0
          });
        }
      } catch (err) {
        console.warn('Could not fetch backend analytics, using fallback trend data:', err.message);
        setData([
          { name: 'May', views: 240 },
          { name: 'Jun', views: 320 },
          { name: 'Jul', views: 480 },
          { name: 'Aug', views: 390 },
          { name: 'Sep', views: 610 },
          { name: 'Oct', views: 850 }
        ]);
      }
    };

    fetchAnalytics();
  }, [userId]);

  return { data, stats };
}
