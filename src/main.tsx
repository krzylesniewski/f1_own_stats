import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { CACHE_BUSTER, CACHE_MAX_AGE, persister, queryClient } from './queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' },
      }}
    >
      <HashRouter>
        <App />
      </HashRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
