import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, UserPlus, Moon, Sun, Monitor, ShoppingBag, Plus, Grid3X3, User, LogOut, Menu, X, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function NavigationHeader() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      default:
        return Monitor;
    }
  };

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const ThemeIcon = getThemeIcon();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <NavLink
              to="/"
              className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              ServiceSwap
            </NavLink>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              // Authenticated Navigation
              <>
                <NavLink
                  to="/browse"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  <ShoppingBag className="h-4 w-4" />
                  Browse Services
                </NavLink>

                <NavLink
                  to="/categories"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  <Grid3X3 className="h-4 w-4" />
                  Categories
                </NavLink>

                <NavLink
                  to="/list-service"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  <Plus className="h-4 w-4" />
                  List Service
                </NavLink>

                <NavLink
                  to="/trades"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Trade Center
                </NavLink>

                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  <User className="h-4 w-4" />
                  Dashboard
                </NavLink>
              </>
            ) : (
              // Public Navigation
              <>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  About
                </NavLink>

                <NavLink
                  to="/features"
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  Features
                </NavLink>

                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                >
                  Contact
                </NavLink>
              </>
            )}

            {isAuthenticated ? (
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )
                }
              >
                <UserPlus className="h-4 w-4" />
                Login
              </NavLink>
            )}
          </div>

          {/* Mobile Navigation & Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 h-9 w-9">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      <NavLink
                        to="/"
                        onClick={closeMobileMenu}
                        className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                      >
                        ServiceSwap
                      </NavLink>
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex flex-col space-y-4 mt-8">
                    <NavLink
                      to="/"
                      end
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )
                      }
                    >
                      <Search className="h-4 w-4" />
                      Home
                    </NavLink>

                    {isAuthenticated ? (
                      // Authenticated Mobile Navigation
                      <>
                        <NavLink
                          to="/browse"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Browse Services
                        </NavLink>

                        <NavLink
                          to="/categories"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          <Grid3X3 className="h-4 w-4" />
                          Categories
                        </NavLink>

                        <NavLink
                          to="/list-service"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          <Plus className="h-4 w-4" />
                          List Service
                        </NavLink>

                        <NavLink
                          to="/trades"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          Trade Center
                        </NavLink>

                        <NavLink
                          to="/dashboard"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          <User className="h-4 w-4" />
                          Dashboard
                        </NavLink>

                        <div className="border-t pt-4 mt-4">
                          <p className="text-sm text-muted-foreground mb-2 px-3">Signed in as</p>
                          <p className="text-sm font-medium mb-4 px-3">{user?.email}</p>
                          <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2"
                          >
                            <LogOut className="h-4 w-4" />
                            Logout
                          </Button>
                        </div>
                      </>
                    ) : (
                      // Public Mobile Navigation
                      <>
                        <NavLink
                          to="/about"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          About
                        </NavLink>

                        <NavLink
                          to="/features"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          Features
                        </NavLink>

                        <NavLink
                          to="/contact"
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )
                          }
                        >
                          Contact
                        </NavLink>

                        <div className="border-t pt-4 mt-4">
                          <NavLink
                            to="/login"
                            onClick={closeMobileMenu}
                            className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
                          >
                            <UserPlus className="h-4 w-4" />
                            Login
                          </NavLink>
                        </div>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={cycleTheme}
              className="p-2 h-9 w-9"
              title={`Switch to ${theme === "light" ? "dark" : theme === "dark" ? "auto" : "light"} mode`}
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}