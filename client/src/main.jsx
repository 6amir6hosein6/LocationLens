import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SplashScreen } from '@capacitor/splash-screen'

const APP_START_TIME = Date.now()
const MIN_SPLASH_MS = 3000

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// After React mounts and paints, wait until at least 3 seconds have passed
// since app start, then hide the native splash screen.
function tryHideSplash() {
  const elapsed = Date.now() - APP_START_TIME
  const remaining = Math.max(0, MIN_SPLASH_MS - elapsed)

  setTimeout(() => {
    try {
      SplashScreen.hide()
    } catch {
      // noop in browser or if plugin unavailable
    }
  }, remaining)
}

requestAnimationFrame(() => {
  requestAnimationFrame(tryHideSplash)
})
