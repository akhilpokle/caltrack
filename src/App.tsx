import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Log from './pages/Log'
import Meals from './pages/Meals'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  return (
    <HashRouter>
      <div className="shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/log" element={<Log />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
