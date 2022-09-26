import React, { createContext, useState, useContext } from "react";
export const StyleContext = createContext({});
export function StyleContextProvider({ children }) {
  const [pageType, setPageType] = useState("Controls")
  return (
    <StyleContext.Provider
      style={{
        height: window.innerHeight
      }}
      value={{
        pageType,
        setPageType,

      }}>
      {children}
    </StyleContext.Provider>
  )
}

export const useStyleContext = () => {
  const context = useContext(StyleContext);
  if (context === undefined) {
    throw new Error(
      "useStyleContext must be used within a StyleContextProvider"
    );
  }
  return context;
};