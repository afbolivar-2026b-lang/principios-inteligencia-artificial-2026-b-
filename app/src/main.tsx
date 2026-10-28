import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import './tokens.css'
import './index.css'
import App from './App'
import { LimiteDeError } from './components/LimiteDeError'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteDeError>
      <App />
    </LimiteDeError>
  </StrictMode>,
)
