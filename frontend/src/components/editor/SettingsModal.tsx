import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, Settings, Bell, Shield, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SettingsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: string;
}

export const SettingsModal = ({ isOpen, onOpenChange, defaultTab = "profile" }: SettingsModalProps) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(defaultTab);

    const getUserInitials = () => {
        if (!user?.email) return 'U';
        return user.email.charAt(0).toUpperCase();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 rounded-2xl sm:rounded-2xl">
                <div className="flex h-[500px]">
                    {/* Sidebar */}
                    <div className="w-48 bg-muted/30 border-r p-4 space-y-2">
                        <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
                        <TabsList className="flex flex-col h-auto bg-transparent space-y-1 w-full p-0">
                            <TabsTrigger
                                value="profile"
                                onClick={() => setActiveTab("profile")}
                                className={`w-full justify-start px-2 py-1.5 h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm ${activeTab === 'profile' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <User className="w-4 h-4 mr-2" />
                                Profile
                            </TabsTrigger>
                            <TabsTrigger
                                value="appearance"
                                onClick={() => setActiveTab("appearance")}
                                className={`w-full justify-start px-2 py-1.5 h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm ${activeTab === 'appearance' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Palette className="w-4 h-4 mr-2" />
                                Appearance
                            </TabsTrigger>
                            <TabsTrigger
                                value="notifications"
                                onClick={() => setActiveTab("notifications")}
                                className={`w-full justify-start px-2 py-1.5 h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm ${activeTab === 'notifications' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Bell className="w-4 h-4 mr-2" />
                                Notifications
                            </TabsTrigger>
                            <TabsTrigger
                                value="security"
                                onClick={() => setActiveTab("security")}
                                className={`w-full justify-start px-2 py-1.5 h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm ${activeTab === 'security' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Security
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white">
                        <Tabs value={activeTab} className="w-full space-y-6">

                            <TabsContent value="profile" className="space-y-6 mt-0">
                                <div>
                                    <h3 className="text-lg font-medium">Profile Information</h3>
                                    <p className="text-sm text-muted-foreground">Manage your public profile details.</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{getUserInitials()}</AvatarFallback>
                                    </Avatar>
                                    <Button variant="outline" size="sm">Change Avatar</Button>
                                </div>

                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Display Name</Label>
                                        <Input id="name" defaultValue={user?.user_metadata?.full_name || 'User'} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" defaultValue={user?.email} disabled />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="bio">Bio</Label>
                                        <Input id="bio" placeholder="Tell us about yourself" />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button>Save Changes</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="appearance" className="space-y-6 mt-0">
                                <div>
                                    <h3 className="text-lg font-medium">Appearance</h3>
                                    <p className="text-sm text-muted-foreground">Customize how the editor looks.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Dark Mode</Label>
                                            <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                                        </div>
                                        <Switch />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Compact Toolbar</Label>
                                            <p className="text-xs text-muted-foreground">Reduce the size of toolbar items</p>
                                        </div>
                                        <Switch />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Other tabs can be placeholders for now */}
                            <TabsContent value="notifications" className="mt-0">
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                                    <Bell className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Notification settings coming soon.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="mt-0">
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                                    <Shield className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Security settings managed by authentication provider.</p>
                                </div>
                            </TabsContent>

                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
