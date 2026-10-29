import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container size="wide" className="py-10 text-center text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{siteConfig.name}</span>
          <span aria-hidden="true"> · </span>
          {siteConfig.tagline}
        </p>
      </Container>
    </footer>
  );
}
