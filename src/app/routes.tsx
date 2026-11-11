import { Route, Routes } from 'react-router';
import { Shell } from './layout/Shell';
import { About } from './screens/About';
import { Feeling } from './screens/Feeling';
import { Home } from './screens/Home';
import { ResponseScreen } from './screens/ResponseScreen';
import { Settings } from './screens/Settings';
import { Started } from './screens/Started';

/** Stand-in until the screen lands (Data). */
function Placeholder() {
  return null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="stuck" element={<Feeling />} />
        <Route path="stuck/:attemptId" element={<ResponseScreen />} />
        <Route path="started/:attemptId" element={<Started />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/data" element={<Placeholder />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}
