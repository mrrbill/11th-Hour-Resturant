import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { logVisit } from './lib/visits'
import { unlockAudioOnFirstTap } from './lib/sound'
import './index.css'

logVisit()
unlockAudioOnFirstTap()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
