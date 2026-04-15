import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FilterProvider } from "./contexts/FilterContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import Home from "./pages/Home";
import Planning from "./pages/Planning";
import Daily from "./pages/Daily";
import Review from "./pages/Review";
import Retrospective from "./pages/Retrospective";
import ResponsibleView from "./pages/ResponsibleView";
import Settings from "./pages/Settings";
import Analysis from "./pages/Analysis";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/planning" component={Planning} />
      <Route path="/daily" component={Daily} />
      <Route path="/review" component={Review} />
      <Route path="/retrospective" component={Retrospective} />
      <Route path="/responsible" component={ResponsibleView} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable={true}
      >
        <FilterProvider>
          <DashboardProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </DashboardProvider>
        </FilterProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
