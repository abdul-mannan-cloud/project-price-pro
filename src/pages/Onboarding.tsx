
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

const DEFAULT_COLORS = {
  primary: "#6366F1",
  secondary: "#4F46E5"
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
    logoUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First get the current user's ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Generate a new UUID for the contractor record
      const contractorId = crypto.randomUUID();

      // Create the contractor record with both IDs
      const { error: insertError } = await supabase
        .from('contractors')
        .insert({
          id: contractorId, // The contractor's unique ID
          user_id: user.id, // Link to auth.users
          business_name: formData.businessName,
          contact_email: formData.email,
          contact_phone: formData.phone,
          business_logo_url: formData.logoUrl,
          branding_colors: DEFAULT_COLORS
        });

      if (insertError) {
        throw insertError;
      }

      // Update auth user metadata with contractor info
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          contractor_id: contractorId,
          business_name: formData.businessName
        }
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Welcome aboard!",
        description: "Your account has been set up successfully.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        logoUrl: publicUrl
      }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-semibold mb-6">Welcome to Lovable</h1>
        <p className="text-muted-foreground mb-8">Let's set up your business profile</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="businessName">
              Business Name
            </label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
              required
              placeholder="Your business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="email">
              Business Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              placeholder="contact@yourbusiness.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="phone">
              Business Phone
            </label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Business Logo
            </label>
            <FileUpload
              accept="image/*"
              onChange={handleFileUpload}
              maxSize={5 * 1024 * 1024} // 5MB
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
