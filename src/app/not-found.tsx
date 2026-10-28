import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Container size="prose" className="flex flex-1 flex-col justify-center py-16 sm:py-24">
      <PageHeader
        eyebrow={<span className="font-mono">404</span>}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
      />
      <div className="mt-8">
        <Link href="/" className={buttonClassName({ variant: "secondary" })}>
          Go to the homepage
        </Link>
      </div>
    </Container>
  );
}
