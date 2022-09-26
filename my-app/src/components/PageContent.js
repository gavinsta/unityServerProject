import { useStyleContext } from "../contexts/StyleContext";
import { ControlsDisplay } from "./ControlsDisplay";
import { LogDisplay } from "./LogDisplay";
export function PageContent() {
  const { pageType } = useStyleContext();

  function renderContent() {
    switch (pageType) {
      case "Controls":
        return <ControlsDisplay />
      case "Log":
        return <LogDisplay />
    }
  }

  return (
    <>
      {renderContent()}
    </>
  )
}