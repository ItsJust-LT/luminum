import type {
  EmailFilters,
  FormSubmissionFilters,
  NotificationPreferencesData,
  AvatarResult,
} from "@luminum/database/types";

type FetchOptions = RequestInit & { baseUrl?: string };

function createApiClient(baseUrl: string = "") {
  async function request<T = any>(
    path: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { baseUrl: _, ...fetchOpts } = options;
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(fetchOpts.headers || {}),
      },
      ...fetchOpts,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `API error: ${res.status}`);
    }
    return res.json();
  }

  function get<T = any>(path: string, params?: Record<string, any>) {
    const qs = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : "";
    return request<T>(`${path}${qs}`);
  }

  function post<T = any>(path: string, body?: any) {
    return request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  function patch<T = any>(path: string, body?: any) {
    return request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  function del<T = any>(path: string, body?: any) {
    return request<T>(path, {
      method: "DELETE",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  // ─── Session ───────────────────────────────────────────────
  const session = {
    getMe: () => get("/api/me"),
  };

  // ─── Emails ────────────────────────────────────────────────
  const emails = {
    checkEnabled: (organizationId: string) =>
      get("/api/emails/enabled", { organizationId }),
    getAddresses: (organizationId: string) =>
      get("/api/emails/addresses", { organizationId }),
    list: (
      organizationId: string,
      page = 1,
      limit = 20,
      filters?: EmailFilters
    ) =>
      get("/api/emails", {
        organizationId,
        page,
        limit,
        read: filters?.read,
        search: filters?.search,
        from: filters?.from,
        emailAddresses: filters?.emailAddresses?.join(","),
      }),
    getById: (id: string) => get(`/api/emails/${id}`),
    markAsRead: (id: string) => post(`/api/emails/${id}/read`),
    markAsUnread: (id: string) => post(`/api/emails/${id}/unread`),
    delete: (id: string) => del(`/api/emails/${id}`),
    getUnreadCount: (organizationId: string) =>
      get("/api/emails/unread-count", { organizationId }),
    getAttachmentUrl: (emailId: string, attachmentIndex: number) =>
      get(`/api/emails/${emailId}/attachment/${attachmentIndex}`),
  };

  // ─── Forms ─────────────────────────────────────────────────
  const forms = {
    list: (websiteId: string, filters?: FormSubmissionFilters) =>
      get("/api/forms", {
        websiteId,
        seen: filters?.seen,
        contacted: filters?.contacted,
      }),
    getById: (id: string) => get(`/api/forms/${id}`),
    updateStatus: (id: string, updates: { seen?: boolean; contacted?: boolean }) =>
      patch(`/api/forms/${id}/status`, updates),
    getUnseenCount: (organizationId: string) =>
      get("/api/forms/unseen-count", { organizationId }),
  };

  // ─── Organization Settings ────────────────────────────────
  const organizationSettings = {
    getEmailsEnabled: (organizationId: string) =>
      get("/api/organization-settings/emails-enabled", { organizationId }),
    get: (organizationId: string) =>
      get("/api/organization-settings", { organizationId }),
    update: (organizationId: string, updates: any) =>
      patch(`/api/organization-settings?organizationId=${organizationId}`, updates),
    uploadLogo: (
      organizationId: string,
      data: { logoBase64: string; fileName: string; contentType: string }
    ) =>
      post(
        `/api/organization-settings/upload-logo?organizationId=${organizationId}`,
        data
      ),
    deleteLogo: (organizationId: string) =>
      del(`/api/organization-settings/logo?organizationId=${organizationId}`),
  };

  // ─── Organization Actions ─────────────────────────────────
  const organizationActions = {
    getInvitation: (invitationId: string) =>
      get(`/api/organization-actions/invitation/${invitationId}`),
    checkUserExists: (email: string) =>
      post("/api/organization-actions/check-user", { email }),
    sendInvitation: (data: {
      email: string;
      role: "admin" | "member";
      organizationId: string;
      organizationName: string;
    }) => post("/api/organization-actions/send-invitation", data),
    acceptInvitation: (data: {
      invitationId: string;
      name: string;
      email: string;
      password: string;
    }) => post("/api/organization-actions/accept-invitation", data),
    removeMember: (data: {
      memberId: string;
      memberEmail: string;
      memberName: string;
      organizationName: string;
      organizationId: string;
    }) => post("/api/organization-actions/remove-member", data),
    getInvitations: (organizationId: string) =>
      get("/api/organization-actions/invitations", { organizationId }),
    cancelInvitation: (invitationId: string) =>
      post("/api/organization-actions/cancel-invitation", { invitationId }),
    addMember: (data: {
      email: string;
      role: "admin" | "member";
      organizationId: string;
    }) => post("/api/organization-actions/add-member", data),
    updateRole: (data: {
      memberId: string;
      newRole: "admin" | "member";
      organizationId: string;
    }) => patch("/api/organization-actions/update-role", data),
  };

  // ─── Organization Management ──────────────────────────────
  const organizationManagement = {
    get: (organizationId: string) =>
      get("/api/organization-management", { organizationId }),
    update: (organizationId: string, data: any) =>
      patch(`/api/organization-management?organizationId=${organizationId}`, data),
    delete: (organizationId: string) =>
      del(`/api/organization-management?organizationId=${organizationId}`),
    getStats: () => get("/api/organization-management/stats"),
  };

  // ─── Admin ────────────────────────────────────────────────
  const admin = {
    getDashboardStats: () => get("/api/admin/dashboard-stats"),
    getOrganizations: () => get("/api/admin/organizations"),
    getOrganization: (id: string) => get(`/api/admin/organizations/${id}`),
    createOrganization: (data: any) =>
      post("/api/admin/create-organization", data),
    getUsers: () => get("/api/admin/users"),
    searchPaystackCustomers: (email: string) =>
      post("/api/admin/search-paystack-customers", { email }),
    checkDomain: (domain: string) =>
      post("/api/admin/check-domain", { domain }),
  };

  // ─── Paystack ─────────────────────────────────────────────
  const paystack = {
    getSubscriptionDetails: (organizationId: string) =>
      get("/api/paystack/subscription-details", { organizationId }),
    getCustomerTransactions: (organizationId: string) =>
      get("/api/paystack/customer-transactions", { organizationId }),
    generateUpdateCardLink: (subscriptionCode: string) =>
      post("/api/paystack/update-card-link", { subscriptionCode }),
    getTransactions: (params?: {
      page?: number;
      perPage?: number;
      status?: string;
      from?: string;
      to?: string;
    }) => get("/api/paystack/transactions", params),
    getTransaction: (id: string) => get(`/api/paystack/transactions/${id}`),
    getRevenueAnalytics: (params?: { from?: string; to?: string }) =>
      get("/api/paystack/revenue-analytics", params),
    getCustomers: () => get("/api/paystack/customers"),
    getTransactionTimeline: (id: string) =>
      get(`/api/paystack/transaction-timeline/${id}`),
  };

  // ─── Support ──────────────────────────────────────────────
  const support = {
    createTicket: (data: {
      title: string;
      description: string;
      priority?: string;
      category?: string;
      organization_id?: string;
    }) => post("/api/support/tickets", data),
    getTickets: (params?: {
      organizationId?: string;
      userId?: string;
      status?: string;
    }) => get("/api/support/tickets", params),
    getTicket: (id: string) => get(`/api/support/tickets/${id}`),
    updateTicket: (id: string, data: any) =>
      patch(`/api/support/tickets/${id}`, data),
    addMessage: (
      ticketId: string,
      data: { message: string; attachments?: any[] }
    ) => post(`/api/support/tickets/${ticketId}/messages`, data),
    getStats: () => get("/api/support/stats"),
    getAdminUsers: () => get("/api/support/admin-users"),
    getOrgBySlug: (slug: string) => get("/api/support/org-by-slug", { slug }),
  };

  // ─── Notifications ────────────────────────────────────────
  const notifications = {
    upsertPushSubscription: (subscription: any) =>
      post("/api/user-notifications/push-subscription", subscription),
    removePushSubscription: (endpoint: string) =>
      del("/api/user-notifications/push-subscription", { endpoint }),
    fetch: (cursor?: string, limit = 20) =>
      get("/api/user-notifications", { cursor, limit }),
    getUnreadCount: () => get("/api/user-notifications/unread-count"),
    markRead: (id: string) => post(`/api/user-notifications/${id}/read`),
    markAllRead: () => post("/api/user-notifications/read-all"),
    markEmailNotificationsRead: (emailId: string) =>
      post("/api/user-notifications/mark-email-read", { emailId }),
    markFormSubmissionNotificationsRead: (formSubmissionId: string) =>
      post("/api/user-notifications/mark-form-read", { formSubmissionId }),
    getOrganizationIdBySlug: (slug: string) =>
      get("/api/user-notifications/org-id-by-slug", { slug }),
  };

  // ─── Notification Preferences ─────────────────────────────
  const notificationPreferences = {
    get: () => get("/api/notification-preferences"),
    update: (data: NotificationPreferencesData) =>
      patch("/api/notification-preferences", data),
  };

  // ─── Uploads ──────────────────────────────────────────────
  const uploads = {
    logoToR2: (data: {
      logoBase64: string;
      fileName: string;
      contentType: string;
      organizationName?: string;
      organizationId?: string;
    }) => post("/api/uploads/logo-r2", data),
    logoToCloudinary: (data: {
      logoBase64: string;
      organizationName?: string;
      organizationId?: string;
    }) => post("/api/uploads/logo-cloudinary", data),
    fileToCloudinary: (data: { fileBase64: string; contentType?: string }) =>
      post("/api/uploads/file-cloudinary", data),
  };

  // ─── Avatar ───────────────────────────────────────────────
  const avatar = {
    getForEmail: (email: string): Promise<AvatarResult> =>
      get("/api/avatar", { email }),
  };

  // ─── Websites ─────────────────────────────────────────────
  const websites = {
    create: (data: {
      name: string;
      domain: string;
      organization_id: string;
      analytics?: boolean;
    }) => post("/api/websites", data),
    list: (organizationId?: string) =>
      get("/api/websites", organizationId ? { organizationId } : undefined),
    update: (id: string, data: any) => patch(`/api/websites/${id}`, data),
    delete: (id: string) => del(`/api/websites/${id}`),
    getByDomain: (domain: string) =>
      get("/api/websites/by-domain", { domain }),
    checkDomain: (domain: string) =>
      get("/api/websites/check-domain", { domain }),
    toggleAnalytics: (id: string, enabled: boolean) =>
      post(`/api/websites/${id}/toggle-analytics`, { enabled }),
  };

  // ─── Members ──────────────────────────────────────────────
  const members = {
    list: (organizationId: string) =>
      get("/api/members", { organizationId }),
  };

  // ─── Subscriptions ────────────────────────────────────────
  const subscriptions = {
    create: (data: any) => post("/api/subscriptions", data),
    setPrimary: (organizationId: string, subscriptionId: string) =>
      post("/api/subscriptions/set-primary", { organizationId, subscriptionId }),
    list: (organizationId: string) =>
      get("/api/subscriptions", { organizationId }),
    recordPayment: (data: any) =>
      post("/api/subscriptions/record-payment", data),
    sync: (subscriptionId: string) =>
      post("/api/subscriptions/sync", { subscriptionId }),
  };

  // ─── User Management ─────────────────────────────────────
  const userManagement = {
    getUsers: () => get("/api/user-management/users"),
    getUser: (id: string) => get(`/api/user-management/users/${id}`),
    updateUser: (id: string, data: any) =>
      patch(`/api/user-management/users/${id}`, data),
    deactivateUser: (id: string, reason?: string) =>
      post(`/api/user-management/users/${id}/deactivate`, { reason }),
    getStats: () => get("/api/user-management/stats"),
    getPaystackPayments: (userId: string) =>
      get("/api/user-management/paystack-payments", { userId }),
  };

  return {
    session,
    emails,
    forms,
    organizationSettings,
    organizationActions,
    organizationManagement,
    admin,
    paystack,
    support,
    notifications,
    notificationPreferences,
    uploads,
    avatar,
    websites,
    members,
    subscriptions,
    userManagement,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export { createApiClient };
