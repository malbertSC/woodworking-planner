import { Route, Routes } from "react-router";
import RootLayout from "./layouts/RootLayout";
import Home from "./pages/Home";
import ChestOfDrawersPlanner from "./pages/ChestOfDrawersPlanner";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="chest-of-drawers" element={<ChestOfDrawersPlanner />} />
      </Route>
    </Routes>
  );
}
