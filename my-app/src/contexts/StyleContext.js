import React, { createContext, useState, useContext } from "react";
export const StyleContext = createContext({});
export function StyleContextProvider({ children }) {
  const [pageType, setPageType] = useState("Controls")
  const [systemMessage, setSystemMessage] = useState(" ")
  return (
    <StyleContext.Provider
      style={{
        height: window.innerHeight
      }}
      value={{
        pageType,
        setPageType,
        systemMessage,
        setSystemMessage,
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