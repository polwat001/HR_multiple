import { useState } from "react";
import { orgStructure } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Building2, Building, GitBranch, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: any; color: string }> = {
  group: { icon: Building2, color: "text-primary" },
  company: { icon: Building, color: "text-accent" },
  branch: { icon: GitBranch, color: "text-warning" },
  department: { icon: FolderOpen, color: "text-info" },
};

interface OrgNode {
  id: string;
  name: string;
  type: string;
  costCenter?: string;
  children: OrgNode[];
}

const TreeNode = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const config = typeConfig[node.type] || typeConfig.department;
  const Icon = config.icon;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors",
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
        <span className="text-sm font-medium">{node.name}</span>
        {node.costCenter && (
          <span className="text-xs text-muted-foreground ml-auto">{node.costCenter}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const OrganizationStructure = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Company Structure (Organization Tree)</CardTitle>
        </CardHeader>
        <CardContent>
          <TreeNode node={orgStructure as OrgNode} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationStructure;
