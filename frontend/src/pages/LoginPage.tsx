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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-8 md:p-12 lg:p-16">
            {/* Centered White Card */}
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">

                {/* Left Section - Animated Carousel */}
                <div className="w-full md:w-[55%] bg-white p-8 md:p-12 lg:p-16 flex flex-col items-center justify-center relative">
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
                                    className="w-full h-auto object-contain max-h-[528px]"
                                />
                                <div className="text-center mt-8">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {slide.title}
                                    </h2>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        {slide.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dot Indicators */}
                    <div className="flex gap-2 mt-6">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                    ? 'w-6 bg-primary'
                                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Section - Auth Form */}
                <div className="w-full md:w-[45%] p-8 md:p-12 flex flex-col justify-center border-l border-border/50">
                    <div className="w-full max-w-sm mx-auto space-y-6">
                        {/* Logo */}
                        <img
                            src="/logo-full.png"
                            alt="Lamina"
                            className="h-[70px] w-auto object-contain mb-2"
                        />

                        {/* Header */}
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
                            <p className="text-muted-foreground">Sign in to access your workspace</p>
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
                                                borderRadiusButton: '0.5rem',
                                                buttonBorderRadius: '0.5rem',
                                                inputBorderRadius: '0.5rem',
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
                                        button: 'w-full font-medium',
                                        input: 'w-full',
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
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
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
                            className="w-full h-11 rounded-lg font-medium"
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
