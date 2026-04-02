import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Tokenomics from "./components/Tokenomics";
import ImageGallery from "./components/ImageGallery";
import HowToBuy from "./components/HowToBuy";
import Roadmap from "./components/Roadmap";
import Community from "./components/Community";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Tokenomics />
      <ImageGallery />
      <HowToBuy />
      <Roadmap />
      <Community />
      <Footer />
    </>
  );
}
