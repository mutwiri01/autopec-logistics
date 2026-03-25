import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import CustomerForm from "./pages/CustomerForm";
import MechanicDashboard from "./pages/MechanicDashboard";
import StatusTracker from "./pages/StatusTracker";
import "./styles/theme.css";

// Renders StatusTracker when ?track= is present, otherwise CustomerForm
const HomeRoute = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (params.get("track")) {
    return <StatusTracker />;
  }
  return <CustomerForm />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/dashboard" element={<MechanicDashboard />} />
          <Route path="/track" element={<StatusTracker />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
