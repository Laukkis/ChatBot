import { useState, useEffect } from "react";

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  responseType?: "json" | "text" | "blob" | "arrayBuffer" | "stream";
}

export function useFetch(url: string, options: FetchOptions) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(url, {
          method: options.method || "GET",
          headers: options.headers,
          body: options.body ? JSON.stringify(options.body) : null,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let responseData;
        switch (options.responseType) {
          case "json":
            responseData = await response.json();
            break;
          case "text":
            responseData = await response.text();
            break;
          case "blob":
            responseData = await response.blob();
            break;
          case "arrayBuffer":
            responseData = await response.arrayBuffer();
            break;
          case "stream":
            responseData = response.body;
            break;
          default:
            responseData = await response.json();
        }

        setData(responseData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, options]);

  return { data, error, loading };
}
