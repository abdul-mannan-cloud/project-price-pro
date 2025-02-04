import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    id: "1",
    title: "How does the estimator work?",
    content: "Our estimator uses AI to analyze project requirements and generate accurate cost estimates. It considers factors like materials, labor, location, and market rates to provide detailed breakdowns.",
  },
  {
    id: "2",
    title: "What are webhooks and how do I use them?",
    content: "Webhooks allow you to receive real-time notifications when new leads are generated. You can integrate these with your CRM or other tools by adding your webhook URL in the settings.",
  },
  {
    id: "3",
    title: "How accurate are the AI-generated estimates?",
    content: "Our AI estimates are typically within 10-15% of actual costs. The accuracy improves over time as the system learns from your feedback and project data.",
  },
  {
    id: "4",
    title: "Can I customize the estimation process?",
    content: "Yes, you can customize AI preferences, markup percentages, and minimum project costs in your settings to align with your business model.",
  },
];

export const FAQ = () => {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {faqItems.map((item) => (
        <AccordionItem
          value={item.id}
          key={item.id}
          className="rounded-lg border bg-background px-4 py-1"
        >
          <AccordionTrigger className="justify-start gap-3 py-2 text-[15px] leading-6 hover:no-underline [&>svg]:-order-1">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="pb-2 ps-7 text-muted-foreground">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};