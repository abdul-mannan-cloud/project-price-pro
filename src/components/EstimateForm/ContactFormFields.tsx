
import { Input } from "@/components/ui/input";

interface ContactFormFieldsProps {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  onChange: (field: string, value: string) => void;
}

export const ContactFormFields = ({ formData, onChange }: ContactFormFieldsProps) => {
  return (
    <div className="space-y-5">
      <div className="form-group relative">
        <Input
          placeholder="Full Name"
          value={formData.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
          required
          className="h-12 px-4 pt-2"
        />
        <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
          Full Name
        </label>
      </div>
      
      <div className="form-group relative">
        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          required
          className="h-12 px-4 pt-2"
        />
        <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
          Email
        </label>
      </div>
      
      <div className="form-group relative">
        <Input
          type="tel"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          required
          className="h-12 px-4 pt-2"
        />
        <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
          Phone Number
        </label>
      </div>
      
      <div className="form-group relative">
        <Input
          placeholder="Project Address"
          value={formData.address}
          onChange={(e) => onChange('address', e.target.value)}
          required
          className="h-12 px-4 pt-2"
        />
        <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
          Project Address
        </label>
      </div>
    </div>
  );
};
