import { Button, Column, Hr, Img, Row, Text } from '@react-email/components';
import { BaseLayout, emailButton, emailText } from './BaseLayout';

export function formatEur(cents: number): string {
  return `€${(cents / 100).toLocaleString('en-IE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface OrderEmailItem {
  brand: string;
  title: string;
  image?: string;
  price: number;
}

export interface OrderEmailProps {
  orderNumber: string;
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  total: number;
  baseUrl: string;
}

function OrderLines({ items, subtotal, discount, promoCode, total, baseUrl }: OrderEmailProps) {
  return (
    <>
      {items.map((item, i) => (
        <Row key={i} style={{ marginBottom: 12 }}>
          {item.image ? (
            <Column style={{ width: 64 }}>
              <Img
                src={`${baseUrl}${item.image}`}
                width={56}
                height={56}
                alt={item.title}
                style={{ objectFit: 'cover' as const, borderRadius: 2 }}
              />
            </Column>
          ) : null}
          <Column>
            <Text style={{ ...emailText, margin: 0, fontWeight: 700 }}>{item.brand}</Text>
            <Text style={{ ...emailText, margin: 0 }}>{item.title}</Text>
          </Column>
          <Column style={{ textAlign: 'right' as const }}>
            <Text style={{ ...emailText, margin: 0 }}>{formatEur(item.price)}</Text>
          </Column>
        </Row>
      ))}
      <Hr />
      <Row>
        <Column>
          <Text style={{ ...emailText, margin: 0 }}>Subtotal</Text>
        </Column>
        <Column style={{ textAlign: 'right' as const }}>
          <Text style={{ ...emailText, margin: 0 }}>{formatEur(subtotal)}</Text>
        </Column>
      </Row>
      {discount > 0 ? (
        <Row>
          <Column>
            <Text style={{ ...emailText, margin: 0 }}>Promo {promoCode}</Text>
          </Column>
          <Column style={{ textAlign: 'right' as const }}>
            <Text style={{ ...emailText, margin: 0 }}>−{formatEur(discount)}</Text>
          </Column>
        </Row>
      ) : null}
      <Row>
        <Column>
          <Text style={{ ...emailText, margin: 0, fontWeight: 700 }}>Total</Text>
        </Column>
        <Column style={{ textAlign: 'right' as const }}>
          <Text style={{ ...emailText, margin: 0, fontWeight: 700 }}>{formatEur(total)}</Text>
        </Column>
      </Row>
    </>
  );
}

export function VerificationEmail({ name, url }: { name: string; url: string }) {
  return (
    <BaseLayout preview="Confirm your ICONISTA account" title="Confirm your email">
      <Text style={emailText}>
        {name ? `${name}, welcome` : 'Welcome'} to ICONISTA. Confirm your email to finish
        setting up your account.
      </Text>
      <Button href={url} style={emailButton}>
        Confirm email
      </Button>
    </BaseLayout>
  );
}

export function OrderConfirmedEmail(props: OrderEmailProps) {
  return (
    <BaseLayout
      preview="Your ICONISTA order is confirmed"
      title={`Order ${props.orderNumber} — confirmed`}
    >
      <Text style={emailText}>
        Thank you. Your pieces are being prepared and will ship insured, with their
        authenticity documentation.
      </Text>
      <OrderLines {...props} />
    </BaseLayout>
  );
}

export function OrderShippedEmail({
  orderNumber,
  trackingNumber,
}: {
  orderNumber: string;
  trackingNumber: string;
}) {
  return (
    <BaseLayout preview="Your ICONISTA order has shipped" title={`Order ${orderNumber} — shipped`}>
      <Text style={emailText}>
        Your order is on its way, fully insured. Tracking number:{' '}
        <strong>{trackingNumber}</strong>
      </Text>
    </BaseLayout>
  );
}

export function OrderRefundedEmail({ orderNumber }: { orderNumber: string }) {
  return (
    <BaseLayout preview="Your ICONISTA refund" title={`Order ${orderNumber} — refunded`}>
      <Text style={emailText}>
        Your refund has been issued. Depending on your bank it can take a few business days
        to appear.
      </Text>
    </BaseLayout>
  );
}

export function NewsletterConfirmEmail({ url }: { url: string }) {
  return (
    <BaseLayout preview="Confirm your subscription" title="One click and you're in">
      <Text style={emailText}>
        Confirm your subscription and be first when the next drop goes live. One email per
        drop — nothing else, ever.
      </Text>
      <Button href={url} style={emailButton}>
        Confirm subscription
      </Button>
    </BaseLayout>
  );
}

export function DropLiveEmail({
  dropNumber,
  dropTitle,
  url,
  unsubscribeUrl,
}: {
  dropNumber: number;
  dropTitle: string;
  url: string;
  unsubscribeUrl: string;
}) {
  const number = String(dropNumber).padStart(3, '0');
  return (
    <BaseLayout preview={`Drop ${number} is live`} title={`Drop ${number} — ${dropTitle} is live`}>
      <Text style={emailText}>
        A handful of one-of-one pieces, authenticated and ready. When they’re gone, the drop
        closes for good.
      </Text>
      <Button href={url} style={emailButton}>
        Shop the drop
      </Button>
      <Text style={{ ...emailText, fontSize: 11, color: '#8a7f6d', marginTop: 24 }}>
        <a href={unsubscribeUrl} style={{ color: '#8a7f6d' }}>
          Unsubscribe
        </a>
      </Text>
    </BaseLayout>
  );
}

export function PasswordResetEmail({ url }: { url: string }) {
  return (
    <BaseLayout preview="Reset your ICONISTA password" title="Reset your password">
      <Text style={emailText}>
        Click below to choose a new password. The link is valid for one hour. If you didn’t
        request this, ignore this email.
      </Text>
      <Button href={url} style={emailButton}>
        Reset password
      </Button>
    </BaseLayout>
  );
}
