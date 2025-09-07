import { useEffect, useState } from 'react';
import './App.css';
import PresenterView from './views/PresenterView';
import AudienceView from './views/AudienceView';

function App() {
  const [path, setPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (path.startsWith('/audience')) return <AudienceView />;
  // default to presenter view
  return <PresenterView />;
}

export default App;
