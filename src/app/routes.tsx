import { Route, Routes } from 'react-router';
import { Shell } from './layout/Shell';
import { About } from './screens/About';
import { Feeling } from './screens/Feeling';
import { Home } from './screens/Home';
import { ResponseScreen } from './screens/ResponseScreen';
import { Settings } from './screens/Settings';
import { SettingsData } from './screens/SettingsData';
import { SettingsParts } from './screens/SettingsParts';
import { Started } from './screens/Started';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="stuck" element={<Feeling />} />
        <Route path="stuck/:attemptId" element={<ResponseScreen />} />
        <Route path="started/:attemptId" element={<Started />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/parts" element={<SettingsParts />} />
        <Route path="settings/data" element={<SettingsData />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}
