import { useState, useEffect, useCallback } from 'react';

const useReelsData = (apiBaseUrl = 'http://localhost:3000/api/v1') => {
  const [reelsData, setReelsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Get auth token from storage (implement based on your auth system)
  const getAuthToken = async () => {
    // TODO: Implement your token retrieval logic
    // For now, return a placeholder
    return 'your-auth-token-here';
  };

  // Fetch reels data from your feed API
  const fetchReelsData = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      
      // Fetch products with reels only
      const response = await fetch(
        `${apiBaseUrl}/feed/personalized?reelsOnly=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data.products) {
        const products = data.data.products;
        
        if (reset) {
          setReelsData(products);
        } else {
          setReelsData(prev => [...prev, ...products]);
        }

        // Check if there are more items to load
        setHasMore(products.length > 0);
      } else {
        throw new Error(data.message || 'Failed to fetch reels data');
      }
    } catch (err) {
      console.error('Error fetching reels data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Fetch category-specific reels
  const fetchCategoryReels = useCallback(async (category) => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      
      const response = await fetch(
        `${apiBaseUrl}/feed/personalized?category=${category}&reelsOnly=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data.products) {
        setReelsData(data.data.products);
        setHasMore(data.data.products.length > 0);
      } else {
        throw new Error(data.message || 'Failed to fetch category reels');
      }
    } catch (err) {
      console.error('Error fetching category reels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Load more reels (for pagination if implemented)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchReelsData(false);
    }
  }, [loading, hasMore, fetchReelsData]);

  // Refresh reels data
  const refresh = useCallback(() => {
    fetchReelsData(true);
  }, [fetchReelsData]);

  // Initial load
  useEffect(() => {
    fetchReelsData(true);
  }, [fetchReelsData]);

  return {
    reelsData,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    fetchCategoryReels,
  };
};

export default useReelsData;
