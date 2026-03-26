import InstallContent from './install-content'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers()
  const orgName = hdrs.get('x-org-name')
  return {
    title: orgName ? `Install ${orgName}` : 'Install Luminum',
    description: orgName
      ? `Install ${orgName} as an app on your device.`
      : 'Install Luminum as an app on your phone or computer for the best experience.',
  }
}

export default async function InstallPage() {
  const hdrs = await headers()
  const orgName = hdrs.get('x-org-name') || undefined
  const orgLogo = hdrs.get('x-org-logo') || undefined

  return <InstallContent orgName={orgName} orgLogo={orgLogo} />
}
