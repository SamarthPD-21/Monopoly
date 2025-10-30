import '../styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '../context/AuthContext'
import Layout from '../components/Layout'
import { ModalProvider } from '../context/ModalContext'
import { ToastContainer } from 'react-toastify'
import { ConfirmProvider } from '../components/ConfirmProvider'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ModalProvider>
        <ConfirmProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            toastClassName="cyberpunk-toast"
          />
        </ConfirmProvider>
      </ModalProvider>
    </AuthProvider>
  )
}
