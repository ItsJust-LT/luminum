// worker.js — Email Worker
import PostalMime from "postal-mime";

interface Env {
	WEBHOOK_URL: string;
	WEBHOOK_SECRET: string;
	EMAIL_BUCKET: R2Bucket;
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
	  // env.WEBHOOK_URL, env.WEBHOOK_SECRET, env.EMAIL_BUCKET bound in wrangler
	  const webhookUrl = env.WEBHOOK_URL;
	  const webhookSecret = env.WEBHOOK_SECRET;
  
	  // Parse core fields from message
	  const from = message.from || null;
	  const to = message.to || null;
	  
	  // Extract headers
	  const headers: Record<string, string> = {};
	  if (message.headers) {
		for (const [k, v] of message.headers.entries()) {
		  headers[k] = v;
		}
	  }
	  const subject = headers["subject"] || headers["Subject"] || "";
	  // Message-ID for deduplication (same message can be delivered multiple times by Cloudflare/retries)
	  let messageId: string | null = (headers["message-id"] || headers["Message-ID"] || "").trim() || null;
	  
	  console.log(`[Email Worker] From: ${from}, To: ${to}, Subject: ${subject}`);
	  
	  // Verify EMAIL_BUCKET is available - this is required for attachments
	  if (!env.EMAIL_BUCKET) {
		const errorMsg = `EMAIL_BUCKET binding is not configured. R2 bucket binding is required for attachment processing.`;
		console.error(`[Email Worker] ERROR: ${errorMsg}`);
		throw new Error(errorMsg);
	  }
	  
	  console.log(`[Email Worker] EMAIL_BUCKET binding verified and available`);
	  
	  // Parse the raw email stream using postal-mime
	  let text = "";
	  let html = "";
	  const attachments = [];
	  
	  try {
		// Convert ReadableStream to ArrayBuffer for postal-mime
		const reader = message.raw.getReader();
		const chunks: Uint8Array[] = [];
		
		while (true) {
		  const { done, value } = await reader.read();
		  if (done) break;
		  chunks.push(value);
		}
		
		// Combine chunks into single Uint8Array
		const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
		const combined = new Uint8Array(totalLength);
		let offset = 0;
		for (const chunk of chunks) {
		  combined.set(chunk, offset);
		  offset += chunk.length;
		}
		
		// Parse the email with postal-mime
		// postal-mime can accept ArrayBuffer directly, which is better for attachments
		const parser = new PostalMime();
		const email = await parser.parse(combined.buffer);
		
		// Log what postal-mime returned
		console.log(`[Email Worker] Parsed email object keys:`, Object.keys(email));
		console.log(`[Email Worker] Email has text: ${!!email.text}, has html: ${!!email.html}`);
		console.log(`[Email Worker] Email attachments type: ${typeof email.attachments}`);
		console.log(`[Email Worker] Email attachments is array: ${Array.isArray(email.attachments)}`);
		console.log(`[Email Worker] Email attachments length: ${email.attachments?.length || 0}`);
		
		// Extract text and HTML
		text = email.text || "";
		html = email.html || "";
		// Prefer Message-ID from parsed MIME (can be normalized); fallback to headers
		if ((email as any).messageId) {
		  messageId = ((email as any).messageId as string).trim() || messageId;
		}
		
		console.log(`[Email Worker] Parsed email - Text length: ${text.length}, HTML length: ${html.length}`);
		if (text) console.log(`[Email Worker] Text preview: ${text.substring(0, 100)}...`);
		if (html) console.log(`[Email Worker] HTML preview: ${html.substring(0, 100)}...`);
		
		// Process attachments
		if (email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0) {
		  console.log(`[Email Worker] Found ${email.attachments.length} attachment(s)`);
		  console.log(`[Email Worker] Attachments details:`, JSON.stringify(email.attachments.map(a => ({
			filename: a.filename,
			mimeType: a.mimeType,
			hasContent: !!a.content,
			contentType: typeof a.content
		  }))));
		  
		  for (let i = 0; i < email.attachments.length; i++) {
			const attachment = email.attachments[i];
			const contentSize = attachment.content 
			  ? (typeof attachment.content === 'string' ? new TextEncoder().encode(attachment.content).byteLength : attachment.content.byteLength)
			  : 'unknown';
			console.log(`[Email Worker] Processing attachment ${i + 1}: ${attachment.filename || 'unnamed'}, type: ${attachment.mimeType || 'unknown'}, size: ${contentSize}`);
	  
			if (!attachment.content) {
			  console.warn(`[Email Worker] Attachment ${i + 1} has no content, skipping`);
			  continue;
			}
			
			// create unique key
			const ts = Date.now();
			// sanitize filename lightly
			const safeName = (attachment.filename || `attachment-${i + 1}`).replace(/\s+/g, "_");
			const key = `emails/${ts}-${crypto.randomUUID()}-${safeName}`;
	
			try {
			  
			  // attachment.content from postal-mime is typically ArrayBuffer or Uint8Array
			  // Convert to ArrayBuffer if needed
			  let ab: ArrayBuffer;
			  const content = attachment.content as any;
			  if (typeof content === 'string') {
				ab = new TextEncoder().encode(content).buffer as ArrayBuffer;
			  } else if (content instanceof ArrayBuffer) {
				ab = content;
			  } else if (content instanceof Uint8Array) {
				ab = content.buffer as ArrayBuffer;
			  } else {
				// Fallback: convert to Uint8Array then to ArrayBuffer
				const uint8 = new Uint8Array(content);
				ab = uint8.buffer as ArrayBuffer;
			  }
	
			  // upload to R2 bound bucket
			  await env.EMAIL_BUCKET.put(key, ab, {
				httpMetadata: { contentType: attachment.mimeType || "application/octet-stream" },
			  });
	
			  attachments.push({
				filename: attachment.filename || `attachment-${i + 1}`,
				contentType: attachment.mimeType || "application/octet-stream",
				size: ab.byteLength || 0,
				r2Key: key,
			  });
			  
			  console.log(`[Email Worker] Attachment ${i + 1} uploaded successfully to R2: ${key}`);
			} catch (err) {
			  console.error(`[Email Worker] Error processing attachment ${i + 1}:`, err);
			  // Continue with other attachments even if one fails
			}
		  }
		} else {
		  console.log(`[Email Worker] No attachments found in email`);
		}
		
		console.log(`[Email Worker] Total attachments processed: ${attachments.length}`);
	  } catch (err) {
		console.error(`[Email Worker] Error parsing email:`, err);
		// Continue with what we have - at least we have from/to/subject
	  }
  
	  // payload to send to webhook (messageId used by app to deduplicate retries)
	  const payload = {
		from,
		to,
		subject,
		messageId,
		text: text || null, // Send null instead of empty string
		html: html || null, // Send null instead of empty string
		headers,
		attachments,
		receivedAt: new Date().toISOString(),
	  };
	  
	  console.log(`[Email Worker] Payload prepared:`, {
		from,
		to,
		subject,
		textLength: text.length,
		htmlLength: html.length,
		attachmentsCount: attachments.length,
	  });
  
	  const body = JSON.stringify(payload);
  
	  // create HMAC signature with timestamp to prevent replay
	  const ts = Math.floor(Date.now() / 1000).toString();
	  const pre = ts + "." + body; // timestamp.payload
	  const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(webhookSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	  );
	  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pre));
	  const sigArray = Array.from(new Uint8Array(sigBuf));
	  const signature = sigArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
	  // send POST to webhook with signature headers
	  try {
		const resp = await fetch(webhookUrl, {
		  method: "POST",
		  headers: {
			"Content-Type": "application/json",
			"X-Webhook-Timestamp": ts,
			"X-Webhook-Signature": signature,
			"X-Source": "cloudflare-email-worker",
		  },
		  body,
		});
  
		// optionally handle non-2xx: throw to let Cloudflare know (it will record failure)
		if (!resp.ok) {
		  console.error("Webhook returned non-2xx:", resp.status, await resp.text());
		  // Let the worker complete; Cloudflare Email Routing will mark the delivery status
		  return;
		}
	  } catch (err) {
		// network failure; log and rethrow so Cloudflare may retry depending on routing config
		console.error("Error posting to webhook:", err);
		throw err;
	  }
	}
  };
  