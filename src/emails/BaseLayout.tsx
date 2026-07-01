import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

const ink = '#15110B';
const cream = '#F3EDE2';
const gold = '#C9A86E';

export function BaseLayout({
  preview,
  title,
  children,
}: {
  preview: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: cream, fontFamily: 'Arial, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.24em',
              color: ink,
              textAlign: 'center' as const,
            }}
          >
            ICONISTA
          </Text>
          <Section
            style={{ backgroundColor: '#FFFFFF', padding: '32px 28px', borderRadius: 2 }}
          >
            <Heading as="h1" style={{ fontSize: 22, color: ink, marginTop: 0 }}>
              {title}
            </Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: gold, marginTop: 24 }} />
          <Text style={{ fontSize: 11, color: '#8a7f6d', textAlign: 'center' as const }}>
            ICONISTA — small drops of authentic luxury pieces, hand-picked.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailText = { fontSize: 14, lineHeight: '22px', color: ink };
export const emailButton = {
  backgroundColor: ink,
  color: cream,
  fontSize: 12,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  padding: '14px 28px',
  display: 'inline-block',
};
