import { BrowserRouter } from 'react-router';
import { DataProvider } from './data/DataProvider';
import { AppRoutes } from './routes';

export function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DataProvider>
  );
}
