import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";

const constructionImages = [
  {
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
    title: "Modern Construction",
  },
  {
    url: "https://images.unsplash.com/photo-1590644365607-1c5a519a54e2",
    title: "Home Renovation",
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
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="index-page min-h-screen bg-[#F1F1F1] relative overflow-hidden">
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6 text-black animate-fadeIn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              AI Construction Estimate Lead Generation
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl mb-8 text-gray-600 animate-fadeIn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Get instant, AI-powered cost estimates for your renovation projects
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Button
                onClick={() => navigate("/estimate")}
                size="lg"
                className="bg-primary text-white hover:bg-primary-600 transition-all duration-300 animate-fadeIn transform hover:scale-105"
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
              ${index === 0 ? "top-[8%] left-[11%]" : ""}
              ${index === 1 ? "top-[10%] left-[32%]" : ""}
              ${index === 2 ? "top-[2%] left-[53%]" : ""}
              ${index === 3 ? "top-[0%] left-[83%]" : ""}
              ${index === 4 ? "top-[40%] left-[2%]" : ""}
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
          variant="ghost"
          className="text-gray-800 hover:text-gray-600 hover:bg-gray-200/50 transition-all duration-300"
        >
          Sign In
        </Button>
      </div>
    </div>
  );
};

export default Index;