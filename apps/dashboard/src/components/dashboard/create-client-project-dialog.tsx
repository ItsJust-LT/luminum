"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Globe, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"

interface CreateClientProjectDialogProps {
  onProjectCreated?: () => void
}

export function CreateClientProjectDialog({ onProjectCreated }: CreateClientProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [slug, setSlug] = useState("")
  const [domain, setDomain] = useState("")
  const [projectType, setProjectType] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const resetForm = () => {
    setProjectName("")
    setSlug("")
    setDomain("")
    setProjectType("")
    setError("")
    setSuccess(false)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(resetForm, 300)
  }

  const handleProjectNameChange = (value: string) => {
    setProjectName(value)
    // Auto-generate slug from project name
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
    setSlug(generatedSlug)

    // Auto-generate domain suggestion (without extension)
    const generatedDomain = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "")
      .trim()
    setDomain(generatedDomain + ".com") // Default to .com but user can change
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Validate domain format
      if (!domain.includes(".")) {
        throw new Error("Please enter a complete domain (e.g., example.com, site.org)")
      }

      // Check if domain already exists
      const domainCheck = await api.websites.checkDomain(domain) as { available?: boolean; error?: string }

      if (domainCheck.error) {
        throw new Error(domainCheck.error)
      }

      if (!domainCheck.available) {
        throw new Error(`Domain "${domain}" is already taken. Please choose a different domain.`)
      }

      // Create the organization first
      const orgResult = (await authClient.organization.create({
        name: projectName,
        slug: slug,
        metadata: {
          type: projectType,
          createdBy: "agency",
        },
      })) as { error?: { message?: string }; data?: { id?: string } }

      if (orgResult.error) {
        throw new Error(orgResult.error.message || "Failed to create organization")
      }

      // Create the website entry
      try {
        await api.websites.create({
          name: projectName,
          domain: domain,
          organization_id: orgResult.data?.id || "",
        })
      } catch (websiteErr: any) {
        // If website creation fails, we should ideally clean up the organization
        throw new Error(websiteErr?.message || "Failed to create website")
      }

      setSuccess(true)
      onProjectCreated?.()

      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error: any) {
      console.error("Project creation error:", error)
      setError(error.message || "Failed to create client project")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-green-600" />
            <span>Create Client Project</span>
          </DialogTitle>
          <DialogDescription>
            Add a new website project for client dashboard access and analytics tracking.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Created!</h3>
            <p className="text-gray-600">
              <strong>{projectName}</strong> has been added to your client projects.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="projectName" className="text-sm font-medium">
                Project Name
              </Label>
              <Input
                id="projectName"
                type="text"
                placeholder="e.g., Acme Corp Website"
                value={projectName}
                onChange={(e) => handleProjectNameChange(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">
                Project Slug
              </Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">@</span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="acme-corp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Used for internal organization identification</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm font-medium">
                Website Domain
              </Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
                disabled={isLoading}
                className="flex-1"
              />
              <p className="text-xs text-gray-500">Enter the complete domain (e.g., example.com, mysite.org, app.io)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType" className="text-sm font-medium">
                Project Type
              </Label>
              <Select value={projectType} onValueChange={setProjectType} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business Website">Business Website</SelectItem>
                  <SelectItem value="E-commerce">E-commerce Store</SelectItem>
                  <SelectItem value="Portfolio">Portfolio Site</SelectItem>
                  <SelectItem value="Landing Page">Landing Page</SelectItem>
                  <SelectItem value="Web Application">Web Application</SelectItem>
                  <SelectItem value="Blog">Blog/Content Site</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
