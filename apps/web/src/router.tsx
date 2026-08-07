import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignPage from "./pages/CampaignPage";
import CharactersPage from "./pages/CharactersPage";
import CharacterSheetPage from "./pages/CharacterSheetPage";
import { useAuth } from "./lib/auth";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/app/campaigns" replace />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: AppLayout,
});

const campaignsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "campaigns",
  component: CampaignsPage,
});

const campaignRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "campaigns/$id",
  component: CampaignPage,
});

const charactersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "characters",
  component: CharactersPage,
});

const characterSheetRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "characters/$id",
  component: CharacterSheetPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  appRoute.addChildren([campaignsRoute, campaignRoute, charactersRoute, characterSheetRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function useAuthGuard() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return null;
}
