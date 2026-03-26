import type { Metadata } from 'next'
import InstallContent from './install-content'

export const metadata: Metadata = {
  title: 'Install Luminum',
  description: 'Install Luminum as an app on your phone or computer for the best experience.',
}

export default function InstallPage() {
  return <InstallContent />
}
