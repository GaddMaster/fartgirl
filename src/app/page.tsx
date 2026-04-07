import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Tokenomics from "./components/Tokenomics";
import ImageGallery from "./components/ImageGallery";
import HowToBuy from "./components/HowToBuy";
import Community from "./components/Community";
import Footer from "./components/Footer";
import FartGirlGame from "@/app/components/FartGirlGame";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Tokenomics />
      <ImageGallery />
      <HowToBuy />
      <Community />
      <Footer />
    </>
  );
}
