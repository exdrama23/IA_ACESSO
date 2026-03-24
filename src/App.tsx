import { useState, useEffect } from "react";
import Home from "./pages/Home";
import { AdminConfig } from "./pages/AdminConfig";
import { Login } from "./pages/Login";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/admin" || path === "/config") {
    return <AdminConfig />;
  }

  return <Home />;
}

export default App;
