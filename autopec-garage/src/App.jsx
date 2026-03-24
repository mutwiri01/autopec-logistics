import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import CustomerForm from "./pages/CustomerForm";
import MechanicDashboard from "./pages/MechanicDashboard";
import StatusTracker from "./pages/StatusTracker";
import "./styles/theme.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<CustomerForm />} />
          <Route path="/dashboard" element={<MechanicDashboard />} />
          <Route path="/track" element={<StatusTracker />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
