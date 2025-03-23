import { Link } from "@remix-run/react";
import useScreenType from "../../App/hooks/useScreenType";
import AuthButtons from "../../App/components/AuthButtons";
import PCComponent from "./PCComponent";
import TabletComponent from "./TabletComponent";
import SmartphoneComponent from "./SmartphoneComponent";
import OtherMediaComponent from "./OtherMediaComponent";

const ResponsivePage = () => {
  const screenType = useScreenType();

  const renderComponent = () => {
    switch (screenType) {
      case "pc":
        return <PCComponent />;
      case "tablet":
        return <TabletComponent />;
      case "smartphone":
        return <SmartphoneComponent />;
      default:
        return <OtherMediaComponent />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Responsive Page</h1>
      <AuthButtons />
      <p className="text-center mb-6">
        This is a responsive page designed to work on PC, tablet, smartphone, and other media.
      </p>
      <div className="w-full max-w-6xl">{renderComponent()}</div>
      <Link to="/" className="mt-6 text-blue-500 hover:underline">
        Go back to Home
      </Link>
    </div>
  );
};

export default ResponsivePage;