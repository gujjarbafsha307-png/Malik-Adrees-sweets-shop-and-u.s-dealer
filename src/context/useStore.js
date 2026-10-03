import { useContext } from 'react'
import { StoreContext } from './store-value'

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
