import { Route, Routes } from 'react-router';
import { Shell } from './layout/Shell';
import { About } from './screens/About';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';

/** Stand-in until the screen lands (stuck flow, Started, Data). */
function Placeholder() {
  return null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="stuck" element={<Placeholder />} />
        <Route path="stuck/:attemptId" element={<Placeholder />} />
        <Route path="started/:attemptId" element={<Placeholder />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/data" element={<Placeholder />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}
