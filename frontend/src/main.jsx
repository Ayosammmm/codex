import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
// Polices des thèmes (téléchargées par le navigateur seulement si un thème les utilise)
import '@fontsource/patrick-hand';
import '@fontsource-variable/caveat';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/cinzel';
import '@fontsource-variable/eb-garamond';
import './styles/main.scss';
import { router } from './App';
import { ColorModeProvider } from './theme/ColorModeProvider';
import { ToastProvider } from './components/ui/Toast';
import { SketchFilter } from './components/ui/icons';
import { AuthProvider } from './auth/AuthProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ColorModeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
            <SketchFilter />
          </ToastProvider>
        </ColorModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
