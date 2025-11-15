import { jsx as _jsx } from "react/jsx-runtime";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { SessionProvider } from "@lib/auth/SessionProvider";
const App = () => {
    return (_jsx(SessionProvider, { children: _jsx(RouterProvider, { router: router }) }));
};
export default App;
