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
    getSetupStatus: (organizationId: string) =>
      get("/api/emails/setup-status", { organizationId }),
    setupDomain: (organizationId: string, websiteId: string) =>
      post("/api/emails/setup-domain", { organizationId, websiteId }),
    verifyDns: (organizationId: string) =>
      post("/api/emails/verify-dns", { organizationId }),
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
    getAnalyticsEnabled: (organizationId: string) =>
      get("/api/organization-settings/analytics-enabled", { organizationId }),
    getBlogsEnabled: (organizationId: string) =>
      get("/api/organization-settings/blogs-enabled", { organizationId }),
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
    getStorage: (organizationId: string) =>
      get("/api/organization-settings/storage", { organizationId }),
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
    getOrganizations: (params?: Record<string, string>) =>
      get("/api/admin/organizations", params),
    getOrganization: (id: string) => get(`/api/admin/organizations/${id}`),
    createOrganization: (data: any) =>
      post("/api/admin/create-organization", data),
    getUsers: () => get("/api/admin/users"),
    searchPaystackCustomers: (email: string) =>
      post("/api/admin/search-paystack-customers", { email }),
    checkDomain: (domain: string) =>
      post("/api/admin/check-domain", { domain }),
    getActivityOverview: (params?: { period?: string }) =>
      get("/api/admin/activity/overview", params),
    getActivityUsers: (params?: { period?: string; search?: string; limit?: number; offset?: number }) =>
      get("/api/admin/activity/users", params),
    getServerMetrics: () => get("/api/admin/monitoring/metrics"),
    getWhatsappAnalytics: (params?: { days?: number }) =>
      get("/api/admin/whatsapp/analytics", params),
    getWhatsappLiveClients: () => get("/api/admin/whatsapp/clients"),
    shutdownWhatsappClient: (organizationId: string) =>
      post(`/api/admin/whatsapp/clients/${encodeURIComponent(organizationId)}/shutdown`),
    setWhatsappAlwaysOn: (organizationId: string, enabled: boolean) =>
      post(`/api/admin/whatsapp/clients/${encodeURIComponent(organizationId)}/always-on`, { enabled }),
    removeAllWhatsappData: () => post("/api/admin/whatsapp/remove-all"),
    getSystemLogs: (params?: { page?: number; limit?: number; service?: string; level?: string; since?: string }) =>
      get("/api/admin/logs", params),
    getAdminEmails: (params?: Record<string, any>) =>
      get("/api/admin/emails", params),
    getAdminEmailStats: (params?: { start?: string; end?: string }) =>
      get("/api/admin/emails/stats", params),
    getAdminWebsites: (params?: Record<string, any>) =>
      get("/api/admin/websites", params),
    getAdminWebsiteStats: () => get("/api/admin/websites/stats"),
    getAdminFormSubmissions: (params?: Record<string, any>) =>
      get("/api/admin/forms/submissions", params),
    getAdminFormStats: () => get("/api/admin/forms/stats"),
    updateAdminFormSubmissionStatus: (id: string, data: { seen?: boolean; contacted?: boolean }) =>
      patch(`/api/admin/forms/submissions/${id}/status`, data),
    getAdminAnalyticsOverview: (start: string, end: string) =>
      get("/api/admin/analytics/overview", { start, end }),
    getAdminAnalyticsTimeseries: (start: string, end: string, granularity?: string) =>
      get("/api/admin/analytics/timeseries", { start, end, granularity }),
    getAdminAnalyticsBreakdown: (start: string, end: string, by?: string, limit?: number) =>
      get("/api/admin/analytics/breakdown", { start, end, by, limit }),
    getAdminAnalyticsTopPages: (start: string, end: string, limit?: number) =>
      get("/api/admin/analytics/top-pages", { start, end, limit }),
    getAdminAnalyticsCountries: (start: string, end: string, limit?: number) =>
      get("/api/admin/analytics/countries", { start, end, limit }),
    getAdminAnalyticsDevices: (start: string, end: string, limit?: number) =>
      get("/api/admin/analytics/devices", { start, end, limit }),
    enableEmailAccess: (organizationId: string) =>
      post("/api/admin/enable-organization-email-access", { organizationId }),
    disableEmail: (organizationId: string) =>
      post("/api/admin/disable-organization-email", { organizationId }),
    enableWhatsapp: (organizationId: string) =>
      post("/api/admin/enable-organization-whatsapp", { organizationId }),
    disableWhatsapp: (organizationId: string) =>
      post("/api/admin/disable-organization-whatsapp", { organizationId }),
    enableAnalytics: (organizationId: string) =>
      post("/api/admin/enable-organization-analytics", { organizationId }),
    disableAnalytics: (organizationId: string) =>
      post("/api/admin/disable-organization-analytics", { organizationId }),
    enableBlogs: (organizationId: string) =>
      post("/api/admin/enable-organization-blogs", { organizationId }),
    disableBlogs: (organizationId: string) =>
      post("/api/admin/disable-organization-blogs", { organizationId }),
    getDatabaseTables: () => get("/api/admin/database/tables"),
    getDatabaseStats: () => get("/api/admin/database/stats"),
    getDatabaseTableSchema: (tableName: string) =>
      get(`/api/admin/database/tables/${encodeURIComponent(tableName)}/schema`),
    getDatabaseTableRows: (tableName: string, params?: { page?: number; limit?: number }) =>
      get(`/api/admin/database/tables/${encodeURIComponent(tableName)}/rows`, params),
    updateDatabaseRow: (tableName: string, data: { primaryKey: Record<string, unknown>; data: Record<string, unknown> }) =>
      patch(`/api/admin/database/tables/${encodeURIComponent(tableName)}/rows`, data),
    runDatabaseSql: (query: string) =>
      post("/api/admin/database/sql", { query }),
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

  // ─── Analytics ────────────────────────────────────────────
  const analytics = {
    getSetupStatus: (organizationId: string) =>
      get("/api/analytics/setup-status", { organizationId }),
    verifyScriptNow: (organizationId: string) =>
      post("/api/analytics/verify-script-now", { organizationId }),
    getOverview: (websiteId: string, start: string, end: string) =>
      get("/api/analytics/overview", { websiteId, start, end }),
    getTimeSeries: (
      websiteId: string,
      start: string,
      end: string,
      granularity: "hour" | "day"
    ) =>
      get("/api/analytics/timeseries", {
        websiteId,
        start,
        end,
        granularity,
      }),
    getTopPages: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/top-pages", {
        websiteId,
        start,
        end,
        limit: limit ?? 10,
      }),
    getCountries: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/countries", {
        websiteId,
        start,
        end,
        limit: limit ?? 10,
      }),
    getDevices: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/devices", {
        websiteId,
        start,
        end,
        limit: limit ?? 5,
      }),
    getRealtime: (websiteId: string) =>
      get("/api/analytics/realtime", { websiteId }),
    getLivePages: (websiteId: string) =>
      get("/api/analytics/live-pages", { websiteId }),
    getPageFlow: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/page-flow", {
        websiteId,
        start,
        end,
        limit: limit ?? 50,
      }),
    getEntryExit: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/top-entry-exit", {
        websiteId,
        start,
        end,
        limit: limit ?? 10,
      }),
    getSessionPaths: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/session-paths", {
        websiteId,
        start,
        end,
        limit: limit ?? 20,
      }),
    getPageStats: (
      websiteId: string,
      start: string,
      end: string,
      limit?: number
    ) =>
      get("/api/analytics/page-stats", {
        websiteId,
        start,
        end,
        limit: limit ?? 20,
      }),
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
    markTicketRead: (ticketId: string) =>
      post(`/api/support/tickets/${ticketId}/read`, {}),
    addInternalNote: (ticketId: string, message: string) =>
      post(`/api/support/tickets/${ticketId}/internal-notes`, { message }),
    getNewMessages: (ticketId: string, since: string) =>
      get(`/api/support/tickets/${ticketId}/messages`, { since }),
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

  // ─── Uploads (S3) ────────────────────────────────────────
  const uploads = {
    /** Upload organization logo to S3. */
    uploadLogo: (data: {
      logoBase64: string;
      fileName?: string;
      contentType?: string;
      organizationName?: string;
      organizationId?: string;
    }) => post<{ success: boolean; url?: string; key?: string; error?: string }>("/api/uploads/logo", data),
    /** Upload support/generic file to S3. */
    uploadFile: (data: {
      fileBase64: string;
      contentType?: string;
      ticketId?: string;
      messageId?: string;
      originalFilename?: string;
      filename?: string;
    }) => post<{ success: boolean; data?: { url: string; storage_key: string; secure_url?: string; public_id?: string }; error?: string }>("/api/uploads/file", data),
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

  // ─── WhatsApp ────────────────────────────────────────────
  const whatsapp = {
    checkEnabled: (organizationId: string) =>
      get("/api/whatsapp/enabled", { organizationId }),
    getAccount: (organizationId: string) =>
      get("/api/whatsapp/accounts", { organizationId }),
    getAccountById: (id: string) =>
      get(`/api/whatsapp/accounts/${id}`),
    createAccount: (organizationId: string, phoneNumber?: string) =>
      post("/api/whatsapp/accounts", { organizationId, phoneNumber }),
    deleteAccount: (id: string) =>
      del(`/api/whatsapp/accounts/${id}`),
    disconnect: (organizationId: string) =>
      post("/api/whatsapp/disconnect", { organizationId }),
    clearSession: (organizationId: string) =>
      post("/api/whatsapp/clear-session", { organizationId }),
    reconnect: (organizationId: string) =>
      post("/api/whatsapp/reconnect", { organizationId }),
    getChats: (organizationId: string, params?: { page?: number; limit?: number; search?: string; unreadOnly?: boolean }) =>
      get("/api/whatsapp/chats", { organizationId, ...params }),
    getChat: (chatId: string, organizationId: string, params?: { cursor?: string; limit?: number }) =>
      get(`/api/whatsapp/chats/${chatId}`, { organizationId, ...params }),
    getContactInfo: (chatId: string, organizationId: string) =>
      get(`/api/whatsapp/contacts/${chatId}`, { organizationId }),
    blockContact: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/contacts/${chatId}/block`, { organizationId }),
    unblockContact: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/contacts/${chatId}/unblock`, { organizationId }),
    sendMessage: (chatId: string, body: string, organizationId: string, clientMessageId?: string, quotedMessageId?: string) =>
      post(`/api/whatsapp/chats/${chatId}/messages`, { body, organizationId, clientMessageId, quotedMessageId }),
    sendMediaMessage: (
      chatId: string,
      dataUrl: string,
      organizationId: string,
      caption?: string,
      clientMessageId?: string,
    ) => post(`/api/whatsapp/chats/${chatId}/media`, { dataUrl, caption, organizationId, clientMessageId }),
    markChatRead: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/chats/${chatId}/read`, { organizationId }),
    getUnreadCount: (organizationId: string) =>
      get("/api/whatsapp/unread-count", { organizationId }),
    getLinkPreview: (organizationId: string, url: string) =>
      get("/api/whatsapp/link-preview", { organizationId, url }),

    // Phase 1: Messaging+
    forwardMessage: (waMessageId: string, organizationId: string, targetChatIds: string[]) =>
      post(`/api/whatsapp/messages/${encodeURIComponent(waMessageId)}/forward`, { organizationId, targetChatIds }),
    starMessage: (waMessageId: string, organizationId: string, starred: boolean) =>
      post(`/api/whatsapp/messages/${encodeURIComponent(waMessageId)}/star`, { organizationId, starred }),
    deleteMessage: (waMessageId: string, organizationId: string, everyone: boolean) =>
      post(`/api/whatsapp/messages/${encodeURIComponent(waMessageId)}/delete`, { organizationId, everyone }),
    reactToMessage: (waMessageId: string, organizationId: string, emoji: string) =>
      post(`/api/whatsapp/messages/${encodeURIComponent(waMessageId)}/react`, { organizationId, emoji }),
    getMessageInfo: (waMessageId: string, organizationId: string) =>
      get(`/api/whatsapp/messages/${encodeURIComponent(waMessageId)}/info`, { organizationId }),

    // Phase 2: Chat management
    archiveChat: (chatId: string, organizationId: string, archive: boolean) =>
      post(`/api/whatsapp/chats/${chatId}/archive`, { organizationId, archive }),
    pinChat: (chatId: string, organizationId: string, pin: boolean) =>
      post(`/api/whatsapp/chats/${chatId}/pin`, { organizationId, pin }),
    muteChat: (chatId: string, organizationId: string, mute: boolean, unmuteDate?: string) =>
      post(`/api/whatsapp/chats/${chatId}/mute`, { organizationId, mute, unmuteDate }),
    markChatUnread: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/chats/${chatId}/mark-unread`, { organizationId }),
    sendSeen: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/chats/${chatId}/send-seen`, { organizationId }),
    getChatLabels: (chatId: string, organizationId: string) =>
      get(`/api/whatsapp/chats/${chatId}/labels`, { organizationId }),
    updateChatLabels: (chatId: string, organizationId: string, labelIds: string[]) =>
      post(`/api/whatsapp/chats/${chatId}/labels`, { organizationId, labelIds }),
    setChatNote: (chatId: string, organizationId: string, note: string) =>
      post(`/api/whatsapp/chats/${chatId}/note`, { organizationId, note }),
    sendTyping: (chatId: string, organizationId: string, typing: boolean) =>
      post(`/api/whatsapp/chats/${chatId}/typing`, { organizationId, typing }),

    // Phase 3: Groups
    getGroupMetadata: (chatId: string, organizationId: string) =>
      get(`/api/whatsapp/groups/${chatId}`, { organizationId }),
    addGroupParticipants: (chatId: string, organizationId: string, participantIds: string[]) =>
      post(`/api/whatsapp/groups/${chatId}/participants/add`, { organizationId, participantIds }),
    removeGroupParticipants: (chatId: string, organizationId: string, participantIds: string[]) =>
      post(`/api/whatsapp/groups/${chatId}/participants/remove`, { organizationId, participantIds }),
    promoteGroupParticipants: (chatId: string, organizationId: string, participantIds: string[]) =>
      post(`/api/whatsapp/groups/${chatId}/participants/promote`, { organizationId, participantIds }),
    demoteGroupParticipants: (chatId: string, organizationId: string, participantIds: string[]) =>
      post(`/api/whatsapp/groups/${chatId}/participants/demote`, { organizationId, participantIds }),
    setGroupSubject: (chatId: string, organizationId: string, subject: string) =>
      post(`/api/whatsapp/groups/${chatId}/subject`, { organizationId, subject }),
    setGroupDescription: (chatId: string, organizationId: string, description: string) =>
      post(`/api/whatsapp/groups/${chatId}/description`, { organizationId, description }),
    setGroupSettings: (chatId: string, organizationId: string, settings: Record<string, boolean>) =>
      post(`/api/whatsapp/groups/${chatId}/settings`, { organizationId, ...settings }),
    getGroupInviteCode: (chatId: string, organizationId: string) =>
      get(`/api/whatsapp/groups/${chatId}/invite`, { organizationId }),
    revokeGroupInvite: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/groups/${chatId}/invite/revoke`, { organizationId }),
    getGroupMembershipRequests: (chatId: string, organizationId: string) =>
      get(`/api/whatsapp/groups/${chatId}/membership-requests`, { organizationId }),
    approveGroupMembershipRequest: (chatId: string, organizationId: string, requesterId: string) =>
      post(`/api/whatsapp/groups/${chatId}/membership-requests/approve`, { organizationId, requesterId }),
    rejectGroupMembershipRequest: (chatId: string, organizationId: string, requesterId: string) =>
      post(`/api/whatsapp/groups/${chatId}/membership-requests/reject`, { organizationId, requesterId }),
    leaveGroup: (chatId: string, organizationId: string) =>
      post(`/api/whatsapp/groups/${chatId}/leave`, { organizationId }),
  };

  // ─── Blog (per-organization) ───────────────────────────────
  const blog = {
    listPosts: (organizationId: string, page = 1, limit = 20) =>
      get("/api/blog/posts", { organizationId, page, limit }),
    getPostById: (postId: string) => get(`/api/blog/posts/id/${encodeURIComponent(postId)}`),
    getPostBySlug: (organizationId: string, slug: string) =>
      get(`/api/blog/posts/${encodeURIComponent(slug)}`, { organizationId }),
    getComponents: () => get("/api/blog/components"),
    upload: (body: {
      organizationId: string;
      postId?: string | null;
      fileBase64: string;
      contentType: string;
      originalFilename: string;
    }) => post("/api/blog/upload", body),
    createPost: (body: {
      organizationId: string;
      title: string;
      slug?: string;
      summary?: string;
      content_markdown?: string;
      cover_image_key?: string;
    }) => post("/api/blog/posts", body),
    updatePost: (id: string, body: Record<string, unknown>) =>
      patch(`/api/blog/posts/${encodeURIComponent(id)}`, body),
    publishPost: (id: string) => post(`/api/blog/posts/${encodeURIComponent(id)}/publish`, {}),
    previewSpec: (id: string, body?: { content_markdown?: string }) =>
      post(`/api/blog/posts/${encodeURIComponent(id)}/preview-spec`, body ?? {}),
  };

  // ─── User Management ─────────────────────────────────────
  const userManagement = {
    getUsers: () => get("/api/user-management/users"),
    getUser: (id: string) => get(`/api/user-management/users/${id}`),
    updateUser: (id: string, data: any) =>
      patch(`/api/user-management/users/${id}`, data),
    deactivateUser: (id: string, reason?: string) =>
      post(`/api/user-management/users/${id}/deactivate`, { reason }),
    reactivateUser: (id: string) =>
      post(`/api/user-management/users/${id}/reactivate`, {}),
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
    analytics,
    support,
    notifications,
    notificationPreferences,
    uploads,
    avatar,
    websites,
    members,
    subscriptions,
    userManagement,
    whatsapp,
    blog,
    /** Low-level API methods for endpoints not covered by the above. Use in client components. */
    get: <T = any>(path: string, params?: Record<string, any>) => get<T>(path, params),
    post: <T = any>(path: string, body?: any) => post<T>(path, body),
    patch: <T = any>(path: string, body?: any) => patch<T>(path, body),
    del: <T = any>(path: string, body?: any) => del<T>(path, body),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export { createApiClient };
