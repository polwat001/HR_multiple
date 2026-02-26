"use client";
import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Building2, Building, GitBranch, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import error from "next/error";

const typeConfig: Record<string, { icon: any; color: string }> = {
  group: { icon: Building2, color: "text-primary" },
  company: { icon: Building, color: "text-accent" },
  branch: { icon: GitBranch, color: "text-warning" },
  department: { icon: FolderOpen, color: "text-info" },
};

interface OrgNode {
  id: string;
  NAME: string;
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
        <span className="text-sm font-medium">{node.NAME}</span>
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
  const [data, setData] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/organization/departments");
        const json = await res.json();
        setData(json);
      }catch(error){
        console.error("Failed to fetch org structure:", error);
      }finally{
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading organization structure... </div>
  if (!data) return <div className="p-6 text-center">No organization structure data available.</div>;
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Company Structure (Organization Tree)</CardTitle>
        </CardHeader>
        <CardContent>
          <TreeNode node={data} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationStructure;
