import React from 'react'
import ReactDOM from 'react-dom/client'
import './main.css'
import { App } from './App'
import { ThemeProvider } from 'theme'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
)
