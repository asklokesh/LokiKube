import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Head from 'next/head';
import { useEffect } from 'react';
import { useClusterStore } from '@/store/clusterStore';

// Create a react-query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const { theme, primaryColor } = useClusterStore();

  useEffect(() => {
    // Apply theme
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply primary color
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    
    // Calculate darker and lighter variants
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const darker = `#${Math.max(0, r - 30).toString(16).padStart(2, '0')}${Math.max(0, g - 30).toString(16).padStart(2, '0')}${Math.max(0, b - 30).toString(16).padStart(2, '0')}`;
    const lighter = `#${Math.min(255, r + 30).toString(16).padStart(2, '0')}${Math.min(255, g + 30).toString(16).padStart(2, '0')}${Math.min(255, b + 30).toString(16).padStart(2, '0')}`;
    
    document.documentElement.style.setProperty('--color-primary-dark', darker);
    document.documentElement.style.setProperty('--color-primary-light', lighter);
  }, [theme, primaryColor]);

  return (
    <>
      <Head>
        <title>LokiKube - Kubernetes Cluster Management</title>
        <meta name="description" content="Modern Kubernetes cluster management web application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </>
  );
} 