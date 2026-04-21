import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

type ButtonIntent = "add" | "delete" | "lock" | "importExport" | null;

const ADD_KEYWORDS = ["add", "create", "new", "เพิ่ม", "สร้าง", "ใหม่","บันทึก"];
const DELETE_KEYWORDS = ["delete", "remove", "trash", "ลบ", "ลบทิ้ง","Delete"];
const LOCK_KEYWORDS = ["lock", "unlock", "ล็อค", "ปลดล็อค", "lock user", "unlock user"];
const IMPORT_EXPORT_KEYWORDS = ["import", "export", "นำเข้า", "ส่งออก","เปลี่ยน","change"];

const readElementName = (type: unknown) => {
  if (typeof type === "string") return type;
  const maybeNamed = type as { displayName?: string; name?: string };
  return maybeNamed.displayName || maybeNamed.name || "";
};

const detectButtonIntent = (children: React.ReactNode): ButtonIntent => {
  let hasAddSignal = false;
  let hasDeleteSignal = false;
  let hasLockSignal = false;
  let hasImportExportSignal = false;
  const textChunks: string[] = [];

  const walk = (node: React.ReactNode) => {
    if (node === null || node === undefined || typeof node === "boolean") return;

    if (typeof node === "string" || typeof node === "number") {
      textChunks.push(String(node));
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (React.isValidElement(node)) {
      const elementName = readElementName(node.type).toLowerCase();
      if (elementName.includes("plus")) hasAddSignal = true;
      if (elementName.includes("trash") || elementName.includes("delete") || elementName.includes("remove")) hasDeleteSignal = true;
      if (elementName.includes("lock")) hasLockSignal = true;
      if (elementName.includes("upload") || elementName.includes("download") || elementName.includes("import") || elementName.includes("export")) {
        hasImportExportSignal = true;
      }
      walk((node.props as { children?: React.ReactNode }).children);
    }
  };

  walk(children);

  const normalizedText = textChunks.join(" ").toLowerCase();
  if (ADD_KEYWORDS.some((keyword) => normalizedText.includes(keyword))) hasAddSignal = true;
  if (DELETE_KEYWORDS.some((keyword) => normalizedText.includes(keyword))) hasDeleteSignal = true;
  if (LOCK_KEYWORDS.some((keyword) => normalizedText.includes(keyword))) hasLockSignal = true;
  if (IMPORT_EXPORT_KEYWORDS.some((keyword) => normalizedText.includes(keyword))) hasImportExportSignal = true;

  if (hasImportExportSignal) return "importExport";
  if (hasDeleteSignal) return "delete";
  if (hasLockSignal) return "lock";
  if (hasAddSignal) return "add";
  return null;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const intent = detectButtonIntent(children);
    const resolvedVariant = intent === "delete" ? "destructive" : intent === "lock" ? "outline" : intent === "add" ? "default" : variant;
    const intentClassName =
      intent === "add"
        ? "bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-100 transition-all"
        : intent === "lock"
        ? "border border-warning/60 bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning font-medium"
        : intent === "importExport"
        ? "justify-center whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-9 flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
        : intent === "delete"
        ? "border border-destructive/80 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive font-medium"
        : "";

    return (
      <Comp
        className={cn(buttonVariants({ variant: resolvedVariant, size }), intentClassName, className)}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };