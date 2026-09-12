import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { ModulePage } from './pages/ModulePage';
import { LessonPage } from './pages/LessonPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/module/:moduleId" element={<ModulePage />} />
          <Route path="/module/:moduleId/:lessonId" element={<LessonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
