import { useState, useEffect } from 'react';
import api from '../services/api';

export function useFetchFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await api.get('/feed');
        if (response.data && response.data.feed) {
          setFeed(response.data.feed);
        }
      } catch (err) {
        console.warn('Could not connect to backend feed API, using fallback feed:', err.message);
        setFeed([
          { id: 1, title: 'Illusion Architecture (Art)', type: 'art' },
          { id: 2, title: 'Spectral Shadows (Photography)', type: 'photography' },
          { id: 3, title: 'The Echo of Silence (Performance)', type: 'performance' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  return { feed, loading };
}
