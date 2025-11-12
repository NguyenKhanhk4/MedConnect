import React from "react";
import Layout from "./core/Layout";
import { useQuery } from "@tanstack/react-query";

// API base can be configured via Vite env var VITE_API_BASE (e.g. http://localhost:3000)
// Optional prefix can be set via VITE_API_PREFIX (default '/api')
const apiBaseFromEnv = import.meta.env.VITE_API_BASE;
const apiPrefixFromEnv = import.meta.env.VITE_API_PREFIX || "/api";

const buildApiUrl = (path) => {
  // if VITE_API_BASE is provided, use it (no trailing slash assumptions)
  if (apiBaseFromEnv) {
    return `${apiBaseFromEnv.replace(/\/+$/, "")}${apiPrefixFromEnv}${
      path.startsWith("/") ? path : `/${path}`
    }`;
  }
  // fallback: assume backend on localhost:3000 (legacy default)
  return `http://localhost:3000${apiPrefixFromEnv}${
    path.startsWith("/") ? path : `/${path}`
  }`;
};

const App = () => {
  // Only make API call in development for testing
  const { data, error, isError } = useQuery({
    queryKey: ["test"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/users"), {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      return res.json();
    },
    // Only run in development
    enabled: import.meta.env.DEV,
    // Increase stale time to reduce calls
    staleTime: 1000 * 30, // 30 seconds
    // Cache for 5 minutes
    gcTime: 1000 * 60 * 5,
  });

  // Error handling in development
  if (import.meta.env.DEV && isError) {
    console.error("Fetch users error:", error);
  }

  return <Layout />;
};

export default App;
