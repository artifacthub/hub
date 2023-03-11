import { createRoot } from 'react-dom/client';

import App from './layout/App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
