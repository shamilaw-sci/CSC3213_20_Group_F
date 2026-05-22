import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// 1. Import the Google Provider
import { GoogleOAuthProvider } from '@react-oauth/google'

// 2. Access your Client ID from the .env file we just created
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 3. Wrap App with the Provider and pass the Client ID */}
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)