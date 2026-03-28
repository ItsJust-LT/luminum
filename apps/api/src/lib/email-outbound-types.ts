export interface SendViaMailAppPayload {
  from: string;
  replyTo: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; contentType: string; contentBase64: string }[];
  inReplyTo?: string;
  references?: string;
  messageId?: string;
}
