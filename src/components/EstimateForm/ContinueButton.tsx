
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Database } from "@/integrations/supabase/types";

type Contractor = Database['public']['Tables']['contractors']['Row'];

interface ContinueButtonProps {
  showButton: boolean;
  onNext?: () => void;
  hasFollowUpQuestion: boolean;
  contractor?: Contractor;
  isMobile: boolean;
}

export const ContinueButton = ({
  showButton,
  onNext,
  hasFollowUpQuestion,
  contractor,
  isMobile
}: ContinueButtonProps) => {
  if (!showButton || !onNext) return null;

  const primaryColor = typeof contractor?.branding_colors === 'object' && contractor?.branding_colors !== null
    ? (contractor.branding_colors as { primary?: string })?.primary
    : "#9b87f5";

  const buttonStyle = {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
    borderBottomColor: `${primaryColor}dd`,
    "--tw-border-opacity": "1",
    borderBottomWidth: "4px",
  } as React.CSSProperties;

  const button = (
    <Button 
      onClick={onNext}
      className="button button-primary w-full"
      style={buttonStyle}
      size="lg"
    >
      {hasFollowUpQuestion ? 'Continue' : 'Complete'}
    </Button>
  );

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
        <div className="container max-w-6xl mx-auto">
          {button}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block w-full mt-8">
      {button}
    </div>
  );
};
