import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnalyticsRouteTracker } from "@/components/analytics/AnalyticsRouteTracker";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ConsentProvider } from "@/contexts/ConsentContext";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import Index from "./pages/Index";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import { NiranStorytimeRoute } from "./components/niran/NiranStorytimeRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ConsentProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AnalyticsRouteTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/books" element={<Books />} />
            <Route path="/books/:slug" element={<BookDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/niran-storytime-kit" element={<NiranStorytimeRoute />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConsentBanner />
        </BrowserRouter>
        </TooltipProvider>
      </ConsentProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
