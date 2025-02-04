import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import './App.css';

// Import your routes/pages
import EstimatePage from './pages/Estimate';

const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Router>
          <EstimatePage />
          <Toaster />
        </Router>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;