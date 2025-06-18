interface ContactFormHeaderProps {
  title?: string;
  description?: string;
}

export const ContactFormHeader = ({
  title = "Almost There!",
  description = "Enter your contact details below to view your personalized project estimate. We've analyzed your requirements and prepared a detailed breakdown just for you.",
}: ContactFormHeaderProps) => {
  return (
    <div className="text-center mb-8 pt-4">
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};
