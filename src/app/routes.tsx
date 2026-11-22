import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Shell } from './layout/Shell';
import { Feeling } from './screens/Feeling';
import { Home } from './screens/Home';
import { ResponseScreen } from './screens/ResponseScreen';
import { Started } from './screens/Started';

const Plans = lazy(() => import('./screens/Plans').then((m) => ({ default: m.Plans })));
const PlanEditor = lazy(() =>
  import('./screens/PlanEditor').then((m) => ({ default: m.PlanEditor })),
);

const About = lazy(() => import('./screens/About').then((m) => ({ default: m.About })));
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })));
const SettingsParts = lazy(() =>
  import('./screens/SettingsParts').then((m) => ({ default: m.SettingsParts })),
);
const SettingsData = lazy(() =>
  import('./screens/SettingsData').then((m) => ({ default: m.SettingsData })),
);
const SettingsFeelings = lazy(() =>
  import('./screens/SettingsFeelings').then((m) => ({ default: m.SettingsFeelings })),
);
const SettingsObstacles = lazy(() =>
  import('./screens/SettingsObstacles').then((m) => ({ default: m.SettingsObstacles })),
);
const Welcome = lazy(() => import('./screens/Welcome').then((m) => ({ default: m.Welcome })));
const Setup = lazy(() => import('./screens/Setup').then((m) => ({ default: m.Setup })));

const Insights = lazy(() => import('./screens/Insights').then((m) => ({ default: m.Insights })));
const Checkin = lazy(() => import('./screens/Checkin').then((m) => ({ default: m.Checkin })));
const Replay = lazy(() => import('./screens/Replay').then((m) => ({ default: m.Replay })));

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="welcome"
        element={
          <Suspense fallback={null}>
            <Welcome />
          </Suspense>
        }
      />
      <Route
        path="setup"
        element={
          <Suspense fallback={null}>
            <Setup />
          </Suspense>
        }
      />
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
        <Route
          path="replay"
          element={
            <Suspense fallback={null}>
              <Replay />
            </Suspense>
          }
        />
        <Route
          path="checkin"
          element={
            <Suspense fallback={null}>
              <Checkin />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={null}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="settings/parts"
          element={
            <Suspense fallback={null}>
              <SettingsParts />
            </Suspense>
          }
        />
        <Route
          path="settings/feelings"
          element={
            <Suspense fallback={null}>
              <SettingsFeelings />
            </Suspense>
          }
        />
        <Route
          path="settings/obstacles"
          element={
            <Suspense fallback={null}>
              <SettingsObstacles />
            </Suspense>
          }
        />
        <Route
          path="settings/data"
          element={
            <Suspense fallback={null}>
              <SettingsData />
            </Suspense>
          }
        />
        <Route
          path="about"
          element={
            <Suspense fallback={null}>
              <About />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
