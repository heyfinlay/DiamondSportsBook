import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { SessionProvider } from "@lib/auth/SessionProvider";

const App = () => {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
};

export default App;
