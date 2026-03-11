'use client'

import { useSession } from '@/lib/auth/client'
import { authClient } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, User, Mail, Shield, Save, ArrowLeft, CheckCircle, AlertCircle, Trash2, Link, Unlink, Eye, EyeOff } from 'lucide-react'

interface Account {
  id: string
  providerId: string
  createdAt: Date | string
  updatedAt: Date | string
  accountId: string
  scopes: string[]
}

type PasswordField = 'current' | 'new' | 'confirm'

export default function AccountSettingsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // State for form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Load user accounts
  const loadAccounts = async () => {
    try {
      const userAccounts = await authClient.listAccounts()
      if (userAccounts && !('error' in userAccounts)) {
        setAccounts(userAccounts as Account[])
      } else {
        setAccounts([])
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
      setAccounts([])
    }
  }

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/sign-in')
    }
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || ''
      }))
      loadAccounts()
    }
  }, [session, isPending, router])

  const clearMessages = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const togglePasswordVisibility = (field: PasswordField) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    clearMessages()

    try {
      await authClient.updateUser({
        name: formData.name,
        image: session?.user?.image
      })
      setSuccessMessage('Profile updated successfully!')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!formData.email || formData.email === session?.user?.email) {
      setErrorMessage('Please enter a new email address.')
      return
    }

    setIsLoading(true)
    clearMessages()

    try {
      await authClient.changeEmail({
        newEmail: formData.email,
        callbackURL: '/account/settings'
      })
      setSuccessMessage('Verification email sent! Please check your current email to approve the change.')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to change email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    clearMessages()

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage('New passwords do not match.')
      setPasswordLoading(false)
      return
    }

    if (formData.newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.')
      setPasswordLoading(false)
      return
    }

    try {
      await authClient.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        revokeOtherSessions: true
      })
      setSuccessMessage('Password changed successfully! Other sessions have been revoked.')
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to change password. Please check your current password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    clearMessages()

    try {
      await authClient.deleteUser({
        callbackURL: '/goodbye'
      })
      setSuccessMessage('Account deletion verification email sent. Please check your email to confirm.')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to delete account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkSocial = async (provider: string) => {
    try {
      await authClient.linkSocial({
        provider,
        callbackURL: '/account/settings'
      })
    } catch (error: any) {
      setErrorMessage(`Failed to link ${provider}. Please try again.`)
    }
  }

  const handleUnlinkAccount = async (providerId: string, accountId: string) => {
    if (!confirm(`Are you sure you want to unlink your ${providerId} account?`)) {
      return
    }

    try {
      await authClient.unlinkAccount({
        providerId,
        accountId
      })
      setSuccessMessage(`${providerId} account unlinked successfully.`)
      loadAccounts()
    } catch (error: any) {
      setErrorMessage(error?.message || `Failed to unlink ${providerId} account.`)
    }
  }

  const handleResendVerification = async () => {
    setIsLoading(true)
    clearMessages()

    try {
      // This would depend on your email verification setup
      setSuccessMessage('Verification email sent!')
    } catch (error) {
      setErrorMessage('Failed to send verification email.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Loading account settings...
            </h2>
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  // Check if user has password account
  const hasPasswordAccount = accounts.some(account => account.providerId === 'credential')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account information and security settings.</p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile Information Card */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-6">
                <User className="h-5 w-5 text-primary mr-3" />
                <h2 className="text-xl font-semibold text-card-foreground">Profile Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-20"
                      placeholder="Enter your email"
                    />
                    {session.user.emailVerified && (
                      <CheckCircle className="absolute right-12 top-2.5 h-5 w-5 text-green-500" />
                    )}
                    {formData.email !== session?.user?.email && (
                      <button
                        type="button"
                        onClick={handleChangeEmail}
                        disabled={isLoading}
                        className="absolute right-2 top-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update'}
                      </button>
                    )}
                  </div>
                  {session.user.emailVerified ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Email verified</p>
                  ) : (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Email not verified</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Account Role
                  </label>
                  <div className="px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground">
                    <span className="capitalize">{(session.user as { role?: string }).role || 'user'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Profile
                </button>
              </div>
            </div>

            {/* Security Settings Card */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-6">
                <Shield className="h-5 w-5 text-primary mr-3" />
                <h2 className="text-xl font-semibold text-card-foreground">Security Settings</h2>
              </div>

              {hasPasswordAccount ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-card-foreground mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        id="currentPassword"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-card-foreground mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter new password (min 8 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-card-foreground mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={passwordLoading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Change Password
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">No Password Set</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You signed in with a social provider. To set a password, please use the forgot password feature.
                  </p>
                  <button
                    onClick={() => router.push('/forgot-password')}
                    className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-card-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Set Password
                  </button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium text-card-foreground mb-3">Account Security</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Two-Factor Authentication</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Not enabled</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active accounts</span>
                    <span className="text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="mt-8 bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">Connected Accounts</h2>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                      <span className="text-primary font-semibold capitalize">
                        {account.providerId.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground capitalize">{account.providerId}</p>
                      <p className="text-sm text-muted-foreground">
                        Connected {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                  </div>
                  {accounts.length > 1 && (
                    <button
                      onClick={() => handleUnlinkAccount(account.providerId, account.id)}
                      className="inline-flex items-center px-3 py-1 border border-destructive text-sm font-medium rounded-md text-destructive bg-background hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive"
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Unlink
                    </button>
                  )}
                </div>
              ))}
              
              {/* Add account options */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-card-foreground mb-3">Link Additional Accounts</h3>
                <div className="flex flex-wrap gap-2">
                  {['google'].map((provider) => (
                    !accounts.some(acc => acc.providerId === provider) && (
                      <button
                        key={provider}
                        onClick={() => handleLinkSocial(provider)}
                        className="inline-flex items-center px-3 py-2 border border-border text-sm font-medium rounded-md text-card-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="mt-8 bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">Account Actions</h2>
            <div className="flex flex-wrap gap-4">
              {!session.user.emailVerified && (
                <button 
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-card-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Resend Verification Email
                </button>
              )}
              
              <button 
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-destructive text-sm font-medium rounded-md text-destructive bg-background hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Account
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Account deletion requires email verification for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  )}