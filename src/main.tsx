import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './design/fonts';
import './design/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(<App />);
