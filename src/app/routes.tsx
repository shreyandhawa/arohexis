import { lazy, Suspense } from 'react';
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

const Plans = lazy(() => import('./screens/Plans').then((m) => ({ default: m.Plans })));
const PlanEditor = lazy(() =>
  import('./screens/PlanEditor').then((m) => ({ default: m.PlanEditor })),
);

const Insights = lazy(() => import('./screens/Insights').then((m) => ({ default: m.Insights })));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="stuck" element={<Feeling />} />
        <Route path="stuck/:attemptId" element={<ResponseScreen />} />
        <Route path="started/:attemptId" element={<Started />} />
        <Route
          path="plans"
          element={
            <Suspense fallback={null}>
              <Plans />
            </Suspense>
          }
        />
        <Route
          path="plans/new"
          element={
            <Suspense fallback={null}>
              <PlanEditor />
            </Suspense>
          }
        />
        <Route
          path="plans/:planId"
          element={
            <Suspense fallback={null}>
              <PlanEditor />
            </Suspense>
          }
        />
        <Route
          path="insights"
          element={
            <Suspense fallback={null}>
              <Insights />
            </Suspense>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/parts" element={<SettingsParts />} />
        <Route path="settings/data" element={<SettingsData />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}
