import { Search, UserPlus, Moon, Sun, Monitor } from "lucide-react"
import { NavLink } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

const items = [
  {
    title: "Browse",
    url: "/",
    icon: Search,
  },
  {
    title: "Sign Up",
    url: "/signup",
    icon: UserPlus,
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const { theme, setTheme } = useTheme()
  const collapsed = state === "collapsed"

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return Sun
      case "dark":
        return Moon
      default:
        return Monitor
    }
  }

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"]
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const ThemeIcon = getThemeIcon()

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={cycleTheme}
                className="w-full justify-start h-8 px-2"
              >
                <ThemeIcon className="mr-2 h-4 w-4" />
                {!collapsed && (
                  <span className="capitalize">
                    {theme === "system" ? "Auto" : theme}
                  </span>
                )}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}