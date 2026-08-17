import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MapPinned, Route as RouteIcon, Brain, BarChart3,
  CloudSun, Siren, Sparkles, Building2, Cloud, Settings, Activity,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const primary = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Live Map", url: "/dashboard/map", icon: MapPinned },
  { title: "AI Route Planner", url: "/dashboard/route-planner", icon: RouteIcon },
  { title: "Prediction", url: "/dashboard/prediction", icon: Brain },
];
const analysis = [
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Weather", url: "/dashboard/weather", icon: CloudSun },
  { title: "Alerts", url: "/dashboard/alerts", icon: Siren },
  { title: "AI Insights", url: "/dashboard/ai-insights", icon: Sparkles },
];
const ops = [
  { title: "City Comparison", url: "/dashboard/city-comparison", icon: Building2 },
  { title: "Model Monitor", url: "/dashboard/model-monitor", icon: Cloud },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (u: string) => u === "/dashboard" ? pathname === u : pathname.startsWith(u);

  const renderGroup = (label: string, items: typeof primary) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent surface-glow">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-sm font-semibold">TrafficOps AI</div>
              <div className="text-[10px] text-muted-foreground">Predict • Navigate • Optimize</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operations", primary)}
        {renderGroup("Analysis", analysis)}
        {renderGroup("System", ops)}
      </SidebarContent>
    </Sidebar>
  );
}
