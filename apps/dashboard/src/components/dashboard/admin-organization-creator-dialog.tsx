"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import {
  Building2,
  UserIcon,
  Mail,
  Globe,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  X,
  ImageIcon,
  MapPin,
  DollarSign,
  CreditCard,
  Calendar,
  Gift,
  Search,
  Clock,
  Sparkles,
} from "lucide-react"
import { api } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { countries } from "@/lib/countries"
import { currencies } from "@/lib/currencies"
import type { PaystackCustomerWithSubscriptions, PaystackSubscription } from "@/lib/types/subscription"

interface AdminOrganizationCreatorDialogProps {
  onOrganizationCreated?: () => void
}

export function AdminOrganizationCreatorDialog({ onOrganizationCreated }: AdminOrganizationCreatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string; image?: string }[]>([])
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subscriptionType, setSubscriptionType] = useState<"trial" | "free" | "existing_paid">("trial")
  const [trialEndDate, setTrialEndDate] = useState("")
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [foundCustomers, setFoundCustomers] = useState<PaystackCustomerWithSubscriptions[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<PaystackCustomerWithSubscriptions | null>(null)
  const [selectedSubscription, setSelectedSubscription] = useState<PaystackSubscription | null>(null)

  const [formData, setFormData] = useState({
    // Client information (Step 1)
    clientName: "",
    clientEmail: "",
    // Organization details (Step 2)
    name: "",
    slug: "",
    domain: "",
    country: "ZA", // Default to South Africa
    currency: "ZAR", // Default to South African Rand
    paymentProvider: "paystack", // Default to Paystack
    logoUrl: "",
    // Owner assignment (Step 4)
    ownerType: "existing" as "existing" | "invitation",
    ownerEmail: "",
    existingUserId: "",
  })

  const countryOptions = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name,
  }))

  const currencyOptions = Object.entries(currencies).map(([code, currency]) => ({
    code,
    name: currency.name,
    symbol: currency.symbol,
  }))

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  useEffect(() => {
    // Auto-generate organization name from client name
    if (formData.clientName && !formData.name) {
      setFormData((prev) => ({ ...prev, name: `${formData.clientName}'s Organization` }))
    }
  }, [formData.clientName])

  useEffect(() => {
    // Auto-generate slug from name
    if (formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name])

  useEffect(() => {
    // Auto-populate owner email from client email when invitation is selected
    if (formData.clientEmail && formData.ownerType === "invitation" && !formData.ownerEmail) {
      setFormData((prev) => ({ ...prev, ownerEmail: formData.clientEmail }))
    }
  }, [formData.clientEmail, formData.ownerType])

  useEffect(() => {
    // Auto-populate customer search with client email when existing_paid is selected
    if (formData.clientEmail && subscriptionType === "existing_paid" && !customerSearchQuery) {
      setCustomerSearchQuery(formData.clientEmail)
    }
  }, [formData.clientEmail, subscriptionType])

  const fetchUsers = async () => {
    const result = await api.admin.getUsers()
    if (result.success) {
      setUsers(result.users ?? [])
    }
  }

  const checkDomain = async (domain: string) => {
    if (!domain) {
      setDomainAvailable(null)
      return
    }

    const result = await api.admin.checkDomain(domain)
    setDomainAvailable(result.available)
  }

  const handleDomainChange = (domain: string) => {
    setFormData((prev) => ({ ...prev, domain }))
    // Debounce domain check
    setTimeout(() => checkDomain(domain), 500)
  }

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }

      setLogoFile(file)
      setError("")

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      setLogoUploading(true)
      try {
        const bytes = await file.arrayBuffer()
        const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))

        const result = await api.uploads.logoToCloudinary({
          logoBase64,
          organizationName: formData.name,
          fileName: file.name,
          contentType: file.type,
        })

        const res = result as { success?: boolean; url?: string; error?: string }
        if (res.success && res.url) {
          setFormData((prev) => ({ ...prev, logoUrl: res.url! }))
        } else {
          setError(res.error || "Failed to upload logo")
        }
      } catch (error) {
        setError("Failed to upload logo")
      } finally {
        setLogoUploading(false)
      }
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setFormData((prev) => ({ ...prev, logoUrl: "" }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const searchPaystackCustomers = async () => {
    if (!customerSearchQuery.trim()) {
      setError("Please enter an email to search")
      return
    }

    setSearchingCustomers(true)
    setError("")

    try {
      const result = await api.admin.searchPaystackCustomers(customerSearchQuery.trim())

      if (result.success && result.customers) {
        setFoundCustomers(result.customers)
        if (result.customers.length === 0) {
          setError("No customers found with active subscriptions for this email")
        }
      } else {
        setError(result.error || "Failed to search customers")
      }
    } catch (error) {
      setError("Failed to search customers")
    } finally {
      setSearchingCustomers(false)
    }
  }

  const canProceedToStep2 = formData.clientName && formData.clientEmail
  const canProceedToStep3 = canProceedToStep2 && formData.name && formData.slug && formData.domain && domainAvailable
  const canProceedToStep4 = canProceedToStep3 // Logo is optional
  const canProceedToStep5 =
    canProceedToStep4 &&
    (subscriptionType === "free" ||
      (subscriptionType === "trial" && trialEndDate) ||
      (subscriptionType === "existing_paid" && selectedCustomer && selectedSubscription))
  const canSubmit =
    canProceedToStep5 &&
    ((formData.ownerType === "existing" && formData.existingUserId) ||
      (formData.ownerType === "invitation" && formData.ownerEmail))

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      // Validate form data before submission
      if (!formData.name.trim()) {
        throw new Error("Organization name is required")
      }

      if (!formData.slug.trim()) {
        throw new Error("Organization slug is required")
      }

      if (formData.ownerType === "existing" && !formData.existingUserId) {
        throw new Error("Please select a user to assign as owner")
      }

      if (formData.ownerType === "invitation" && !formData.ownerEmail.trim()) {
        throw new Error("Please enter an email address for the invitation")
      }

      // Validate subscription data
      if (subscriptionType === "trial" && !trialEndDate) {
        throw new Error("Please set a trial end date")
      }

      if (subscriptionType === "existing_paid" && (!selectedCustomer || !selectedSubscription)) {
        throw new Error("Please select a customer and subscription")
      }

      const result = await api.admin.createOrganization({
        organizationData: {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          domain: formData.domain.trim(),
          country: formData.country,
          currency: formData.currency,
          paymentProvider: formData.paymentProvider,
          logo: formData.logoUrl,
        },
        ownerAssignment: {
          type: formData.ownerType === "existing" ? "existing_user" : "invitation",
          userId: formData.ownerType === "existing" ? formData.existingUserId : undefined,
          email: formData.ownerType === "invitation" ? formData.ownerEmail.trim() : undefined,
          name: formData.ownerType === "invitation" ? formData.clientName.trim() : undefined,
        },
        subscriptionConfig: {
          type: subscriptionType,
          trialEndDate: subscriptionType === "trial" ? trialEndDate : undefined,
          paystackSubscriptionId:
            subscriptionType === "existing_paid" ? selectedSubscription?.subscription_code : undefined,
        },
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setStep(1)
          setSuccess(false)
          // Reset all form data
          setFormData({
            clientName: "",
            clientEmail: "",
            name: "",
            slug: "",
            domain: "",
            country: "ZA",
            currency: "ZAR",
            paymentProvider: "paystack",
            logoUrl: "",
            ownerType: "existing",
            ownerEmail: "",
            existingUserId: "",
          })
          setSubscriptionType("trial")
          setTrialEndDate("")
          setCustomerSearchQuery("")
          setFoundCustomers([])
          setSelectedCustomer(null)
          setSelectedSubscription(null)
          onOrganizationCreated?.()
        }, 2000)
      } else {
        setError(result.error || "Failed to create organization")
      }
    } catch (error: any) {
      console.error("Organization creation error:", error)
      setError(error.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <Building2 className="w-4 h-4 mr-2" />
            Create Organization
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Organization Created!</h3>
            <p className="text-muted-foreground text-center">
              The organization has been created successfully.{" "}
              {formData.ownerType === "invitation" && "An invitation has been sent to the owner."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
          <Building2 className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background to-muted/20">
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span>Create New Organization</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            Step {step} of 5:{" "}
            {step === 1
              ? "Client Information"
              : step === 2
                ? "Organization Details"
                : step === 3
                  ? "Logo Upload (Optional)"
                  : step === 4
                    ? "Subscription Setup"
                    : "Owner Assignment"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="border-destructive/50 bg-destructive/10 shadow-sm">
            <AlertDescription className="text-destructive font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Client Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Client Information</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                First, let's gather the basic information about the client who will own this organization.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm font-medium">
                  Client Name
                </Label>
                <Input
                  id="clientName"
                  placeholder="John Doe"
                  value={formData.clientName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                  className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-sm font-medium">
                  Client Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clientEmail: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Organization Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Organization Details</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Now let's set up the organization details. The organization name will be auto-generated from the client name, but you can modify it.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Organization Name
                </Label>
                <Input
                  id="name"
                  placeholder="Acme Corporation"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium">
                  Slug
                </Label>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm font-medium">
                Domain
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="domain"
                  placeholder="example.com"
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  value={formData.domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                />
              </div>
              {domainAvailable === false && (
                <p className="text-sm text-destructive font-medium">This domain is already taken</p>
              )}
              {domainAvailable === true && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Domain is available</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Country</Label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-full justify-between bg-background/50 border-border/50 hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {formData.country
                            ? countryOptions.find((country) => country.code === formData.country)?.name
                            : "Select country..."}
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search countries..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {countryOptions.map((country) => (
                            <CommandItem
                              key={country.code}
                              value={country.name}
                              onSelect={() => {
                                setFormData((prev) => ({ ...prev, country: country.code }))
                                setCountryOpen(false)
                              }}
                            >
                              {country.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={currencyOpen}
                      className="w-full justify-between bg-background/50 border-border/50 hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {formData.currency
                            ? `${currencyOptions.find((currency) => currency.code === formData.currency)?.symbol} ${
                                currencyOptions.find((currency) => currency.code === formData.currency)?.name
                              } (${formData.currency})`
                            : "Select currency..."}
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search currencies..." />
                      <CommandList>
                        <CommandEmpty>No currency found.</CommandEmpty>
                        <CommandGroup>
                          {currencyOptions.map((currency) => (
                            <CommandItem
                              key={currency.code}
                              value={`${currency.name} ${currency.code}`}
                              onSelect={() => {
                                setFormData((prev) => ({ ...prev, currency: currency.code }))
                                setCurrencyOpen(false)
                              }}
                            >
                              <span className="mr-2">{currency.symbol}</span>
                              {currency.name} ({currency.code})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentProvider" className="text-sm font-medium">
                Payment Provider
              </Label>
              <Select
                value={formData.paymentProvider}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentProvider: value }))}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paystack">Paystack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="bg-background/50 hover:bg-muted/50 border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Logo Upload */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-base font-medium">Organization Logo (Optional)</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a logo for your organization. This step is optional and can be skipped.
                </p>
              </div>

              <Card className="border-dashed border-2 border-border/50 bg-gradient-to-br from-card/50 to-muted/20 shadow-sm">
                <CardContent className="p-6">
                  {!logoPreview ? (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center shadow-sm">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-background/50 hover:bg-muted/50 border-border/50"
                          disabled={logoUploading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {logoUploading ? "Uploading..." : "Choose Logo"}
                        </Button>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={logoPreview || "/placeholder.svg"}
                          alt="Logo preview"
                          className="w-24 h-24 object-cover rounded-lg border border-border/50 shadow-sm"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 shadow-sm"
                          onClick={removeLogo}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      {logoUploading && <p className="text-sm text-muted-foreground">Uploading logo...</p>}
                      {formData.logoUrl && !logoUploading && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✓ Logo uploaded successfully
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="bg-background/50 hover:bg-muted/50 border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Subscription Setup</Label>
              </div>
              <p className="text-sm text-muted-foreground">Choose how this organization will be billed and managed.</p>

              <RadioGroup
                value={subscriptionType}
                onValueChange={(value: "trial" | "free" | "existing_paid") => {
                  setSubscriptionType(value)
                  setError("")
                }}
              >
                <div className="space-y-4">
                  {/* Trial Option */}
                  <Card
                    className={`cursor-pointer transition-all duration-200 bg-gradient-to-br from-card/50 to-muted/20 hover:shadow-md ${
                      subscriptionType === "trial" ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="trial" id="trial" />
                        <Label htmlFor="trial" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">Trial Subscription</span>
                          </div>
                        </Label>
                      </div>
                      <CardDescription>Set up a trial period with a custom end date</CardDescription>
                    </CardHeader>
                    {subscriptionType === "trial" && (
                      <CardContent>
                        <div className="space-y-2">
                          <Label htmlFor="trialEndDate" className="text-sm font-medium">
                            Trial End Date
                          </Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="trialEndDate"
                              type="date"
                              value={trialEndDate}
                              onChange={(e) => setTrialEndDate(e.target.value)}
                              className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                              min={new Date().toISOString().split("T")[0]}
                            />
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Free Option */}
                  <Card
                    className={`cursor-pointer transition-all duration-200 bg-gradient-to-br from-card/50 to-muted/20 hover:shadow-md ${
                      subscriptionType === "free" ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="free" id="free" />
                        <Label htmlFor="free" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <Gift className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Free Plan</span>
                          </div>
                        </Label>
                      </div>
                      <CardDescription>
                        For friends and your own organization - full access with no payment required
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Existing Paid Option */}
                  <Card
                    className={`cursor-pointer transition-all duration-200 bg-gradient-to-br from-card/50 to-muted/20 hover:shadow-md ${
                      subscriptionType === "existing_paid" ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing_paid" id="existing_paid" />
                        <Label htmlFor="existing_paid" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">Link Existing Subscription</span>
                          </div>
                        </Label>
                      </div>
                      <CardDescription>
                        Find and link an existing Paystack subscription to this organization
                      </CardDescription>
                    </CardHeader>
                    {subscriptionType === "existing_paid" && (
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerSearch" className="text-sm font-medium">
                            Search Customer Email
                          </Label>
                          <div className="flex space-x-2">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="customerSearch"
                                placeholder="customer@example.com"
                                value={customerSearchQuery}
                                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={searchPaystackCustomers}
                              disabled={searchingCustomers || !customerSearchQuery.trim()}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              {searchingCustomers ? "Searching..." : "Search"}
                            </Button>
                          </div>
                        </div>

                        {foundCustomers.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Found Customers</Label>
                            {foundCustomers.map((customerData) => {
                              const c = (customerData as { customer?: { id: string; first_name?: string; last_name?: string; email?: string } }).customer
                              return (
                              <Card
                                key={c?.id ?? (customerData as { id?: string }).id}
                                className={`cursor-pointer transition-all duration-200 ${
                                  (selectedCustomer as { customer?: { id: string } } | null)?.customer?.id === c?.id
                                    ? "ring-2 ring-primary bg-primary/5 shadow-md"
                                    : "hover:bg-muted/50 hover:shadow-sm"
                                }`}
                                onClick={() => {
                                  setSelectedCustomer(customerData)
                                  setSelectedSubscription(null)
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">
                                        {c?.first_name} {c?.last_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">{c?.email}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {(customerData as { activeSubscriptions?: unknown[] }).activeSubscriptions?.length ?? 0} active subscription(s)
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ); })}
                          </div>
                        )}

                        {selectedCustomer && ((selectedCustomer as { activeSubscriptions?: unknown[] }).activeSubscriptions?.length ?? 0) > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Select Subscription</Label>
                            {((selectedCustomer as { activeSubscriptions: PaystackSubscription[] }).activeSubscriptions ?? []).map((sub) => {
                              const subscription = sub as PaystackSubscription & { plan?: { name?: string; currency?: string; amount?: number }; next_payment_date?: string }
                              return (
                              <Card
                                key={subscription.id}
                                className={`cursor-pointer transition-all duration-200 ${
                                  selectedSubscription?.id === subscription.id
                                    ? "ring-2 ring-primary bg-primary/5 shadow-md"
                                    : "hover:bg-muted/50 hover:shadow-sm"
                                }`}
                                onClick={() => setSelectedSubscription(sub)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{subscription.plan?.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {subscription.plan?.currency} {((subscription.plan?.amount ?? 0) / 100).toLocaleString()}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Next payment: {subscription.next_payment_date ? new Date(subscription.next_payment_date).toLocaleDateString() : "—"}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                        {subscription.status}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ); }) }
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="bg-background/50 hover:bg-muted/50 border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                disabled={!canProceedToStep5}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Owner Assignment</Label>
              </div>
              <RadioGroup
                value={formData.ownerType}
                onValueChange={(value: "existing" | "invitation") =>
                  setFormData((prev) => ({ ...prev, ownerType: value }))
                }
              >
                <div className="space-y-4">
                  <Card
                    className={`cursor-pointer transition-all duration-200 bg-gradient-to-br from-card/50 to-muted/20 hover:shadow-md ${
                      formData.ownerType === "existing" ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="existing" />
                        <Label htmlFor="existing" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">Assign Existing User</span>
                          </div>
                        </Label>
                      </div>
                    </CardHeader>
                    {formData.ownerType === "existing" && (
                      <CardContent>
                        <Select
                          value={formData.existingUserId}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, existingUserId: value }))}
                        >
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center space-x-2">
                                  <span>{user.name}</span>
                                  <span className="text-muted-foreground">({user.email})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    )}
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all duration-200 bg-gradient-to-br from-card/50 to-muted/20 hover:shadow-md ${
                      formData.ownerType === "invitation" ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="invitation" id="invitation" />
                        <Label htmlFor="invitation" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">Send Invitation</span>
                          </div>
                        </Label>
                      </div>
                      <CardDescription>
                        Send an invitation to someone to create an account and become the owner
                      </CardDescription>
                    </CardHeader>
                    {formData.ownerType === "invitation" && (
                      <CardContent>
                        <Input
                          placeholder="owner@example.com"
                          type="email"
                          value={formData.ownerEmail}
                          onChange={(e) => setFormData((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                          className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                        />
                      </CardContent>
                    )}
                  </Card>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(4)}
                className="bg-background/50 hover:bg-muted/50 border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              >
                {loading ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
