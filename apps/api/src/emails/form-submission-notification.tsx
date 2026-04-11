import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface FormSubmissionNotificationEmailProps {
  recipientName?: string | null;
  organizationName: string;
  websiteName?: string | null;
  formName: string;
  formSubmissionId?: string;
  submissionRows: { label: string; value: string }[];
  submissionUrl: string;
  submittedAtLabel: string;
}

export default function FormSubmissionNotificationEmail({
  recipientName,
  organizationName,
  websiteName,
  formName,
  formSubmissionId,
  submissionRows,
  submissionUrl,
  submittedAtLabel,
}: FormSubmissionNotificationEmailProps) {
  const greeting =
    recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>
        New form submission for {organizationName}
        {websiteName ? ` · ${websiteName}` : ""}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badgeRow}>
            <Text style={badge}>Form submission</Text>
          </Section>

          <Heading style={h1}>You have a new response</Heading>
          <Text style={lead}>{greeting}</Text>
          <Text style={text}>
            Someone just submitted <strong>{formName}</strong>
            {websiteName ? (
              <>
                {" "}
                on <strong>{websiteName}</strong>
              </>
            ) : null}{" "}
            for <strong>{organizationName}</strong>.
          </Text>

          <Section style={metaCard}>
            <Text style={metaLine}>
              <span style={metaKey}>Organization</span>
              <span style={metaVal}>{organizationName}</span>
            </Text>
            {websiteName ? (
              <Text style={metaLine}>
                <span style={metaKey}>Website</span>
                <span style={metaVal}>{websiteName}</span>
              </Text>
            ) : null}
            <Text style={metaLine}>
              <span style={metaKey}>Form</span>
              <span style={metaVal}>{formName}</span>
            </Text>
            {formSubmissionId ? (
              <Text style={metaLine}>
                <span style={metaKey}>Submission ID</span>
                <span style={metaValMono}>{formSubmissionId}</span>
              </Text>
            ) : null}
            <Text style={metaLineLast}>
              <span style={metaKey}>Received</span>
              <span style={metaVal}>{submittedAtLabel}</span>
            </Text>
          </Section>

          <Heading as="h2" style={h2}>
            Submitted fields
          </Heading>
          {submissionRows.length === 0 ? (
            <Text style={muted}>(No field data was included.)</Text>
          ) : (
            submissionRows.map((row, i) => (
              <Section key={`${row.label}-${i}`} style={fieldBlock}>
                <Text style={fieldLabel}>{row.label}</Text>
                <Text style={fieldValue}>{row.value}</Text>
              </Section>
            ))
          )}

          <Section style={buttonWrap}>
            <Button style={button} href={submissionUrl}>
              View submission in dashboard
            </Button>
          </Section>

          <Text style={linkHint}>
            If the button does not work, copy this link into your browser:
          </Text>
          <Link href={submissionUrl} style={link}>
            {submissionUrl}
          </Link>

          <Hr style={hr} />

          <Text style={footer}>
            You are receiving this because you are a member of{" "}
            <strong>{organizationName}</strong> on Luminum. Notifications are
            sent from forms@luminum.agency.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0f172a",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  padding: "24px 12px",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "36px 28px",
  borderRadius: "16px",
  maxWidth: "560px",
  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
};

const badgeRow = { textAlign: "center" as const, marginBottom: "16px" };

const badge = {
  display: "inline-block",
  backgroundColor: "#e0e7ff",
  color: "#3730a3",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  padding: "6px 12px",
  borderRadius: "999px",
  margin: "0",
};

const h1 = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: "1.25",
  margin: "0 0 12px",
  textAlign: "center" as const,
};

const h2 = {
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: 600,
  margin: "28px 0 12px",
};

const lead = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "1.55",
  margin: "0 0 8px",
};

const text = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

const metaCard = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "16px 18px",
  border: "1px solid #e2e8f0",
};

const metaLine = {
  margin: "0 0 10px",
  fontSize: "14px",
  lineHeight: "1.5",
};

const metaLineLast = {
  ...metaLine,
  marginBottom: "0",
};

const metaKey = {
  color: "#64748b",
  display: "block" as const,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: "2px",
};

const metaVal = {
  color: "#0f172a",
  fontWeight: 600,
};

const metaValMono = {
  ...metaVal,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: "13px",
  fontWeight: 500,
};

const fieldBlock = {
  borderLeft: "3px solid #6366f1",
  paddingLeft: "14px",
  marginBottom: "14px",
};

const fieldLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
};

const fieldValue = {
  color: "#0f172a",
  fontSize: "15px",
  lineHeight: "1.55",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};

const muted = {
  color: "#94a3b8",
  fontSize: "14px",
  margin: "0",
};

const buttonWrap = { textAlign: "center" as const, margin: "28px 0 8px" };

const button = {
  backgroundColor: "#4f46e5",
  borderRadius: "10px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
  lineHeight: "1",
};

const linkHint = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "20px 0 6px",
  textAlign: "center" as const,
};

const link = {
  color: "#4f46e5",
  fontSize: "12px",
  wordBreak: "break-all" as const,
  textAlign: "center" as const,
  display: "block",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "28px 0 16px",
};

const footer = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "1.55",
  margin: "0",
  textAlign: "center" as const,
};
