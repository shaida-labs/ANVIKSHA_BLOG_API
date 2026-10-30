import { ToastProvider } from './components/ui/ToastProvider'
import { AuthProvider } from './contexts/AuthProvider'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  )
}
