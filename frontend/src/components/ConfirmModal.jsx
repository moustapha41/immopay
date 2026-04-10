import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', 
          color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 'var(--space-lg)'
        }}>
          <AlertTriangle size={30} />
        </div>
        <p style={{ fontSize: 'var(--font-md)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-md)', width: '100%', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, justifyItems: 'center', display: 'flex', justifyContent: 'center', background: 'var(--danger)', borderColor: 'var(--danger)' }}>
            Oui, supprimer
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal
