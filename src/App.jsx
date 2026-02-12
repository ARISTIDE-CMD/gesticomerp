import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { appRoutes } from './route.jsx';

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        {appRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
