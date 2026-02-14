import { Route, Routes } from "react-router";
import RootLayout from "./layouts/RootLayout";
import Home from "./pages/Home";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
      </Route>
    </Routes>
  );
}
