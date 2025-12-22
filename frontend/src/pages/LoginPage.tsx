import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Sparkles, CheckCircle2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
    const { user, loading, signInAnonymously } = useAuth();

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

    interface FeatureItemProps {
        icon: React.ElementType;
        title: string;
        description: string;
    }

    const FeatureItem = ({ icon: Icon, title, description }: FeatureItemProps) => (
        <div className="flex gap-4 p-4 rounded-xl bg-white/50 border border-white/20 hover:bg-white/80 transition-colors">
            <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans">
            {/* Left Side - Info & Branding */}
            <div className="w-full md:w-1/2 lg:w-3/5 bg-gradient-to-br from-pastel-blue/20 via-pastel-purple/20 to-pastel-pink/20 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                            <FileText className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight">UniPDF Studio</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                            Transform your PDFs with <span className="text-primary">AI Power</span>
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Edit, sign, summarize, and chat with your documents. Experience the future of PDF management today.
                        </p>
                    </div>

                    <div className="grid gap-4 mt-12 max-w-lg">
                        <FeatureItem
                            icon={Zap}
                            title="Smart Editing"
                            description="Edit text and images directly in your browser with pixel-perfect precision."
                        />
                        <FeatureItem
                            icon={Sparkles}
                            title="AI Assistant"
                            description="Summarize long documents and get answers to your questions instantly."
                        />
                        <FeatureItem
                            icon={Shield}
                            title="Secure & Private"
                            description="Enterprise-grade security keeps your sensitive documents safe."
                        />
                    </div>
                </div>

                <div className="relative z-10 mt-12 text-sm text-muted-foreground">
                    © 2024 UniPDF Studio. All rights reserved.
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-8 bg-card shadow-soft relative z-20">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
                        <p className="text-muted-foreground">Sign in to access your workspace</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50">
                        <Auth
                            supabaseClient={supabase}
                            appearance={{
                                theme: ThemeSupa,
                                variables: {
                                    default: {
                                        colors: {
                                            brand: 'hsl(var(--primary))',
                                            brandAccent: 'hsl(var(--primary-hover))',
                                            inputBackground: 'white',
                                            inputText: 'hsl(var(--foreground))',
                                            inputBorder: 'hsl(var(--input))',
                                            inputBorderHover: 'hsl(var(--ring))',
                                            inputBorderFocus: 'hsl(var(--ring))',
                                        },
                                        radii: {
                                            borderRadiusButton: '0.75rem',
                                            buttonBorderRadius: '0.75rem',
                                            inputBorderRadius: '0.75rem',
                                        },
                                    },
                                },
                                className: {
                                    container: 'w-full',
                                    button: 'w-full px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-sm',
                                    input: 'w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent transition-all',
                                    label: 'text-sm font-medium text-foreground mb-1 block',
                                    loader: 'text-primary',
                                    anchor: 'text-primary hover:text-primary/80 transition-colors',
                                },
                            }}
                            providers={["google"]}
                            redirectTo={window.location.origin}
                            onlyThirdPartyProviders={false}
                            view="sign_in"
                            showLinks={true}
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Optional
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full h-10 rounded-lg hover:bg-muted font-normal text-sm text-muted-foreground hover:text-foreground transition-all"
                        onClick={async () => {
                            try {
                                await signInAnonymously();
                                toast.success("Welcome Guest!");
                            } catch (e: any) {
                                console.error("Anonymous login error:", e);
                                toast.error("Guest mode failed", {
                                    description: e.message || "An unexpected error occurred."
                                });
                            }
                        }}
                    >
                        Continue without sign in
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
