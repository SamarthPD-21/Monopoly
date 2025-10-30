import React, { createContext, useContext, useState } from 'react'
import Modal from '../components/Modal'
import LoginForm from '../components/LoginForm'
import SignupForm from '../components/SignupForm'
import { useAuth } from './AuthContext'

type ModalType = 'login' | 'signup' | null

type ModalContextValue = {
  openModal: (t: ModalType) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined)

export function useModal() { const ctx = useContext(ModalContext); if (!ctx) throw new Error('useModal must be used within ModalProvider'); return ctx }

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState<ModalType>(null)
  const { loginWithToken } = useAuth()

  function openModal(t: ModalType) { setType(t) }
  function closeModal() { setType(null) }

  function handleLogin(token: string, username?: string) {
    // let AuthContext persist token
    try { loginWithToken(token, undefined, username) } catch {}
    closeModal()
  }

  function handleSignup(token: string, username?: string) {
    // Auto-login after signup with the returned token
    try { loginWithToken(token, undefined, username) } catch {}
    closeModal()
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {type === 'login' && (
        <Modal onClose={closeModal}>
          <LoginForm onLogin={(t) => handleLogin(t)} onCancel={closeModal} />
        </Modal>
      )}
      {type === 'signup' && (
        <Modal onClose={closeModal}>
          <SignupForm onSignup={(t) => handleSignup(t)} onCancel={closeModal} />
        </Modal>
      )}
    </ModalContext.Provider>
  )
}

export default ModalContext
