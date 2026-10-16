import { Download, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** PDF for printing and sharing; PNG/JPG for LinkedIn, WhatsApp and portfolios. */
export function CertificateDownloads({ code, className, size = "sm" }: { code: string; className?: string; size?: "sm" | "default" }) {
  const href = (format: "pdf" | "png" | "jpg") => `/api/certificates/${encodeURIComponent(code)}/download?format=${format}`;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button asChild size={size}>
        <a href={href("pdf")} download>
          <FileText /> Download PDF
        </a>
      </Button>
      <Button asChild size={size} variant="outline">
        <a href={href("png")} download>
          <FileImage /> PNG
        </a>
      </Button>
      <Button asChild size={size} variant="outline">
        <a href={href("jpg")} download>
          <Download /> JPG
        </a>
      </Button>
    </div>
  );
}
