import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './layout/App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
