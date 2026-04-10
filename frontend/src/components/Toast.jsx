import { CheckCircle2, X } from 'lucide-react'

export default function Toast({ message, onClose }) {
  if (!message) return null
  
  return (
    <div className="toast animate-fade-in-up">
      <CheckCircle2 size={18} className="toast-icon" />
      <span>{message}</span>
      <button type="button" className="icon-btn" onClick={onClose} style={{ marginLeft: 'var(--space-md)' }}><X size={14} /></button>
    </div>
  )
}
