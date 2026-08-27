/** YOUTH ECHO UI — 세로형 모바일 게임 전용의 단일 화면 프로토타입 진입점. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Diagnostics from "./pages/Diagnostics";
import Home from "./pages/Home";
import OperatorConsole from "./pages/OperatorConsole";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/operator" component={OperatorConsole} />
            {/* 현장에서 카메라·GPS·나침반 작동을 확인하는 진단 화면. 게임 진행에 영향이 없다. */}
            <Route path="/diag" component={Diagnostics} />
            <Route component={Home} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
