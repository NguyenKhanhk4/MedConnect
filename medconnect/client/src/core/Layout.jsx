import { Routes, Route } from "react-router-dom";
import { publicRoutes } from "../routes/publicRoutes";
import { privateRoutes } from "../routes/privateRoutes";
import ScrollToTop from "../components/ScrollToTop";
import { AiChatWidget } from "../components/AiChat/AiChatWidget";

const Layout = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {publicRoutes}
        {privateRoutes}
      </Routes>
      <AiChatWidget />
    </>
  );
};

export default Layout;
