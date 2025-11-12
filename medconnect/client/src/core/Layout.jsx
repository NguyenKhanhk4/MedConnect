import { Routes, Route } from "react-router-dom";
import { publicRoutes } from "../routes/publicRoutes";
import { privateRoutes } from "../routes/privateRoutes";
import ScrollToTop from "../components/ScrollToTop";

const Layout = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {publicRoutes}
        {privateRoutes}
      </Routes>
    </>
  );
};

export default Layout;
