import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// Carousel slides data
const slides = [
    {
        image: "/carousel-1.png",
        title: "PDF Editing Made Easy",
        description: "Edit text, images, and more with precision"
    },
    {
        image: "/carousel-2.png",
        title: "Secure Sign-in",
        description: "Your documents, always protected"
    },
    {
        image: "/carousel-3.png",
        title: "AI-Powered Editing",
        description: "Smart tools that understand your documents"
    }
];

const LoginPage = () => {
    const { user, loading, signInAnonymously } = useAuth();
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-rotate carousel
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-6 lg:p-8 overflow-hidden">
            {/* Centered White Card with Glass Effect - constrained to viewport */}
            <div className="w-full max-w-5xl max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] glass-premium rounded-2xl md:rounded-3xl shadow-layer-lg overflow-hidden flex flex-col md:flex-row animate-scale-in">

                {/* Left Section - Animated Carousel */}
                <div className="w-full md:w-1/2 bg-white/50 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Slides */}
                    <div className="relative w-full">
                        {slides.map((slide, index) => (
                            <div
                                key={index}
                                className={`transition-all duration-700 ease-in-out ${index === currentSlide
                                    ? 'opacity-100 relative'
                                    : 'opacity-0 absolute inset-0 pointer-events-none'
                                    }`}
                            >
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-auto object-contain max-h-[240px] md:max-h-[336px] mx-auto"
                                />
                                <div className="text-center mt-4">
                                    <h2 className="text-base md:text-lg font-semibold text-foreground">
                                        {slide.title}
                                    </h2>
                                    <p className="text-muted-foreground text-xs md:text-sm mt-1">
                                        {slide.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dot Indicators */}
                    <div className="flex gap-2 mt-3">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${index === currentSlide
                                    ? 'w-5 bg-primary'
                                    : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Section - Auth Form */}
                <div className="w-full md:w-1/2 p-4 md:p-5 lg:p-6 flex flex-col justify-center bg-white/80 border-l border-border/30">
                    <div className="w-full max-w-sm mx-auto space-y-3">
                        {/* Logo */}
                        <img
                            src="/logo-full.png"
                            alt="Lamina"
                            className="h-10 md:h-12 w-auto object-contain"
                        />

                        {/* Header */}
                        <div className="space-y-0.5">
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Welcome Back</h2>
                            <p className="text-muted-foreground text-xs md:text-sm">Sign in to access your workspace</p>
                        </div>

                        {/* Auth Form */}
                        <div>
                            <Auth
                                supabaseClient={supabase}
                                appearance={{
                                    theme: ThemeSupa,
                                    variables: {
                                        default: {
                                            colors: {
                                                brand: 'hsl(225, 70%, 65%)',
                                                brandAccent: 'hsl(225, 70%, 55%)',
                                                inputBackground: 'hsl(210, 20%, 99%)',
                                                inputText: 'hsl(222, 47%, 15%)',
                                                inputBorder: 'hsl(220, 13%, 91%)',
                                                inputBorderHover: 'hsl(225, 70%, 65%)',
                                                inputBorderFocus: 'hsl(225, 70%, 65%)',
                                            },
                                            fonts: {
                                                bodyFontFamily: 'Plus Jakarta Sans, sans-serif',
                                                buttonFontFamily: 'Plus Jakarta Sans, sans-serif',
                                                inputFontFamily: 'Plus Jakarta Sans, sans-serif',
                                                labelFontFamily: 'Plus Jakarta Sans, sans-serif',
                                            },
                                            radii: {
                                                borderRadiusButton: '0.75rem',
                                                buttonBorderRadius: '0.75rem',
                                                inputBorderRadius: '0.75rem',
                                            },
                                            space: {
                                                inputPadding: '12px 14px',
                                                buttonPadding: '12px 16px',
                                            },
                                            fontSizes: {
                                                baseButtonSize: '14px',
                                                baseInputSize: '14px',
                                                baseLabelSize: '13px',
                                            },
                                        },
                                    },
                                    className: {
                                        container: 'w-full',
                                        button: 'w-full font-medium shadow-sm hover:shadow-md transition-shadow',
                                        input: 'w-full border-2 focus:border-primary',
                                        label: 'font-medium mb-1.5 block text-foreground',
                                        loader: 'text-primary',
                                        anchor: 'text-primary hover:underline text-sm',
                                    },
                                }}
                                providers={["google"]}
                                redirectTo={window.location.origin}
                                onlyThirdPartyProviders={false}
                                view="sign_in"
                                showLinks={true}
                            />
                        </div>

                        {/* Divider */}
                        <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-xs text-muted-foreground">
                                    or
                                </span>
                            </div>
                        </div>

                        {/* Guest Mode */}
                        <Button
                            variant="outline"
                            className="w-full h-11 rounded-xl font-medium border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                            onClick={async () => {
                                try {
                                    await signInAnonymously();
                                    toast.success("Welcome! You're in guest mode.");
                                } catch (e: any) {
                                    console.error("Anonymous login error:", e);
                                    toast.error("Guest mode failed", {
                                        description: e.message || "An unexpected error occurred."
                                    });
                                }
                            }}
                        >
                            <User className="h-4 w-4 mr-2" />
                            Continue as Guest
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            No account needed. Your work won't be saved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
