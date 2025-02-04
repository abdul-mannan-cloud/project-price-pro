import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { TextRotate } from "@/components/ui/text-rotate";
import { Header1 } from "@/components/ui/header";

const constructionImages = [
  {
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
    title: "Modern Construction",
  },
  {
    url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
    title: "Architecture Design",
  },
  {
    url: "https://images.unsplash.com/photo-1621274147744-cfb5694bb233",
    title: "Interior Work",
  },
  {
    url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece",
    title: "Home Improvement",
  },
  {
    url: "https://images.unsplash.com/photo-1504615755583-2916b52192a3",
    title: "Custom Building",
  },
  {
    url: "https://images.unsplash.com/photo-1541976590-713941681591",
    title: "Professional Tools",
  },
  {
    url: "https://images.unsplash.com/photo-1582653291997-079a1c04e5a1",
    title: "Quality Work",
  },
  {
    url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
    title: "Construction Site",
  },
];

const rotatingTexts = [
  "Lead Generation",
  "AI Estimates",
  "Customer Retention",
  "Project Planning",
  "Cost Analysis",
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="index-page min-h-screen bg-[#F1F1F1] relative overflow-hidden font-['Open Sans']">
      <Header1 />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <div className="text-center space-y-8 sm:space-y-10 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg sm:p-12">
            <motion.h1 
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-black leading-tight animate-fadeIn text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Transform Your Construction Business...
            </motion.h1>
            <div className="flex justify-center">
              <TextRotate
                texts={rotatingTexts}
                mainClassName="text-primary-600 text-2xl sm:text-3xl md:text-4xl font-bold"
                rotationInterval={3000}
                staggerDuration={0.02}
              />
            </div>
            <motion.p
              className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4 leading-relaxed animate-fadeIn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Revolutionize your project estimations with powerful AI technology. Generate precise leads, streamline your workflow, and close projects with unprecedented accuracy and efficiency.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-4"
            >
              <Button
                onClick={() => navigate("/estimate")}
                size="lg"
                variant="default"
                className="text-lg px-8 py-6"
              >
                Start Your Estimate
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <Floating sensitivity={-1} className="overflow-hidden">
        {constructionImages.map((image, index) => (
          <FloatingElement
            key={index}
            depth={(index % 3) + 1}
            className={`
              ${index === 0 ? "top-[15%] left-[11%]" : ""}
              ${index === 1 ? "top-[18%] left-[32%]" : ""}
              ${index === 2 ? "top-[12%] left-[53%]" : ""}
              ${index === 3 ? "top-[10%] left-[83%]" : ""}
              ${index === 4 ? "top-[45%] left-[2%]" : ""}
              ${index === 5 ? "top-[70%] left-[77%]" : ""}
              ${index === 6 ? "top-[73%] left-[15%]" : ""}
              ${index === 7 ? "top-[80%] left-[50%]" : ""}
            `}
          >
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              src={image.url}
              alt={image.title}
              className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-2xl shadow-lg hover:scale-110 hover:opacity-100 duration-300 cursor-pointer transition-all border-4 border-white/10"
            />
          </FloatingElement>
        ))}
      </Floating>

      <div className="fixed top-4 right-4 z-20">
        <Button
          onClick={() => navigate("/login")}
          variant="outline"
          className="text-gray-800 hover:text-gray-600"
        >
          Sign In
        </Button>
      </div>
    </div>
  );
};

export default Index;