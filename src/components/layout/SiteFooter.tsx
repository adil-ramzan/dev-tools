import { Container } from "@/components/ui/Container";
import { FREE_ACCESS_LINE } from "@/components/ui/FreeAccess";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container size="wide" className="flex flex-col gap-2 py-10 text-center text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{siteConfig.name}</span>
          <span aria-hidden="true"> · </span>
          {siteConfig.tagline}
        </p>
        <p className="text-muted-foreground">{FREE_ACCESS_LINE}</p>
      </Container>
    </footer>
  );
}
