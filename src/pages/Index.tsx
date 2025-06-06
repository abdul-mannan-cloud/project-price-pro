import { Button } from "@/components/ui/3d-button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { TextRotate } from "@/components/ui/text-rotate";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import {useEffect, useState} from "react";
import {supabase} from "../integrations/supabase/client";

const DEFAULT_CONTRACTOR_ID = "82499c2f-960f-4042-b277-f86ea2d99929";

const constructionImages = [
  {
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e",
    title: "Electrician Working",
  },
  {
    url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1",
    title: "Plumbing Service",
  },
  {
    url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
    title: "Professional Handyman",
  },
  {
    url: "https://images.unsplash.com/photo-1534237710431-e2fc698436d0",
    title: "Home Renovation",
  },
  {
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f",
    title: "Floor Installation",
  },
  {
    url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
    title: "Construction Site",
  },
  {
    url: "https://images.unsplash.com/photo-1590725121839-892b458a74fe",
    title: "Interior Renovation",
  },
];

const rotatingTexts = [
  "Remodel my kitchen",
  "Paint my home",
  "Repair my drywall",
  "Trim my hedges",
   "Replace my door",
];

const Index = () => {
  const navigate = useNavigate();
  const [contractorId, setContractorId] = useState<string>(DEFAULT_CONTRACTOR_ID);

  const getContactorId = async () => {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return null;


    const {data: contractor} = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!contractor) return null;
    setContractorId(contractor.id);
  }

  useEffect(() => {
    getContactorId()
  }, []);


  useEffect(() => {
    const currentHost = window.location.hostname;
    if (currentHost === 'reliablepro.ai') {
      navigate('/estimate/dabe7335-5617-4cad-8842-8de7a157704e', { replace: true });
    }
  }, [navigate]);

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
              Estimate just about anything...
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
              Snap up a reliably fast project quote and stay right on budget.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-4"
            >
              <Button
                onClick={() => navigate(`/estimate/${contractorId}`)}
                size="lg"
                variant="default"
                className="text-lg px-8 py-6 bg-primary-600 hover:bg-secondary text-secondary hover:text-primary border-secondary"
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
              ${index === 0 ? "top-[5%] left-[5%]" : ""} // Top left
              ${index === 1 ? "top-[5%] right-[5%]" : ""} // Top right
              ${index === 2 ? "bottom-[5%] right-[5%]" : ""} // Bottom right
              ${index === 3 ? "bottom-[5%] left-[5%]" : ""} // Bottom left
              ${index === 4 ? "bottom-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2" : ""} // Center
              ${index === 5 ? "top-[50%] left-[5%] transform -translate-y-1/2" : ""} // Middle left
              ${index === 6 ? "top-[50%] right-[5%] transform -translate-y-1/2" : ""} // Middle right
            `}
          >
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              src={image.url}
              alt={image.title}
              className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl shadow-lg hover:scale-110 hover:opacity-100 duration-300 cursor-pointer transition-all border-4 border-white/10"
            />
          </FloatingElement>
        ))}
      </Floating>

      <Footerdemo />
    </div>
  );
};

export default Index;
